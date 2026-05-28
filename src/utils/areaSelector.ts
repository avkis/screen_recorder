import { invoke } from '@tauri-apps/api/core';

export const selectAreaViaOS = async () => {
  // Используем стандартный инструмент скриншотов ОС
  // для Linux - gnome-screenshot
  try {
    await invoke('execute_system_screenshot_tool');
    
    // Ждем, пока пользователь сделает скриншот
    // После чего обрабатываем результат
  } catch (error) {
    console.error('Failed to open screenshot tool:', error);
  }
};