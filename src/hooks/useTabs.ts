import { useState, useEffect, useCallback } from 'react';
import { Tab, Pane, PaneLayout, Workspace } from '../types';
import { loadState, saveState } from './usePersistence';

const createTerminalPane = (cwd?: string, isAdmin?: boolean, initialCommand?: string, envVars?: Record<string, string>): { pane: Pane, layout: PaneLayout } => {
  const paneId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  return {
    pane: { id: paneId, cwd, isAdmin, initialCommand, envVars },
    layout: { type: 'terminal', paneId }
  };
};

export const useTabs = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const { pane, layout } = createTerminalPane();
      const initialTab: Tab = {
        id: '1',
        title: 'Terminal',
        layout,
        panes: { [pane.id]: pane }
      };
      
      const savedTabs = await loadState<Tab[]>('tabs', [initialTab]);
      const savedActiveId = await loadState<string>('activeTabId', savedTabs[0].id);
      const savedWorkspaces = await loadState<Workspace[]>('workspaces', []);
      const savedActiveWorkspaceId = await loadState<string | null>('activeWorkspaceId', null);

      setTabs(savedTabs);
      setActiveTabId(savedActiveId);
      setWorkspaces(savedWorkspaces);
      setActiveWorkspaceId(savedActiveWorkspaceId);
      setIsLoaded(true);
    };
    init();
  }, []);

  // Save changes
  useEffect(() => {
    if (isLoaded) {
      saveState('tabs', tabs);
      saveState('workspaces', workspaces);
      saveState('activeWorkspaceId', activeWorkspaceId);
    }
  }, [tabs, workspaces, activeWorkspaceId, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('activeTabId', activeTabId);
    }
  }, [activeTabId, isLoaded]);

  const saveWorkspace = useCallback((name: string) => {
    const id = Date.now().toString();
    const newWorkspace: Workspace = {
      id,
      name,
      tabs: JSON.parse(JSON.stringify(tabs)), // Deep copy
      activeTabId,
    };
    setWorkspaces((prev) => [...prev, newWorkspace]);
    setActiveWorkspaceId(id);
  }, [tabs, activeTabId]);

  const loadWorkspace = useCallback((id: string) => {
    const workspace = workspaces.find((w) => w.id === id);
    if (workspace) {
      setTabs(JSON.parse(JSON.stringify(workspace.tabs)));
      setActiveTabId(workspace.activeTabId);
      setActiveWorkspaceId(id);
    }
  }, [workspaces]);

  const deleteWorkspace = useCallback((id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }
  }, [activeWorkspaceId]);

  const addTab = useCallback((cwd?: string, isAdmin?: boolean, initialCommand?: string, envVars?: Record<string, string>) => {
    const id = Date.now().toString();
    const { pane, layout } = createTerminalPane(cwd, isAdmin, initialCommand, envVars);
    const title = cwd ? cwd.split('\\').pop() || 'Terminal' : 'Terminal';
    
    setTabs((prev) => [...prev, { 
      id, 
      title, 
      layout,
      panes: { [pane.id]: pane }
    }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        const { pane, layout } = createTerminalPane();
        const newId = Date.now().toString();
        setActiveTabId(newId);
        return [{ 
          id: newId, 
          title: 'Terminal', 
          layout,
          panes: { [pane.id]: pane }
        }];
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

  const splitPane = useCallback((tabId: string, targetPaneId: string, direction: 'horizontal' | 'vertical') => {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== tabId) return tab;

      const targetPane = tab.panes[targetPaneId];
      const { pane: newPane, layout: newPaneLayout } = createTerminalPane(targetPane?.cwd, targetPane?.isAdmin, undefined, targetPane?.envVars);
      const newPanes = { ...tab.panes, [newPane.id]: newPane };

      const updateLayout = (layout: PaneLayout): PaneLayout => {
        if (layout.type === 'terminal' && layout.paneId === targetPaneId) {
          return {
            type: 'split',
            splitDirection: direction,
            children: [
              { ...layout },
              newPaneLayout
            ]
          };
        }
        if (layout.type === 'split' && layout.children) {
          return {
            ...layout,
            children: [updateLayout(layout.children[0]), updateLayout(layout.children[1])]
          };
        }
        return layout;
      };

      return {
        ...tab,
        panes: newPanes,
        layout: updateLayout(tab.layout)
      };
    }));
  }, []);

  const closePane = useCallback((tabId: string, paneId: string) => {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== tabId) return tab;
      if (Object.keys(tab.panes).length <= 1) return tab; // Don't close last pane

      const newPanes = { ...tab.panes };
      delete newPanes[paneId];

      const updateLayout = (layout: PaneLayout): PaneLayout => {
        if (layout.type === 'split' && layout.children) {
          if (layout.children[0].type === 'terminal' && layout.children[0].paneId === paneId) {
            return layout.children[1];
          }
          if (layout.children[1].type === 'terminal' && layout.children[1].paneId === paneId) {
            return layout.children[0];
          }
          return {
            ...layout,
            children: [updateLayout(layout.children[0]), updateLayout(layout.children[1])]
          };
        }
        return layout;
      };

      return {
        ...tab,
        panes: newPanes,
        layout: updateLayout(tab.layout)
      };
    }));
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
    splitPane,
    closePane,
    saveWorkspace,
    loadWorkspace,
    deleteWorkspace,
    workspaces,
    activeWorkspaceId,
    renameTab,
    updateTabStatus,
    clearTabNotifications,
    reorderTabs,
  };
};
