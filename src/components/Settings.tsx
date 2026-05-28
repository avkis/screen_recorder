import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

interface SettingsProps {
  fps: number;
  onFpsChange: (fps: number) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  recordAudio: boolean;
  onRecordAudioChange: (record: boolean) => void;
  audioDevice: string;
  onAudioDeviceChange: (device: string) => void;
  audioQuality: string;  // Добавляем
  onAudioQualityChange: (quality: string) => void;  // Добавляем
}

export const Settings: React.FC<SettingsProps> = ({
  fps,
  onFpsChange,
  quality,
  onQualityChange,
  recordAudio,
  onRecordAudioChange,
  audioDevice,
  onAudioDeviceChange,
  audioQuality,
  onAudioQualityChange,
}) => {
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        const devices = await invoke<string[]>('get_audio_devices');
        setAudioDevices(devices);
      } catch (error) {
        console.error('Failed to load audio devices:', error);
      }
    };
    
    loadAudioDevices();
  }, []);
  
  const audioQualityOptions = {
    low: { bitrate: '96k', sampleRate: '44100', description: 'Низкое (96 kbps) - экономное место' },
    medium: { bitrate: '192k', sampleRate: '48000', description: 'Среднее (192 kbps) - хорошее качество' },
    high: { bitrate: '320k', sampleRate: '48000', description: 'Высокое (320 kbps) - отличное качество' },
    lossless: { bitrate: 'lossless', sampleRate: '96000', description: 'Без потерь (FLAC) - максимальное качество' }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold">Настройки записи</h3>
      
      <div className='grid grid-cols-2 gap-6'>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            FPS: {fps}
          </label>
          <input
            type="range"
            min="15"
            max="60"
            step="5"
            value={fps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Качество видео
          </label>
          <select
            value={quality}
            onChange={(e) => onQualityChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-black"
          >
            <option value="low">Низкое (3000kbps)</option>
            <option value="medium">Среднее (6000kbps)</option>
            <option value="high">Высокое (12000kbps)</option>
            <option value="lossless">Без потерь (50000kbps)</option>
          </select>
          <div className="text-sm text-gray-400">
            <p>⚠️&nbsp; Высокое качество требует больше места на диске</p>
          </div>
        </div>
      </div>

      
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={recordAudio}
            onChange={(e) => onRecordAudioChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-300">
            Записывать звук
          </span>
        </label>
      </div>
     
        
      {recordAudio && (
        <div className='grid grid-cols-2 gap-6'>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Качество звука
            </label>
            <select
              value={audioQuality}
              onChange={(e) => onAudioQualityChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-black"
            >
              <option value="low">Низкое (96 kbps)</option>
              <option value="medium">Среднее (192 kbps)</option>
              <option value="high">Высокое (320 kbps)</option>
              <option value="lossless">Без потерь (FLAC)</option>
            </select>
            <p className="text-xs text-gray-400">
              {audioQualityOptions[audioQuality as keyof typeof audioQualityOptions]?.description}
            </p>
            <div className="text-sm text-gray-400">
              <p>💡&nbsp; Совет: Для лучшего качества используйте высокий битрейт аудио (320 kbps)</p>
            </div>

          </div>
          
          {audioDevices.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Источник звука
              </label>
              <select
                value={audioDevice}
                onChange={(e) => onAudioDeviceChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-black"
              >
                {audioDevices.map((device) => (
                  <option key={device} value={device}>
                    {device.split('.').pop()?.replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}    
    </div>
  );
};