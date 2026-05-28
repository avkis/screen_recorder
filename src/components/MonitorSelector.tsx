import React from 'react';

export interface Monitor {
  name: string;
  logical_width: number;
  logical_height: number;
  physical_width: number;
  physical_height: number;
  x: number;
  y: number;
  is_primary: boolean;
  scale: number;
}

export interface SelectedArea { 
  x: number; 
  y: number; 
  width: number; 
  height: number 
}

interface MonitorSelectorProps {
  selectedMonitor: string | null;
  onMonitorChange: (monitorName: string | null) => void;
  monitors: Monitor[];
  isRecording: boolean;
  selectedArea: SelectedArea | null;
  setSelectedArea: (area: SelectedArea | null) => void; 
  startAreaSelection: () => void;
}

export const MonitorSelector: React.FC<MonitorSelectorProps> = ({
  selectedMonitor,
  onMonitorChange,
  monitors,
  isRecording,
  selectedArea,
  setSelectedArea,
  startAreaSelection,
}) => {
  if (monitors.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-gray-400">Загрузка мониторов...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold">Выбор монитора</h3>
      <div className='grid grid-cols-2 gap-6'>
        <div className="space-y-2">
          {monitors.map((monitor) => (
            <label
              key={monitor.name}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="radio"
                name="monitor"
                value={monitor.name}
                checked={selectedMonitor === monitor.name}
                onChange={() => onMonitorChange(monitor.name)}
                className="w-4 h-4 mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {monitor.name}
                  {monitor.is_primary && (
                    <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded">
                      Основной
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  <div>Физическое разрешение: {monitor.physical_width} x {monitor.physical_height} px</div>
                  <div className="text-xs text-gray-500">
                    Логическое разрешение: {monitor.logical_width} x {monitor.logical_height} px
                    {monitor.scale > 1 && (
                      <span className="ml-2 text-yellow-500">
                        (масштаб {monitor.scale.toFixed(2)}x)
                      </span>
                    )}
                  </div>
                  {monitor.x !== 0 || monitor.y !== 0 ? (
                    <div className="text-xs text-gray-500">
                      Позиция: ({monitor.x}, {monitor.y})
                    </div>
                  ) : null}
                </div>
              </div>
            </label>
          ))}
        </div>
        {selectedArea ? (
          <div className="space-y-2 justify-self-end">
            <div className="text-sm text-gray-300">
              Выбрана область: {selectedArea.width} x {selectedArea.height} пикселей
              <br />
              Позиция: ({selectedArea.x}, {selectedArea.y})
            </div>
            <button
              onClick={() => setSelectedArea(null)}
              className="text-red-400 hover:text-red-300 text-sm w-full"
            >
              Очистить (записывать весь экран)
            </button>
          </div>
        ) : (
          <button
            onClick={startAreaSelection}
            disabled={isRecording}
            className={`w-64 h-12 py-2 px-4 rounded justify-self-end ${isRecording
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
          >
            Выбрать область экрана
          </button>
        )}
      </div>
      
      <div className="text-sm text-gray-400">
        💡 Выберите монитор для записи. Можно дополнительно выделить область внутри него.
      </div>
    </div>
  );
};