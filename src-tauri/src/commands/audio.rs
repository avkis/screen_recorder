use crate::services::SystemService;

#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<String>, String> {
    SystemService::get_audio_devices()
}
