//! Login webview (context/15 Path A). Opens a visible Google sign-in window with a spoofed desktop
//! UA, watches for the redirect back to music.youtube.com, captures the resulting cookies, and
//! feeds them through the **same** sign-in path as cookie-paste (`AppState::sign_in`).
//!
//! Persistent (non-incognito) on purpose: the webview keeps its own Google session, so a later
//! re-login is one click with no password/paste — the real fix for KI-2 (cookie staleness), where
//! Google's short-lived `__Secure-*SIDTS` cookies rotate and a pasted cookie eventually stops
//! authenticating.

use std::sync::Arc;
use std::time::Duration;

use tauri::webview::cookie::Cookie;
#[cfg(not(target_os = "android"))]
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Emitter, Manager};
#[cfg(not(target_os = "android"))]
use tauri::{WebviewUrl, WebviewWindowBuilder};

use crate::state::{AppState, SignInOutcome};

#[cfg(not(target_os = "android"))]
const LOGIN_LABEL: &str = "login";

/// WebKitGTK is a WebKit engine, so a macOS Safari UA is the most internally-consistent spoof and
/// the least likely to trip Google's "this browser may not be secure" block. **Tune here** if
/// Google rejects it — this is the fragile part (context/15 Path A).
#[cfg(not(target_os = "android"))]
const LOGIN_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 \
                        (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15";

/// Google sign-in with `continue` back to YTM, so a successful login redirects to music.youtube.com
/// (our completion signal). AccountChooser (rather than ServiceLogin) makes Google show its account
/// picker when the webview already has sessions, so the user can explicitly choose which ID to sign
/// in as instead of Google auto-picking the default account. With no accounts stored it falls
/// through to the normal sign-in form, so first-time login is unchanged.
fn login_url(hint: Option<&str>) -> String {
    let mut url = "https://accounts.google.com/AccountChooser?service=youtube&continue=https://music.youtube.com/".to_string();
    if let Some(hint) = hint {
        // Preselect the account the user just picked from the native chooser, so it is the one
        // Google authenticates and the one whose YouTube session cookie we capture.
        url.push_str("&login_hint=");
        url.push_str(&urlencoding::encode(hint));
    }
    url
}

/// Open the login webview. Returns immediately; sign-in completes asynchronously (the UI learns via
/// the `auth-changed` event, or `login-error` on failure).
#[cfg(not(target_os = "android"))]
pub fn open_login(app: AppHandle, state: Arc<AppState>, hint: Option<&str>) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<()>();

    // When the webview lands on music.youtube.com, capture cookies + sign in. Runs off the
    // event-handler thread because reading the cookie store can deadlock when called synchronously
    // from inside a page-load callback.
    {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            while rx.recv().await.is_some() {
                // The redirect that lands us here sets the youtube cookies; they may appear a beat
                // after the page finishes, so poll briefly.
                for _ in 0..6 {
                    let cookie = read_login_cookies(&app).await;
                    if innertube::cookie_sapisid(&cookie).is_some() {
                        match state.sign_in(cookie).await {
                            Ok(SignInOutcome::Complete) => {
                                let _ = app.emit("login-done", ());
                            }
                            // The authenticated cookie is saved, but the account remains
                            // deliberately unfinished until the main-window picker selects a
                            // server-issued delegated identity.
                            Ok(SignInOutcome::SelectionRequired) => {}
                            Err(e) => {
                                let _ = app.emit("login-error", e);
                            }
                        }
                        close_login(&app);
                        return;
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                // Landed on music.youtube.com but not authenticated yet — keep watching.
            }
        });
    }

    // Window creation must happen on the main thread (GTK).
    let app2 = app.clone();
    let dispatched = app.run_on_main_thread(move || {
        // Reclaim the label if a prior login window is still around.
        if let Some(w) = app2.get_webview_window(LOGIN_LABEL) {
            let _ = w.destroy();
        }
        let Ok(url) = tauri::Url::parse(&login_url(hint)) else { return };
        let res = WebviewWindowBuilder::new(&app2, LOGIN_LABEL, WebviewUrl::External(url))
            .title("Sign in to YouTube Music")
            .inner_size(480.0, 720.0)
            .resizable(false)
            .center()
            .user_agent(LOGIN_UA)
            .on_page_load(move |_w, payload| {
                if matches!(payload.event(), PageLoadEvent::Finished)
                    && payload.url().host_str() == Some("music.youtube.com")
                {
                    let _ = tx.send(());
                }
            })
            .build();
        if let Err(e) = res {
            let _ = app2.emit("login-error", format!("Couldn't open the sign-in window: {e}"));
        }
    });
    if let Err(e) = dispatched {
        let _ = app.emit("login-error", format!("Couldn't open the sign-in window: {e}"));
    }
}

/// Mobile: Tauri cannot create a second webview window on Android, so the sign-in runs *through
/// the main window itself* — navigate it to Google, poll until it comes back to music.youtube.com
/// with fresh auth cookies, feed them through the same `sign_in` path as desktop, then hop back to
/// the app shell. The SPA unloads while we're away and reloads signed-in on return.
#[cfg(target_os = "android")]
pub fn open_login(app: AppHandle, state: Arc<AppState>, hint: Option<&str>) {
    let hint = hint.map(str::to_owned);
    // Home is the shell's own origin; capture it so the restore target matches whatever the app
    // was built with instead of hardcoding one.
    let return_url = app
        .get_webview_window("main")
        .and_then(|wv| wv.url().ok())
        .filter(|u| u.host_str() == Some("tauri.localhost"))
        .unwrap_or_else(|| {
            tauri::Url::parse("http://tauri.localhost/").expect("static URL parses")
        });

    let watcher_app = app.clone();
    tauri::async_runtime::spawn(async move {
        // Ten minutes: long enough for a slow 2FA dance, short enough that a forgotten login
        // screen can't strand the app in Google-land forever.
        let deadline = std::time::Instant::now() + Duration::from_secs(600);
        loop {
            tokio::time::sleep(Duration::from_millis(800)).await;
            let (on_ytm, cookies) = main_webview_state(&watcher_app).await;
            if on_ytm && innertube::cookie_sapisid(&cookies).is_some() {
                match state.sign_in(cookies).await {
                    Ok(SignInOutcome::Complete) => {
                        let _ = watcher_app.emit("login-done", ());
                    }
                    // Authenticated cookie saved; the account stays unfinished until a channel
                    // picker picks an identity — same contract as the desktop flow.
                    Ok(SignInOutcome::SelectionRequired) => {}
                    Err(e) => {
                        let _ = watcher_app.emit("login-error", e);
                    }
                }
                navigate_main(&watcher_app, return_url.clone());
                return;
            }
            if std::time::Instant::now() > deadline {
                let _ = watcher_app.emit("login-error", "Sign-in timed out");
                navigate_main(&watcher_app, return_url.clone());
                return;
            }
        }
    });

    navigate_main(&app, tauri::Url::parse(&login_url(hint.as_deref())).expect("static URL parses"));
}

/// Navigate the main webview (main-thread hop; Android's webview must be touched from there).
#[cfg(target_os = "android")]
fn navigate_main(app: &AppHandle, url: tauri::Url) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(wv) = app2.get_webview_window("main") {
            let _ = wv.navigate(url);
        }
    });
}

/// The main webview's location plus its youtube.com cookie jar, read together on the main thread.
/// Polling location+cookies rather than subscribing to page-load events keeps this independent of
/// when navigation callbacks can be attached.
#[cfg(target_os = "android")]
async fn main_webview_state(app: &AppHandle) -> (bool, String) {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let app2 = app.clone();
    let dispatched = app.run_on_main_thread(move || {
        let state = app2
            .get_webview_window("main")
            .map(|wv| {
                (
                    wv.url().map(|u| u.host_str() == Some("music.youtube.com")).unwrap_or(false),
                    wv.cookies().map(youtube_cookie_header).unwrap_or_default(),
                )
            })
            .unwrap_or((false, String::new()));
        let _ = tx.send(state);
    });
    if dispatched.is_err() {
        return (false, String::new());
    }
    rx.await.unwrap_or((false, String::new()))
}

/// Merge the youtube-domain cookies into a `Cookie` header string. Reads the platform cookie store
/// (HttpOnly + secure included), matching what a browser sends to music.youtube.com.
///
/// Hops to the main thread: both backends drive their platform event loop while they wait for the
/// store (`gtk::main_iteration` on WebKitGTK, `NSRunLoop::mainRunLoop` on WKWebView), so they are
/// written to be called from the thread that owns it.
#[cfg(not(target_os = "android"))]
async fn read_login_cookies(app: &AppHandle) -> String {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let app2 = app.clone();
    if app
        .run_on_main_thread(move || {
            let _ = tx.send(youtube_cookies(&app2));
        })
        .is_err()
    {
        return String::new();
    }
    rx.await.unwrap_or_default()
}

#[cfg(not(target_os = "android"))]
fn youtube_cookies(app: &AppHandle) -> String {
    let Some(wv) = app.get_webview_window(LOGIN_LABEL) else { return String::new() };
    let Ok(cookies) = wv.cookies() else { return String::new() };
    youtube_cookie_header(cookies)
}

/// Domain-match by hand rather than with `cookies_for_url`: WKWebView's implementation compares the
/// cookie's domain to the URL's host with `==`, so YouTube's `.youtube.com` cookies never match
/// music.youtube.com and macOS got an empty jar (no SAPISID, so sign-in gave up silently).
/// WebKitGTK matches domains properly, which is why Linux never saw it.
///
/// Anything outside youtube.com is dropped, google.com cookies included: this becomes a `Cookie`
/// header sent to YouTube, and a cookie without a domain we recognise doesn't belong in it.
fn youtube_cookie_header(mut cookies: Vec<Cookie<'static>>) -> String {
    // `Cookie::domain()` has already stripped the leading dot. Sorting means the most specific
    // domain is inserted last and so wins a name collision, the way a browser resolves one.
    cookies.sort_by_key(|c| c.domain().unwrap_or_default().len());
    let mut jar = std::collections::BTreeMap::new();
    for c in cookies {
        let domain = c.domain().unwrap_or_default();
        if domain == "youtube.com" || domain.ends_with(".youtube.com") {
            jar.insert(c.name().to_string(), c.value().to_string());
        }
    }
    jar.into_iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join("; ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cookie(s: &str) -> Cookie<'static> {
        Cookie::parse(s.to_string()).unwrap()
    }

    #[test]
    fn keeps_the_youtube_jar_and_drops_everything_else() {
        // `.youtube.com` is where the auth cookies actually live, and the domain WKWebView refuses
        // to match against music.youtube.com.
        let header = youtube_cookie_header(vec![
            cookie("SAPISID=abc; Domain=.youtube.com"),
            cookie("SID=def; Domain=.youtube.com"),
            cookie("VISITOR_INFO1_LIVE=xyz; Domain=music.youtube.com"),
            cookie("SAPISID=notthisone; Domain=.google.com"),
            cookie("nodomain=1"),
        ]);
        assert_eq!(header, "SAPISID=abc; SID=def; VISITOR_INFO1_LIVE=xyz");
        // The check open_login gates on: no SAPISID means sign-in silently gives up.
        assert_eq!(innertube::cookie_sapisid(&header), Some("abc"));
    }

    #[test]
    fn the_most_specific_domain_wins_a_name_collision() {
        let header = youtube_cookie_header(vec![
            cookie("PREF=broad; Domain=.youtube.com"),
            cookie("PREF=specific; Domain=music.youtube.com"),
        ]);
        assert_eq!(header, "PREF=specific");
    }
}

#[cfg(not(target_os = "android"))]
fn close_login(app: &AppHandle) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(w) = app2.get_webview_window(LOGIN_LABEL) {
            let _ = w.destroy();
        }
    });
}
