use std::process::{Command, Stdio};

use crate::services::{FfmpegService, SystemService};
use crate::state::RecorderState;
use tauri::{AppHandle, Emitter, Manager, State};

/// ===== Start Recording =====
#[tauri::command]
pub async fn start_recording(
    fps: u32,
    bitrate: String,
    output_path: String,
    area: Option<serde_json::Value>,
    audio_device: Option<String>,
    record_audio: bool,
    monitor_name: Option<String>,
    audio_quality: String,
    state: State<'_, RecorderState>,
    _app_handle: AppHandle,
) -> Result<(), String> {
    println!("Saving recording to: {}", output_path);

    // Настройки качества звука
    let (audio_codec, audio_bitrate, sample_rate) = match audio_quality.as_str() {
        "low" => ("aac", "96k", "44100"),
        "medium" => ("aac", "192k", "48000"),
        "high" => ("aac", "320k", "48000"),
        "lossless" => ("flac", "", "96000"), // FLAC без указания битрейта
        _ => ("aac", "192k", "48000"),       // По умолчанию среднее качество
    };
    println!(
        "Audio settings: codec={}, bitrate={}, rate={}",
        audio_codec, audio_bitrate, sample_rate
    );

    let ffmpeg_check = Command::new("ffmpeg").arg("-version").output();

    match ffmpeg_check {
        Ok(output) if output.status.success() => {
            println!("FFmpeg is available");
        }
        _ => {
            return Err(
                "FFmpeg is not installed or not in PATH. Please install FFmpeg first.".to_string(),
            );
        }
    }

    let mut process_guard = state.process.lock().await;

    if process_guard.is_some() {
        return Err("Recording already in progress".to_string());
    }

    let display = SystemService::get_display();
    let monitors = SystemService::get_monitors()?;

    let selected_monitor = if let Some(ref mon_name) = monitor_name {
        monitors
            .iter()
            .find(|m| m.name == *mon_name)
            .or_else(|| monitors.first())
    } else {
        monitors
            .iter()
            .find(|m| m.is_primary)
            .or_else(|| monitors.first())
    };

    let monitor = selected_monitor.ok_or("No monitor selected")?;

    println!(
        "Selected monitor: {} (primary: {})",
        monitor.name, monitor.is_primary
    );
    println!(
        "  Logical: {}x{} at ({},{})",
        monitor.logical_width, monitor.logical_height, monitor.x, monitor.y
    );
    println!(
        "  Physical: {}x{}, scale {:.2}",
        monitor.physical_width, monitor.physical_height, monitor.scale
    );

    // Вычисляем область захвата
    let (x, y, width, height) = if let Some(area_data) = area {
        let area_x = area_data.get("x").and_then(|v| v.as_u64()).unwrap_or(0) as i32;
        let area_y = area_data.get("y").and_then(|v| v.as_u64()).unwrap_or(0) as i32;
        let area_width = area_data
            .get("width")
            .and_then(|v| v.as_u64())
            .unwrap_or(monitor.physical_width as u64) as u32;
        let area_height = area_data
            .get("height")
            .and_then(|v| v.as_u64())
            .unwrap_or(monitor.physical_height as u64) as u32;

        // Конвертируем физические координаты в логические
        let logical_x = monitor.x + (area_x as f64 * monitor.scale) as i32;
        let logical_y = monitor.y + (area_y as f64 * monitor.scale) as i32;
        let logical_width = (area_width as f64 * monitor.scale) as u32;
        let logical_height = (area_height as f64 * monitor.scale) as u32;

        (logical_x, logical_y, logical_width, logical_height)
    } else {
        (
            monitor.x,
            monitor.y,
            monitor.logical_width,
            monitor.logical_height,
        )
    };

    let grab_area = format!("{}+{},{}", display, x, y);
    let video_size = format!("{}x{}", width, height);
    let output_size = format!("{}x{}", monitor.physical_width, monitor.physical_height);

    println!("FFmpeg grab area: {}", grab_area);
    println!("FFmpeg logical size: {}", video_size);
    println!("FFmpeg output size: {}", output_size);

    let mut child = Command::new("ffmpeg");

    // Входные параметры и файлы должны идти ПЕРЕД фильтрами
    // Видео вход
    child
        .arg("-f")
        .arg("x11grab")
        .arg("-framerate")
        .arg(fps.to_string())
        .arg("-video_size")
        .arg(&video_size)
        .arg("-i")
        .arg(&grab_area);

    // Аудио вход (если включен)
    if record_audio {
        child
            .arg("-f")
            .arg("pulse")
            .arg("-i")
            .arg(audio_device.as_deref().unwrap_or("default"))
            .arg("-c:a")
            .arg(audio_codec);

        if audio_codec != "flac" {
            child.arg("-b:a").arg(audio_bitrate);
        }

        child.arg("-ar").arg(sample_rate);
    }

    // Видео фильтр масштабирования (теперь после входных файлов)
    child.arg("-vf").arg(format!(
        "scale={}:{}",
        monitor.physical_width, monitor.physical_height
    ));

    // Аудио кодек
    if record_audio {
        child.arg("-c:a").arg("aac").arg("-b:a").arg("128k");
    }

    // Видео кодек и остальные параметры
    child
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("ultrafast")
        .arg("-b:v")
        .arg(&bitrate)
        .arg("-pix_fmt")
        .arg("yuv420p");

    if record_audio {
        child.arg("-shortest");
    }

    // Выходной файл
    child
        .arg("-y")
        .arg(&output_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    println!("Starting FFmpeg with command: {:?}", child);

    let child = child
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    *process_guard = Some(child);

    Ok(())
}

/// ===== Parse Recording
#[tauri::command]
pub async fn pause_recording(state: State<'_, RecorderState>) -> Result<(), String> {
    let process_guard = state.process.lock().await;

    if let Some(child) = process_guard.as_ref() {
        #[cfg(target_os = "linux")]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;
            kill(Pid::from_raw(child.id() as i32), Signal::SIGSTOP)
                .map_err(|e| format!("Failed to pause: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn resume_recording(state: State<'_, RecorderState>) -> Result<(), String> {
    let process_guard = state.process.lock().await;

    if let Some(child) = process_guard.as_ref() {
        #[cfg(target_os = "linux")]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;
            kill(Pid::from_raw(child.id() as i32), Signal::SIGCONT)
                .map_err(|e| format!("Failed to resume: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    state: State<'_, RecorderState>,
    app_handle: AppHandle,
    output_path: String,
) -> Result<(), String> {
    println!("Stopping recording, output path: {}", output_path);

    let mut process_guard = state.process.lock().await;

    if let Some(mut child) = process_guard.take() {
        // Отправляем 'q' через stdin для graceful завершения
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(b"q");
            let _ = stdin.flush();
        }

        // Используем spawn_blocking без timeout для простоты
        let result = tokio::task::spawn_blocking(move || child.wait_with_output()).await;

        match result {
            Ok(Ok(output)) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                println!("FFmpeg stderr: {}", stderr);

                if FfmpegService::is_recording_successful(&stderr) {
                    match std::fs::metadata(&output_path) {
                        Ok(metadata) => {
                            println!("File size: {} bytes", metadata.len());
                            if metadata.len() > 0 {
                                app_handle
                                    .emit(
                                        "recording-complete",
                                        serde_json::json!({
                                            "path": output_path
                                        }),
                                    )
                                    .map_err(|e| format!("Failed to emit event: {}", e))?;
                            } else {
                                app_handle
                                    .emit(
                                        "recording-error",
                                        serde_json::json!({
                                            "error": "Output file is empty"
                                        }),
                                    )
                                    .map_err(|e| format!("Failed to emit event: {}", e))?;
                            }
                        }
                        Err(e) => {
                            println!("File not found: {}, error: {}", output_path, e);
                            app_handle
                                .emit(
                                    "recording-error",
                                    serde_json::json!({
                                        "error": format!("File not found: {}", output_path)
                                    }),
                                )
                                .map_err(|e| format!("Failed to emit event: {}", e))?;
                        }
                    }
                } else {
                    app_handle.emit("recording-error", serde_json::json!({
                        "error": format!("FFmpeg error: {}", stderr.lines().next().unwrap_or("unknown error"))
                    })).map_err(|e| format!("Failed to emit event: {}", e))?;
                }
            }
            Ok(Err(e)) => {
                app_handle
                    .emit(
                        "recording-error",
                        serde_json::json!({
                            "error": format!("Failed to wait for FFmpeg: {}", e)
                        }),
                    )
                    .map_err(|e| format!("Failed to emit event: {}", e))?;
            }
            Err(e) => {
                app_handle
                    .emit(
                        "recording-error",
                        serde_json::json!({
                            "error": format!("Task join error: {}", e)
                        }),
                    )
                    .map_err(|e| format!("Failed to emit event: {}", e))?;
            }
        }
    } else {
        return Err("No active recording".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn copy_video_to_app(
    app_handle: AppHandle,
    source_path: String,
) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app dir: {}", e))?;

    // Создаем папку videos если её нет
    let videos_dir = app_dir.join("videos");
    std::fs::create_dir_all(&videos_dir)
        .map_err(|e| format!("Failed to create videos dir: {}", e))?;

    // Генерируем уникальное имя файла
    let file_name = std::path::Path::new(&source_path)
        .file_name()
        .ok_or("Invalid source path")?;

    let dest_path = videos_dir.join(file_name);

    // Копируем файл
    std::fs::copy(&source_path, &dest_path).map_err(|e| format!("Failed to copy video: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn check_ffmpeg() -> Result<bool, String> {
    let output = std::process::Command::new("ffmpeg")
        .arg("-version")
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout);
                println!(
                    "FFmpeg found: {}",
                    version.lines().next().unwrap_or("unknown")
                );
                Ok(true)
            } else {
                Err("FFmpeg not responding".to_string())
            }
        }
        Err(e) => Err(format!("FFmpeg not found: {}", e)),
    }
}

pub fn build_recording_command(
    fps: u32,
    bitrate: &str,
    output_path: &str,
    video_size: &str,
    grab_area: &str,
    record_audio: bool,
    audio_device: Option<&str>,
    audio_codec: &str,   // Добавляем
    audio_bitrate: &str, // Добавляем
    sample_rate: &str,   // Добавляем
) -> Command {
    let mut cmd = Command::new("ffmpeg");

    // Видео вход
    cmd.arg("-f")
        .arg("x11grab")
        .arg("-framerate")
        .arg(fps.to_string())
        .arg("-video_size")
        .arg(video_size)
        .arg("-i")
        .arg(grab_area);

    // Аудио вход
    if record_audio {
        let device = audio_device.unwrap_or("default");
        cmd.arg("-f").arg("pulse").arg("-i").arg(device);
    }

    // Видео фильтр масштабирования
    cmd.arg("-vf").arg(format!(
        "scale={}:{}",
        video_size.split('x').next().unwrap_or("1920"),
        video_size.split('x').nth(1).unwrap_or("1080")
    ));

    // Аудио настройки
    if record_audio {
        cmd.arg("-c:a").arg(audio_codec);

        if audio_codec != "flac" {
            cmd.arg("-b:a").arg(audio_bitrate);
        }

        cmd.arg("-ar").arg(sample_rate);
    }

    // Видео кодек
    cmd.arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("ultrafast")
        .arg("-b:v")
        .arg(bitrate)
        .arg("-pix_fmt")
        .arg("yuv420p");

    if record_audio {
        cmd.arg("-shortest");
    }

    cmd.arg("-y")
        .arg(output_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    cmd
}
