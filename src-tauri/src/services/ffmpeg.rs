use std::io::Write;
use std::process::{Child, Command, Stdio};

pub struct FfmpegService;

impl FfmpegService {
    pub fn build_recording_command(
        fps: u32,
        bitrate: &str,
        output_path: &str,
        video_size: &str,
        grab_area: &str,
        record_audio: bool,
        audio_device: Option<&str>,
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
            cmd.arg("-f")
                .arg("pulse")
                .arg("-i")
                .arg(device)
                .arg("-c:a")
                .arg("aac")
                .arg("-b:a")
                .arg("128k");
        }

        // Видео кодирование
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

    pub fn send_stop_signal(child: &mut Child) -> Result<(), String> {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(b"q")
                .map_err(|e| format!("Failed to send stop signal: {}", e))?;
            stdin
                .flush()
                .map_err(|e| format!("Failed to flush stdin: {}", e))?;
        }
        Ok(())
    }

    pub fn is_recording_successful(stderr: &str) -> bool {
        stderr.contains("video:") && stderr.contains("kB")
    }
}
