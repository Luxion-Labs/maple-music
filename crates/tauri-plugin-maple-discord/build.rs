fn main() {
    tauri_plugin::Builder::new(&[
        "connectWithToken",
        "openWebViewLogin",
        "updateActivity",
        "disconnect",
        "saveToken",
        "getSavedToken",
    ])
    .android_path("android")
    .build();
}
