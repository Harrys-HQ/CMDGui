import { useState, useEffect, useCallback } from 'react';
import { loadState, saveState } from './usePersistence';

export const useSidebarResizer = () => {
  const [sidebarWidth, setSidebarWidth] = useState(() => loadState('sidebarWidth', 250));
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => saveState('sidebarWidth', sidebarWidth), [sidebarWidth]);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 150 && newWidth < 600) {
            setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return {
    sidebarWidth,
    isResizing,
    startResizing
  };
};
