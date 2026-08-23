//! OS media integration (MPRIS / SMTC / NowPlaying) via `souvlaki`. context/16, D11.
//!
//! Desktop gets the real thing ([`desktop_impl`]); there is no souvlaki backend for Android, so
//! non-desktop builds compile an inert [`MediaHandle`] whose `spawn` answers `None` — every push
//! site in [`AppState`] is already `if let Some(m)`, so nothing else changes.
//!
//! `souvlaki`'s `MediaControls` isn't `Send`, and on Windows/macOS its events arrive on the
//! platform's own loop — so we give it a dedicated owner thread. The app talks to that thread over
//! a channel ([`MediaHandle`]); OS control presses route back into [`AppState`] through the
//! captured `AppHandle`. The two share the same commands the UI uses, so they never drift.

#[cfg(desktop)]
mod desktop_impl;
#[cfg(desktop)]
pub use desktop_impl::{handle_event, spawn, MediaHandle};

/// Non-desktop (Android): no OS media-controls surface yet. [`AppState`] expects the type to
/// exist, so provide an inert one; `spawn` hands back `None`.
#[cfg(not(desktop))]
pub struct MediaHandle;

#[cfg(not(desktop))]
impl MediaHandle {
    pub fn set_metadata(&self, _: &str, _: &str, _: Option<&str>, _: Option<&str>) {}
    pub fn set_duration(&self, _: f64) {}
    pub fn set_playback(&self, _: bool, _: f64) {}
}

#[cfg(not(desktop))]
pub fn spawn(_app: tauri::AppHandle) -> Option<MediaHandle> {
    None
}
