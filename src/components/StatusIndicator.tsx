import React from 'react';

interface StatusIndicatorProps {
  status: 'idle' | 'recording' | 'paused' | 'processing';
  elapsedTime: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, elapsedTime }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'recording': return 'bg-red-600 animate-pulse';
      case 'paused': return 'bg-yellow-600';
      case 'processing': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'recording': return '● Идет запись...';
      case 'paused': return '⏸ Запись на паузе';
      case 'processing': return '🔄 Обработка видео...';
      default: return '● Готов к записи';
    }
  };
  
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="font-medium">{getStatusText()}</span>
      </div>
      {status === 'recording' && (
        <div className="font-mono text-lg font-bold tabular-nums">
          {formatTime(elapsedTime)}
        </div>
      )}
    </div>
  );
};