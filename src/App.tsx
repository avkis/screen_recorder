// В App.tsx добавьте новое состояние и загрузку мониторов
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { save } from '@tauri-apps/plugin-dialog';
import { useEffect, useRef, useState } from 'react';
import { AreaSelector } from './components/AreaSelector';
import { Monitor, MonitorSelector, SelectedArea } from './components/MonitorSelector';
import { RecordingControls } from './components/RecordingControls';
import { Settings } from './components/Settings';
import { StatusIndicator } from './components/StatusIndicator';
import { VideoPreview } from './components/VideoPreview';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'processing'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fps, setFps] = useState(30);
  const [quality, setQuality] = useState('medium');
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [recordAudio, setRecordAudio] = useState(true);
  const [audioDevice, setAudioDevice] = useState('default');
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [currentOutputPath, setCurrentOutputPath] = useState<string | null>(null);
  const [savePath, setSavePath] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 1920, height: 1080 });
  const [audioQuality, setAudioQuality] = useState('high');
  
  
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    const checkFFmpeg = async () => {
      try {
        const hasFFmpeg = await invoke('check_ffmpeg');
        if (!hasFFmpeg) {
          console.warn('FFmpeg not found');
          // Можно показать уведомление пользователю
        }
      } catch (error) {
        console.error('FFmpeg check failed:', error);
      }
    };
    
    checkFFmpeg();
  }, []);

  useEffect(() => {
    const getScreenSize = async () => {
      const window = getCurrentWindow();
      // const scaleFactor = await window.scaleFactor();
      const physicalSize = await window.innerSize();
      
      setScreenSize({
        width: physicalSize.width,
        height: physicalSize.height
      });
    };
    
    getScreenSize();
  }, []);

  // Загружаем список мониторов при запуске
  useEffect(() => {
    const loadMonitors = async () => {
      try {
        const monitorsList = await invoke<Monitor[]>('get_monitors');
        console.log('Loaded monitors:', monitorsList);
        setMonitors(monitorsList);
        if (monitorsList.length > 0) {
          const primary = monitorsList.find(m => m.is_primary);
          setSelectedMonitor(primary?.name || monitorsList[0].name);
        }
      } catch (error) {
        console.error('Failed to load monitors:', error);
      }
    };
    
    loadMonitors();
  }, []);

  // Слушаем событие выбора области
  useEffect(() => {
    const unlisten = listen('area-selected', (event: any) => {
      console.log('Area selected:', event.payload);
      setSelectedArea(event.payload);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);
  
  // Таймер для отображения длительности записи
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);
  
  // Слушаем события от бэкенда
  useEffect(() => {
    const unlistenRecordingComplete = listen('recording-complete', (event: any) => {
      console.log('Recording complete event:', event.payload);
      setStatus('idle');
      setIsRecording(false);
      setIsPaused(false);
      setVideoPath(event.payload.path);
      setCurrentOutputPath(null);
      console.log('Recording saved:', event.payload.path);
    });
    
    const unlistenRecordingError = listen('recording-error', (event: any) => {
      setStatus('idle');
      setIsRecording(false);
      setCurrentOutputPath(null);
      console.error('Recording error:', event.payload.error);
      alert(`Ошибка записи: ${event.payload.error}`);
    });
    
    return () => {
      unlistenRecordingComplete.then(unlisten => unlisten());
      unlistenRecordingError.then(unlisten => unlisten());
    };
  }, []);

 
  const getQualityBitrate = () => {
    const bitrates = {
      low: '3000k',
      medium: '6000k',
      high: '12000k',
      lossless: '50000k'
    };
    return bitrates[quality as keyof typeof bitrates];
  };

    // Функция выбора пути сохранения
  const selectSavePath = async () => {
    try {
      const selected = await save({
        title: 'Сохранить видео как...',
        defaultPath: `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`,
        filters: [{
          name: 'Video',
          extensions: ['mp4']
        }]
      });
      
      if (selected) {
        console.log('Selected save path:', selected);
        setSavePath(selected);
      }
    } catch (error) {
      console.error('Failed to select save path:', error);
    }
  };

  const startAreaSelection = () => {
    setIsSelectingArea(true);
  };

  const handleAreaSelected = (area: { x: number; y: number; width: number; height: number }) => {
    setSelectedArea(area);
    setIsSelectingArea(false);
    console.log('Selected area:', area);
  };
  
  
  const cancelAreaSelection = () => {
    setIsSelectingArea(false);
  };
  
  const startRecording = async () => {
    if (!savePath) {
      alert('Пожалуйста, выберите путь для сохранения видео');
      return;
    }

    try {
      setStatus('processing');
      setVideoPath(null);
      
      const timestamp = Date.now();
      startTimeRef.current = timestamp;
      setCurrentOutputPath(savePath);

     
      await invoke('start_recording', {
        fps,
        bitrate: getQualityBitrate(),
        outputPath: savePath,
        area: selectedArea || null,
        recordAudio,
        audioDevice,
        monitorName: selectedMonitor,
        audioQuality,
      });
      
      setIsRecording(true);
      setIsPaused(false);
      setStatus('recording');
      setElapsedTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus('idle');
      alert('Не удалось начать запись. Убедитесь, что установлен FFmpeg.');
    }
  };
  
  const pauseRecording = async () => {
    try {
      await invoke('pause_recording');
      setIsPaused(true);
      setStatus('paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };
  
  const resumeRecording = async () => {
    try {
      await invoke('resume_recording');
      setIsPaused(false);
      setStatus('recording');
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };
  
  const stopRecording = async () => {
    if (!currentOutputPath) {
      console.error('No output path available');
      alert('Нет пути для сохранения записи');
      return;
    }
    
    try {
      setStatus('processing');
      await invoke('stop_recording', { outputPath: currentOutputPath });
      // Не сбрасываем currentOutputPath здесь, т.к. он нужен для события
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setStatus('idle');
      alert('Не удалось остановить запись');
    }
  };
  
  const clearVideo = () => {
    setVideoPath(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Screen Recorder
        </h1>

        {/* Блок выбора пути сохранения */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Путь сохранения</h3>
          <div className="flex gap-3 items-center">
            <button
              onClick={selectSavePath}
              disabled={isRecording}
              className={`px-4 py-2 rounded ${
                isRecording
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              Выбрать папку и имя файла
            </button>
            {savePath && (
              <span className="text-sm text-gray-400 truncate flex-1">
                {savePath}
              </span>
            )}
          </div>
          {!savePath && (
            <p className="text-sm text-yellow-500 mt-2">
              ⚠️&nbsp; Выберите путь для сохранения видео перед началом записи
            </p>
          )}
        </div>
        
        <StatusIndicator status={status} elapsedTime={elapsedTime} />
        
        <div className="space-y-6">
          <MonitorSelector
            selectedMonitor={selectedMonitor}
            onMonitorChange={setSelectedMonitor}
            monitors={monitors}
            isRecording={isRecording}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            startAreaSelection={startAreaSelection}
          />
          
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <Settings
              fps={fps}
              onFpsChange={setFps}
              quality={quality}
              onQualityChange={setQuality}
              recordAudio={recordAudio}
              onRecordAudioChange={setRecordAudio}
              audioDevice={audioDevice}
              onAudioDeviceChange={setAudioDevice} 
              audioQuality={audioQuality} 
              onAudioQualityChange={(quality: string) => setAudioQuality(quality)}            
            />
           
          </div>
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <RecordingControls
              isRecording={isRecording}
              isPaused={isPaused}
              onStart={startRecording}
              onStop={stopRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
            />
          </div>

        </div>
        
        <VideoPreview videoPath={videoPath} onClear={clearVideo} />
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>💡&nbsp; Совет: Убедитесь, что FFmpeg установлен в системе</p>
        </div>
      </div>
      {isSelectingArea && (
        <AreaSelector
          onAreaSelected={handleAreaSelected}
          onCancel={cancelAreaSelection}
          screenWidth={screenSize.width}
          screenHeight={screenSize.height}
        />
      )}    
    </div>
  );
}

export default App;