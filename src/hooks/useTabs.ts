import { useState, useEffect, useCallback } from 'react';
import { Tab } from '../types';
import { loadState, saveState } from './usePersistence';

export const useTabs = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const savedTabs = await loadState<Tab[]>('tabs', [{ id: '1', title: 'Terminal', cwd: undefined }]);
      const savedActiveId = await loadState<string>('activeTabId', savedTabs[0].id);
      setTabs(savedTabs);
      setActiveTabId(savedActiveId);
      setIsLoaded(true);
    };
    init();
  }, []);

  // Save changes
  useEffect(() => {
    if (isLoaded) {
      saveState('tabs', tabs);
    }
  }, [tabs, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('activeTabId', activeTabId);
    }
  }, [activeTabId, isLoaded]);

  const addTab = useCallback((cwd?: string, isAdmin?: boolean) => {
    const id = Date.now().toString();
    const title = cwd ? cwd.split('\\').pop() || 'Terminal' : 'Terminal';
    setTabs((prev) => [...prev, { id, title, cwd, isAdmin }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        const newId = Date.now().toString();
        setActiveTabId(newId);
        return [{ id: newId, title: 'Terminal', cwd: undefined }];
      }

      setActiveTabId((prevActiveId) => {
        if (prevActiveId === id) {
          return newTabs[newTabs.length - 1].id;
        }
        return prevActiveId;
      });
      return newTabs;
    });
  }, []);

  const renameTab = useCallback((id: string, newTitle: string) => {
    if (newTitle && newTitle.trim()) {
      setTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: newTitle.trim(), isManualTitle: true } : t))
      );
    }
  }, []);

  const updateTabStatus = useCallback(
    (id: string, status: Partial<Pick<Tab, 'hasAlert' | 'hasConfirmation' | 'title'>>) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...status } : t)));
    },
    []
  );

  const clearTabNotifications = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, hasAlert: false, hasConfirmation: false } : t))
    );
  }, []);

  const reorderTabs = useCallback((startIndex: number, endIndex: number) => {
    setTabs((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    updateTabStatus,
    clearTabNotifications,
    reorderTabs,
  };
};
