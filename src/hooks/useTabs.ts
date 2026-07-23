import { useState, useEffect, useCallback } from 'react';
import { Tab, Pane, PaneLayout, Workspace } from '../types';
import { loadState, saveState } from './usePersistence';
import { killTerminalProcess } from '../utils/terminalUtils';

const createTerminalPane = (
  cwd?: string,
  isAdmin?: boolean,
  initialCommand?: string,
  envVars?: Record<string, string>
): { pane: Pane; layout: PaneLayout } => {
  const paneId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  return {
    pane: { id: paneId, cwd, isAdmin, initialCommand, envVars },
    layout: { type: 'terminal', paneId },
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
      const savedTabsRaw = await loadState<Tab[]>('tabs', []);
      const savedTabs = Array.isArray(savedTabsRaw) ? savedTabsRaw : [];
      const savedActiveId = await loadState<string>('activeTabId', '');
      const savedWorkspacesRaw = await loadState<Workspace[]>('workspaces', []);
      const savedWorkspaces = Array.isArray(savedWorkspacesRaw) ? savedWorkspacesRaw : [];
      const savedActiveWorkspaceId = await loadState<string | null>('activeWorkspaceId', null);

      // Validate and filter saved tabs
      const validatedTabs = savedTabs
        .filter((tab) => tab && typeof tab === 'object')
        .map((tab) => {
          if (!tab.layout || !tab.panes) {
            const { pane, layout } = createTerminalPane();
            return {
              ...tab,
              layout: tab.layout || layout,
              panes: tab.panes || { [pane.id]: pane },
            };
          }
          return tab;
        });

      // Validate and filter workspaces
      const validatedWorkspaces = savedWorkspaces.filter(
        (w) => w && typeof w === 'object' && Array.isArray(w.tabs)
      );

      if (validatedTabs.length === 0) {
        const { pane, layout } = createTerminalPane();
        const initialTab: Tab = {
          id: Date.now().toString(),
          title: 'Terminal',
          layout,
          panes: { [pane.id]: pane },
        };
        setTabs([initialTab]);
        setActiveTabId(initialTab.id);
      } else {
        setTabs(validatedTabs);
        setActiveTabId(savedActiveId && validatedTabs.some((t) => t.id === savedActiveId) ? savedActiveId : validatedTabs[0].id);
      }
      setWorkspaces(validatedWorkspaces);
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

  const saveWorkspace = useCallback(
    (name: string) => {
      const id = Date.now().toString();
      const newWorkspace: Workspace = {
        id,
        name,
        tabs: JSON.parse(JSON.stringify(tabs)), // Deep copy
        activeTabId,
      };
      setWorkspaces((prev) => [...prev, newWorkspace]);
      setActiveWorkspaceId(id);
    },
    [tabs, activeTabId]
  );

  const loadWorkspace = useCallback(
    (id: string) => {
      const workspace = workspaces.find((w) => w.id === id);
      if (workspace) {
        setTabs((prev) => {
          // Kill all current terminal processes before loading the new workspace
          prev.forEach((tab) => {
            if (tab.panes) {
              Object.keys(tab.panes).forEach((paneId) => killTerminalProcess(paneId));
            }
          });
          return JSON.parse(JSON.stringify(workspace.tabs));
        });
        setActiveTabId(workspace.activeTabId);
        setActiveWorkspaceId(id);
      }
    },
    [workspaces]
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
      }
    },
    [activeWorkspaceId]
  );

  const addTab = useCallback(
    (
      cwd?: string,
      isAdmin?: boolean,
      initialCommand?: string,
      envVars?: Record<string, string>
    ) => {
      const id = Date.now().toString();
      const { pane, layout } = createTerminalPane(cwd, isAdmin, initialCommand, envVars);
      const title = cwd ? cwd.split('\\').pop() || 'Terminal' : 'Terminal';

      setTabs((prev) => [
        ...prev,
        {
          id,
          title,
          layout,
          panes: { [pane.id]: pane },
        },
      ]);
      setActiveTabId(id);
    },
    []
  );

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const tabToClose = prev.find((t) => t.id === id);
      if (tabToClose && tabToClose.panes) {
        Object.keys(tabToClose.panes).forEach((paneId) => killTerminalProcess(paneId));
      }

      const newTabs = prev.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        setActiveTabId('');
        return [];
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

  const splitPane = useCallback(
    (tabId: string, targetPaneId: string, direction: 'horizontal' | 'vertical') => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;

          const targetPane = tab.panes[targetPaneId];
          const { pane: newPane, layout: newPaneLayout } = createTerminalPane(
            targetPane?.cwd,
            targetPane?.isAdmin,
            undefined,
            targetPane?.envVars
          );
          const newPanes = { ...tab.panes, [newPane.id]: newPane };

          const updateLayout = (layout: PaneLayout): PaneLayout => {
            if (layout.type === 'terminal' && layout.paneId === targetPaneId) {
              return {
                type: 'split',
                splitDirection: direction,
                children: [{ ...layout }, newPaneLayout],
              };
            }
            if (layout.type === 'split' && layout.children) {
              return {
                ...layout,
                children: [updateLayout(layout.children[0]), updateLayout(layout.children[1])],
              };
            }
            return layout;
          };

          return {
            ...tab,
            panes: newPanes,
            layout: updateLayout(tab.layout),
          };
        })
      );
    },
    []
  );

  const closePane = useCallback((tabId: string, paneId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (!tab.panes || Object.keys(tab.panes).length <= 1) return tab; // Don't close last pane

        killTerminalProcess(paneId);

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
              children: [updateLayout(layout.children[0]), updateLayout(layout.children[1])],
            };
          }
          return layout;
        };

        return {
          ...tab,
          panes: newPanes,
          layout: updateLayout(tab.layout),
        };
      })
    );
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
    isLoaded,
  };
};
