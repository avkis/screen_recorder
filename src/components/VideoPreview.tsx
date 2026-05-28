import React from 'react';
import { Command } from '@tauri-apps/plugin-shell';

interface VideoPreviewProps {
  videoPath: string | null;
  onClear: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoPath, onClear }) => {
  if (!videoPath) return null;
  
  const fileName = videoPath.split('/').pop();
  
  const openExternalPlayer = async () => {
    try {
      // Определяем операционную систему и используем соответствующую команду
      const platform = navigator.userAgent.toLowerCase();
      
      let command;
      let args;
      
      if (platform.includes('win')) {
        // Windows
        command = 'cmd';
        args = ['/c', 'start', '', videoPath];
      } else if (platform.includes('mac')) {
        // macOS
        command = 'open';
        args = [videoPath];
      } else {
        // Linux
        command = 'xdg-open';
        args = [videoPath];
      }
      
      console.log(`Opening video with: ${command} ${args.join(' ')}`);
      
      const result = await Command.create(command, args).execute();
      
      if (result.code !== 0) {
        console.error('Command failed with code:', result.code);
        console.error('Stderr:', result.stderr);
        throw new Error(`Command exited with code ${result.code}`);
      }
      
      console.log('Video opened successfully');
    } catch (error) {
      console.error('Failed to open video:', error);
      
      // Показываем пользователю инструкцию
      alert(`Не удалось автоматически открыть видео.\n\nФайл сохранен по пути:\n${videoPath}\n\nВы можете открыть его в любом видеоплеере.`);
    }
  };
  
  const copyPathToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(videoPath);
      alert('Путь к видео скопирован в буфер обмена');
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };
  
  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-lg font-semibold">Запись сохранена</h3>
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 font-mono truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {videoPath}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openExternalPlayer}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
            >
              🎬 Открыть видео
            </button>
            <button
              onClick={copyPathToClipboard}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              📋 Копировать путь
            </button>
            <button
              onClick={onClear}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
            >
              Очистить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};