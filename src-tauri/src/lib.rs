// Экспортируем все модули
pub mod commands;
pub mod services;
pub mod state;

// Реэкспортируем основное для удобства
pub use commands::*;
pub use state::RecorderState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(RecorderState::default())
        .invoke_handler(tauri::generate_handler![
            commands::start_recording,
            commands::pause_recording,
            commands::resume_recording,
            commands::stop_recording,
            commands::get_audio_devices,
            commands::get_monitors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
