# Project structure
```text
src-tauri/
├── src/
│   ├── main.rs              # Точка входа (минимальный код)
│   ├── lib.rs               # Экспорт модулей
│   ├── commands/
│   │   ├── mod.rs           # Регистрация всех команд
│   │   ├── recording.rs     # Команды записи (start, stop, pause)
│   │   ├── audio.rs         # Команды для работы с аудио
│   │   ├── video.rs         # Команды для работы с видео/мониторами
│   │   └── utils.rs         # Вспомогательные функции
│   ├── state/
│   │   ├── mod.rs           # Управление состоянием
│   │   └── recorder.rs      # RecorderState структура
│   └── services/
│       ├── mod.rs           # Экспорт сервисов
│       ├── ffmpeg.rs        # Логика работы с FFmpeg
│       └── system.rs        # Системные вызовы (xrandr, xdpyinfo, pactl)
└── Cargo.toml
```