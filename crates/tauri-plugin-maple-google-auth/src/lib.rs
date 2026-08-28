//! Native Google account chooser for Maple on Android.
//!
//! Backs the `google_suggest_account` command: on Android it presents Google Credential Manager
//! (`GetSignInWithGoogleOption`) so the user can pick *which* Google account to sign into, and
//! returns the chosen account's email. The rest of Maple then opens the sign-in webview with that
//! email as the `login_hint` so the captured YTM session cookie belongs to the account the user
//! wanted — not Google's default. On every other platform this returns `Ok(None)` (no native
//! chooser), and the caller falls back to the plain webview sign-in.

#[cfg(target_os = "android")]
use serde::Deserialize;
use tauri::plugin::{PluginHandle, TauriPlugin};
#[cfg(target_os = "android")]
use tauri::AppHandle;
use tauri::{Manager, Runtime};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.maple.googleauth";

/// Managed handle to the running Kotlin plugin, so app commands can reach it.
pub struct GoogleAuth<R: Runtime>(Option<PluginHandle<R>>);

/// Initializes the plugin. Call from the app's builder: `.plugin(init())`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("maple-google-auth")
        .setup(|_, api| {
            #[cfg(target_os = "android")]
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "GoogleAuthPlugin").ok();
            #[cfg(not(target_os = "android"))]
            let handle: Option<PluginHandle<R>> = None;
            api.app().manage(GoogleAuth(handle));
            Ok(())
        })
        .build()
}

/// Present the native Google account chooser and return the email the user picked.
/// `None` means "no account chosen" (user cancelled, or no native chooser on this platform).
#[cfg(target_os = "android")]
pub async fn suggest_account<R: Runtime>(app: &AppHandle<R>) -> Result<Option<String>, String> {
    let state = app.state::<GoogleAuth<R>>();
    let handle =
        state.0.as_ref().ok_or_else(|| "native Google auth plugin is not available".to_string())?;
    let res = handle
        .run_mobile_plugin_async::<SuggestAccountResponse>("suggestAccount", ())
        .await
        .map_err(|e| e.to_string())?;
    Ok(res.email)
}

#[cfg(target_os = "android")]
#[derive(Debug, Deserialize)]
struct SuggestAccountResponse {
    email: Option<String>,
}
