import { useState, useEffect } from 'react';
import { Tab } from '../types';
import { loadState, saveState } from './usePersistence';

export const useTabs = () => {
  const [tabs, setTabs] = useState<Tab[]>(() => 
    loadState('tabs', [{ id: '1', title: 'Terminal', cwd: undefined }])
  );
  const [activeTabId, setActiveTabId] = useState<string>(() => 
    loadState('activeTabId', '1')
  );

  useEffect(() => saveState('tabs', tabs), [tabs]);
  useEffect(() => saveState('activeTabId', activeTabId), [activeTabId]);

  const addTab = (cwd?: string, isAdmin?: boolean) => {
    const id = Date.now().toString();
    const title = cwd ? cwd.split('\\').pop() || 'Terminal' : 'Terminal';
    const newTabs = [...tabs, { id, title, cwd, isAdmin }];
    setTabs(newTabs);
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
       const newId = Date.now().toString();
       setTabs([{ id: newId, title: 'Terminal', cwd: undefined }]);
       setActiveTabId(newId);
       return;
    }
    
    if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
    }
    setTabs(newTabs);
  };

  const renameTab = (id: string, newTitle: string) => {
    if (newTitle && newTitle.trim()) {
      setTabs(prev => prev.map(t => 
        t.id === id ? { ...t, title: newTitle.trim(), isManualTitle: true } : t
      ));
    }
  };

  const updateTabStatus = (id: string, status: Partial<Pick<Tab, 'hasAlert' | 'hasConfirmation' | 'title'>>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...status } : t));
  };

  const clearTabNotifications = (id: string) => {
    setTabs(prev => prev.map(t => 
      t.id === id ? { ...t, hasAlert: false, hasConfirmation: false } : t
    ));
  };

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    updateTabStatus,
    clearTabNotifications
  };
};
