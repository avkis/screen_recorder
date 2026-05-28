use std::process::Child;
use tokio::sync::Mutex;

#[derive(Default)]
pub struct RecorderState {
    pub process: Mutex<Option<Child>>,
}

impl RecorderState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }

    pub async fn is_recording(&self) -> bool {
        let guard = self.process.lock().await;
        guard.is_some()
    }

    pub async fn clear(&self) {
        let mut guard = self.process.lock().await;
        *guard = None;
    }
}
