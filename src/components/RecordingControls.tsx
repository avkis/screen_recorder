import React from 'react';

interface RecordingControlsProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
}) => {
  return (
    <div className="flex gap-4 justify-center items-center">
      {!isRecording ? (
        <button
          onClick={onStart}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          <div className="w-4 h-4 bg-white rounded-full"></div>
          Начать запись
        </button>
      ) : (
        <>
          {!isPaused ? (
            <button
              onClick={onPause}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              ⏸ Пауза
            </button>
          ) : (
            <button
              onClick={onResume}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              ▶ Возобновить
            </button>
          )}
          <button
            onClick={onStop}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ⬛ Стоп
          </button>
        </>
      )}
    </div>
  );
};