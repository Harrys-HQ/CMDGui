import { useState, useEffect, useCallback, useRef } from 'react';
import { loadState, saveState } from './usePersistence';

export const useSidebarResizer = () => {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedWidth = await loadState<number>('sidebarWidth', 250);
      setSidebarWidth(savedWidth);
      document.documentElement.style.setProperty('--sidebar-width', `${savedWidth}px`);
      setIsLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState('sidebarWidth', sidebarWidth);
    }
  }, [sidebarWidth, isLoaded]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
    document.body.classList.add('resizing');
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.classList.remove('resizing');
    
    // Finalize the width in state for persistence
    const currentWidth = parseInt(document.documentElement.style.getPropertyValue('--sidebar-width'));
    if (!isNaN(currentWidth)) {
      setSidebarWidth(currentWidth);
    }
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 150 && newWidth < 600) {
          document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return {
    sidebarWidth,
    isResizing,
    startResizing,
  };
};
