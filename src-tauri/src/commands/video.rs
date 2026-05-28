use crate::services::{Monitor, SystemService};

#[tauri::command]
pub async fn get_monitors() -> Result<Vec<Monitor>, String> {
    let monitors = SystemService::get_monitors()?;
    println!("Sending monitors to frontend:");
    for m in &monitors {
        println!(
            "  {}: logical {}x{}, physical {}x{}, scale {}",
            m.name, m.logical_width, m.logical_height, m.physical_width, m.physical_height, m.scale
        );
    }
    Ok(monitors)
}
