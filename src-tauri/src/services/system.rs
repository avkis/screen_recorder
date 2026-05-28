use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Monitor {
    pub name: String,
    pub logical_width: u32,
    pub logical_height: u32,
    pub physical_width: u32,
    pub physical_height: u32,
    pub x: i32,
    pub y: i32,
    pub is_primary: bool,
    pub scale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenSize {
    pub width: u32,
    pub height: u32,
}

pub struct SystemService;

impl SystemService {
    pub fn get_display() -> String {
        std::env::var("DISPLAY").unwrap_or_else(|_| ":0".to_string())
    }

    pub fn get_screen_size(display: &str) -> Result<ScreenSize, String> {
        let output = Command::new("xdpyinfo")
            .arg("-display")
            .arg(display)
            .output()
            .map_err(|e| format!("Failed to get display info: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);

        for line in output_str.lines() {
            if line.contains("dimensions:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let dimensions = parts[1];
                    let dims: Vec<&str> = dimensions.split('x').collect();
                    if dims.len() == 2 {
                        let width = dims[0].parse::<u32>().unwrap_or(1920);
                        let height = dims[1].parse::<u32>().unwrap_or(1080);
                        return Ok(ScreenSize { width, height });
                    }
                }
            }
        }

        Ok(ScreenSize {
            width: 1920,
            height: 1080,
        })
    }

    /// ===== Get monitors =====
    pub fn get_monitors() -> Result<Vec<Monitor>, String> {
        let output = Command::new("xrandr")
            .arg("--current")
            .output()
            .map_err(|e| format!("Failed to get monitor info: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut monitors = Vec::new();

        for line in output_str.lines() {
            if line.contains(" connected") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let name = parts[0].to_string();
                    let is_primary = line.contains("primary");

                    // Ищем разрешение в формате "1920x1080+0+0"
                    let mut resolution_part = "";
                    for part in &parts {
                        if part.contains('x') && (part.contains('+') || part.contains('-')) {
                            resolution_part = part;
                            break;
                        }
                    }

                    if !resolution_part.is_empty() {
                        // Парсим разрешение
                        let re = Regex::new(r"(\d+)x(\d+)([+-]\d+)([+-]\d+)").unwrap();
                        if let Some(caps) = re.captures(resolution_part) {
                            let logical_width: u32 = caps[1].parse().unwrap_or(0);
                            let logical_height: u32 = caps[2].parse().unwrap_or(0);
                            let x: i32 = caps[3].parse().unwrap_or(0);
                            let y: i32 = caps[4].parse().unwrap_or(0);

                            // Определяем физическое разрешение
                            let (physical_width, physical_height, scale) =
                                Self::get_physical_resolution(&name, logical_width, logical_height);

                            println!("Monitor {}: logical {}x{}, physical {}x{}, scale {:.2}, pos ({},{})", 
                                 name, logical_width, logical_height, physical_width, physical_height, scale, x, y);

                            monitors.push(Monitor {
                                name,
                                logical_width,
                                logical_height,
                                physical_width,
                                physical_height,
                                x,
                                y,
                                is_primary,
                                scale,
                            });
                        }
                    }
                }
            }
        }

        Ok(monitors)
    }

    /// ===== Get Physical Resolution =====
    fn get_physical_resolution(
        name: &str,
        logical_width: u32,
        logical_height: u32,
    ) -> (u32, u32, f64) {
        // Пытаемся получить реальное разрешение из xrandr --verbose
        let output = Command::new("xrandr")
            .args(["--verbose", "--current"])
            .output();

        if let Ok(output) = output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            let mut in_monitor = false;
            let mut current_mode_width = 0;
            let mut current_mode_height = 0;

            for line in output_str.lines() {
                if line.contains(name) && line.contains("connected") {
                    in_monitor = true;
                    continue;
                }

                if in_monitor && line.contains("Mode:") && line.contains("Hz") {
                    // Ищем строки вида: "  Mode: 3840x2160 59.997 Hz"
                    let re = Regex::new(r"Mode:\s+(\d+)x(\d+)").unwrap();
                    if let Some(caps) = re.captures(line) {
                        let width: u32 = caps[1].parse().unwrap_or(0);
                        let height: u32 = caps[2].parse().unwrap_or(0);

                        // Если это текущий активный режим (обычно первый или с меткой * или +)
                        // В xrandr --verbose активный режим обычно имеет '*'
                        if line.contains('*') || line.contains('+') {
                            current_mode_width = width;
                            current_mode_height = height;
                            break;
                        }

                        // Если не нашли помеченный, берем первый попавшийся
                        if current_mode_width == 0 {
                            current_mode_width = width;
                            current_mode_height = height;
                        }
                    }
                }

                if in_monitor && line.is_empty() {
                    break;
                }
            }

            if current_mode_width > 0 && current_mode_height > 0 {
                let scale = logical_width as f64 / current_mode_width as f64;
                println!(
                    "  Detected via xrandr --verbose: physical {}x{}, scale {:.2}",
                    current_mode_width, current_mode_height, scale
                );
                return (current_mode_width, current_mode_height, scale);
            }
        }

        // Fallback: определяем по соотношению сторон
        Self::detect_by_aspect_ratio(logical_width, logical_height)
    }

    fn detect_by_aspect_ratio(logical_width: u32, logical_height: u32) -> (u32, u32, f64) {
        let aspect_ratio = logical_width as f64 / logical_height as f64;

        println!("  Detecting by aspect ratio: {:.3}", aspect_ratio);

        // Словарь известных разрешений с их соотношениями сторон
        let known_resolutions = vec![
            (3840, 2160, 16.0 / 9.0),      // 4K UHD
            (2560, 1440, 16.0 / 9.0),      // QHD
            (1920, 1080, 16.0 / 9.0),      // Full HD
            (3440, 1440, 3440.0 / 1440.0), // Ultra-wide 21:9
            (2560, 1080, 2560.0 / 1080.0), // Ultra-wide 21:9
            (3840, 1600, 3840.0 / 1600.0), // 24:10
            (2560, 1600, 16.0 / 10.0),     // 16:10
            (1920, 1200, 16.0 / 10.0),     // 16:10
        ];

        // Ищем наиболее близкое соответствие
        let mut best_match = (logical_width, logical_height, 1.0);
        let mut smallest_diff = f64::MAX;

        for (phys_w, phys_h, ratio) in known_resolutions {
            let diff = (aspect_ratio - ratio).abs();
            if diff < smallest_diff && diff < 0.05 {
                // Допуск 5%
                smallest_diff = diff;
                let scale = logical_width as f64 / phys_w as f64;
                best_match = (phys_w, phys_h, scale);
            }
        }

        // Если масштаб слишком большой или маленький, возможно, разрешение неизвестно
        let scale = best_match.2;
        if scale < 0.8 || scale > 3.0 {
            // Неизвестное разрешение, используем логическое
            println!(
                "  Unknown resolution, using logical: {}x{}",
                logical_width, logical_height
            );
            (logical_width, logical_height, 1.0)
        } else {
            println!(
                "  Matched: {}x{}, scale {:.2}",
                best_match.0, best_match.1, best_match.2
            );
            best_match
        }
    }


    // Альтернативный метод через xrandr --listactivemonitors
    pub fn get_monitors_alt() -> Result<Vec<Monitor>, String> {
        let output = Command::new("xrandr")
            .args(["--listactivemonitors"])
            .output()
            .map_err(|e| format!("Failed to get monitor info: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut monitors = Vec::new();

        let re =
            Regex::new(r"(\d+):\s+\+?\*?(\S+)\s+(\d+)/\d+x(\d+)/\d+([+-]\d+)([+-]\d+)").unwrap();

        for line in output_str.lines() {
            if let Some(caps) = re.captures(line) {
                let name = caps[2].to_string();
                let logical_width: u32 = caps[3].parse().unwrap_or(0);
                let logical_height: u32 = caps[4].parse().unwrap_or(0);
                let x: i32 = caps[5].parse().unwrap_or(0);
                let y: i32 = caps[6].parse().unwrap_or(0);
                let is_primary = line.contains('*');

                // Определяем масштаб
                let scale = if logical_width >= 6000 {
                    2.0
                } else if logical_width >= 5000 {
                    1.5
                } else {
                    1.0
                };

                let physical_width = (logical_width as f64 / scale) as u32;
                let physical_height = (logical_height as f64 / scale) as u32;

                monitors.push(Monitor {
                    name,
                    x,
                    y,
                    is_primary,
                    scale,
                    physical_width: physical_width,
                    physical_height: physical_height,
                    logical_width: 0,
                    logical_height: 0,
                });
            }
        }

        Ok(monitors)
    }

    /// ===== Get audio devices =====
    pub fn get_audio_devices() -> Result<Vec<String>, String> {
        let output = Command::new("pactl")
            .args(["list", "short", "sources"])
            .output()
            .map_err(|e| format!("Failed to get audio devices: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut devices = Vec::new();

        for line in output_str.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let name = parts[1];
                if name.contains(".monitor") || name.contains("input") {
                    devices.push(name.to_string());
                }
            }
        }

        Ok(devices)
    }
}
