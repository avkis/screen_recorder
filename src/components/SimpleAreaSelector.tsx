import { getCurrentWindow } from '@tauri-apps/api/window';
import React, { useState } from 'react';

interface SimpleAreaSelectorProps {
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export const SimpleAreaSelector: React.FC<SimpleAreaSelectorProps> = ({
  onAreaSelected,
  onCancel
}) => {
  const [mode, setMode] = useState<'instructions' | 'selecting'>('instructions');
  
  const startSelection = async () => {
    setMode('selecting');
    
    // Делаем окно полноэкранным с минимальными настройками
    const currentWindow = getCurrentWindow();
    await currentWindow.setFullscreen(true);
    await currentWindow.setAlwaysOnTop(true);
  };
  
  const cancelSelection = async () => {
    const currentWindow = getCurrentWindow();
    await currentWindow.setFullscreen(false);
    await currentWindow.setAlwaysOnTop(false);
    onCancel();
  };
  
  const handleAreaInput = () => {
    // Используем простой ввод координат
    const x = prompt('Введите X координату левого верхнего угла:');
    const y = prompt('Введите Y координату левого верхнего угла:');
    const width = prompt('Введите ширину области:');
    const height = prompt('Введите высоту области:');
    
    if (x && y && width && height) {
      onAreaSelected({
        x: parseInt(x),
        y: parseInt(y),
        width: parseInt(width),
        height: parseInt(height)
      });
    }
  };
  
  if (mode === 'selecting') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-4">Выбор области</h3>
          <p className="text-gray-300 mb-4">
            Чтобы выбрать область, используйте один из методов:
          </p>
          <div className="space-y-3">
            <button
              onClick={handleAreaInput}
              className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
            >
              Ввести координаты вручную
            </button>
            <button
              onClick={cancelSelection}
              className="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Выбор области экрана</h3>
        <p className="text-gray-300 mb-4">
          Нажмите "Начать выделение", затем выделите область на экране.
          <br />
          <span className="text-sm text-gray-400">
            После выделения окно приложения станет полноэкранным.
          </span>
        </p>
        <div className="space-y-3">
          <button
            onClick={startSelection}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
          >
            Начать выделение
          </button>
          <button
            onClick={handleAreaInput}
            className="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded"
          >
            Ввести координаты вручную
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};