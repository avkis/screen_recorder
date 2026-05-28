import { getCurrentWindow } from '@tauri-apps/api/window';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const AreaSelector: React.FC = () => {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    
    // Устанавливаем окно поверх всех
    currentWindow.setAlwaysOnTop(true);
    currentWindow.setFullscreen(true);
    
    const handleMouseDown = (e: MouseEvent) => {
      setStartPoint({ x: e.clientX, y: e.clientY });
      setCurrentPoint({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (startPoint) {
        setCurrentPoint({ x: e.clientX, y: e.clientY });
        drawSelection();
      }
    };

    const handleMouseUp = () => {
      if (startPoint && currentPoint) {
        const area = {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y)
        };
        
        if (area.width > 10 && area.height > 10) {
          // Отправляем выбранную область в главное окно
          const mainWindow = getCurrentWindow();
          mainWindow.emit('area-selected', area);
        }
      }
      
      // Закрываем окно выбора
      currentWindow.close();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        currentWindow.close();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [startPoint, currentPoint]);

  const drawSelection = () => {
    if (!canvasRef.current || !startPoint || !currentPoint) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем полупрозрачный фон
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем выбранную область
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    
    // Очищаем выбранную область (делаем её прозрачной)
    ctx.clearRect(x, y, width, height);
    
    // Рисуем рамку
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Показываем размеры
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`${width} x ${height}`, x + 10, y + 25);
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      
      const handleResize = () => {
        if (canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
          drawSelection();
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [drawSelection]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        zIndex: 9999
      }}
    />
  );
};

// Рендерим приложение
createRoot(document.getElementById('root')!).render(<AreaSelector />);