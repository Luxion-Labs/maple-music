//! Discord Rich Presence plugin for Android.
//!
//! Provides Discord Gateway connection and activity updates for Android devices.
//! Unlike desktop which uses local IPC, Android must authenticate as the user
//! and push PRESENCE_UPDATE through the Gateway.

use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime,
};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.maple.discord";

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordActivity {
    pub app_name: String,
    pub application_id: String,
    pub details: String,
    pub state: String,
    pub large_image: Option<String>,
    pub small_image: Option<String>,
}

/// Managed handle to the running Kotlin Discord plugin.
pub struct DiscordRpc<R: Runtime>(Option<PluginHandle<R>>);

/// Response from the native Discord connection attempt.
#[derive(Debug, Deserialize)]
struct ConnectResponse {
    success: bool,
    message: Option<String>,
}

/// Initialize the Discord RPC plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("maple-discord")
        .setup(|_app, api| {
            #[cfg(target_os = "android")]
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "DiscordRpcPlugin").ok();
            #[cfg(not(target_os = "android"))]
            let handle: Option<PluginHandle<R>> = None;

            api.app().manage(DiscordRpc(handle));
            Ok(())
        })
        .build()
}

/// Connect to Discord Gateway with a token.
#[cfg(target_os = "android")]
pub async fn connect_with_token<R: Runtime>(
    app: &AppHandle<R>,
    token: &str,
) -> Result<String, String> {
    let state = app.state::<DiscordRpc<R>>();
    let handle = state.0.as_ref().ok_or_else(|| "Discord RPC plugin not available".to_string())?;

    #[derive(Serialize)]
    struct ConnectArgs {
        token: String,
    }

    let response = handle
        .run_mobile_plugin_async::<ConnectResponse>(
            "connectWithToken",
            ConnectArgs { token: token.to_string() },
        )
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    if response.success {
        Ok(response.message.unwrap_or_else(|| "Connected".to_string()))
    } else {
        Err(response.message.unwrap_or_else(|| "Connection failed".to_string()))
    }
}

/// Update Discord activity/presence.
#[cfg(target_os = "android")]
pub async fn update_activity<R: Runtime>(
    app: &AppHandle<R>,
    activity: DiscordActivity,
) -> Result<(), String> {
    let state = app.state::<DiscordRpc<R>>();
    let handle = state.0.as_ref().ok_or_else(|| "Discord RPC plugin not available".to_string())?;

    handle
        .run_mobile_plugin_async::<()>("updateActivity", activity)
        .await
        .map_err(|e| format!("Failed to update activity: {}", e))
}

/// Disconnect from Discord.
#[cfg(target_os = "android")]
pub async fn disconnect<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let state = app.state::<DiscordRpc<R>>();
    let handle = state.0.as_ref().ok_or_else(|| "Discord RPC plugin not available".to_string())?;

    handle
        .run_mobile_plugin_async::<()>("disconnect", ())
        .await
        .map_err(|e| format!("Failed to disconnect: {}", e))
}

/// Open WebView login to auto-capture Discord token.
#[cfg(target_os = "android")]
pub async fn open_webview_login<R: Runtime>(app: &AppHandle<R>) -> Result<String, String> {
    let state = app.state::<DiscordRpc<R>>();
    let handle = state.0.as_ref().ok_or_else(|| "Discord RPC plugin not available".to_string())?;

    #[derive(serde::Deserialize)]
    struct WebViewResponse {
        success: bool,
        message: Option<String>,
    }

    let response = handle
        .run_mobile_plugin_async::<WebViewResponse>("openWebViewLogin", ())
        .await
        .map_err(|e| format!("Failed to open login: {}", e))?;

    if response.success {
        Ok(response.message.unwrap_or_else(|| "Login successful".to_string()))
    } else {
        Err(response.message.unwrap_or_else(|| "Login failed".to_string()))
    }
}

// Desktop stubs (Discord RPC handled by discord.rs on desktop)
#[cfg(not(target_os = "android"))]
pub async fn connect_with_token<R: Runtime>(
    _app: &AppHandle<R>,
    _token: &str,
) -> Result<String, String> {
    Err("Discord RPC via Gateway is Android-only. Desktop uses local IPC.".to_string())
}

#[cfg(not(target_os = "android"))]
pub async fn open_webview_login<R: Runtime>(_app: &AppHandle<R>) -> Result<String, String> {
    Err("Discord WebView login is Android-only. Desktop uses local IPC.".to_string())
}

#[cfg(not(target_os = "android"))]
pub async fn update_activity<R: Runtime>(
    _app: &AppHandle<R>,
    _activity: DiscordActivity,
) -> Result<(), String> {
    Ok(()) // No-op on desktop
}

#[cfg(not(target_os = "android"))]
pub async fn disconnect<R: Runtime>(_app: &AppHandle<R>) -> Result<(), String> {
    Ok(())
}
