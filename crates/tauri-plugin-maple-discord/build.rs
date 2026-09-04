fn main() {
    tauri_plugin::Builder::new(&[
        "connect_with_token",
        "update_activity",
        "disconnect",
        "save_token",
        "get_saved_token",
    ])
    .android_path("android")
    .build();
}
