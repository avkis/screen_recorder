import React, { useState } from 'react';

interface AreaSelectorProps {
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  screenWidth?: number;
  screenHeight?: number;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({ 
  onAreaSelected, 
  onCancel,
  screenWidth = 1920,
  screenHeight = 1080
}) => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(screenWidth);
  const [height, setHeight] = useState(screenHeight);

  const handleConfirm = () => {
    if (width > 0 && height > 0) {
      onAreaSelected({ x, y, width, height });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Выбор области экрана</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">X (левый верхний угол)</label>
              <input
                type="number"
                value={x}
                onChange={(e) => setX(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Y (левый верхний угол)</label>
              <input
                type="number"
                value={y}
                onChange={(e) => setY(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ширина</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Высота</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded"
            >
              Выбрать
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded"
            >
              Отмена
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-400">
          <p>💡 Укажите координаты и размер области для записи</p>
          <p>Позиция (0,0) - левый верхний угол основного монитора</p>
          <p>Размер вашего монитора: {screenWidth} x {screenHeight}</p>
        </div>
      </div>
    </div>
  );
};