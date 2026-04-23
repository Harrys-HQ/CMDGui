import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Terminal from './components/Terminal';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import Sidebar from './components/Sidebar';
import QuickSwitcher from './components/QuickSwitcher';
import { useTabs } from './hooks/useTabs';
import { useProjects } from './hooks/useProjects';
import { useSidebarResizer } from './hooks/useSidebarResizer';
import { useSettings } from './hooks/useSettings';
import { useCommands } from './hooks/useCommands';
import { useKeybindings, isKeyMatch } from './hooks/useKeybindings';
import { useCommandHistory } from './hooks/useCommandHistory';
import {
  cleanTerminalTitle,
  clearOrphanedBuffers,
  globalPtyRegistry,
} from './utils/terminalUtils';
import { Tab, PaneLayout } from './types';
import { Panel, Group, Separator } from 'react-resizable-panels';

import PromptModal from './components/modals/PromptModal';
import ConfirmModal from './components/modals/ConfirmModal';

const App: React.FC = () => {
  const {
    tabs,
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
    renameTab,
    updateTabStatus,
    clearTabNotifications,
    reorderTabs,
  } = useTabs();

  const { history, addHistory, toggleBookmark, clearHistory } = useCommandHistory();
  const { projects, addProject, removeProject, reorderProjects, refreshGitStatus } = useProjects();
  const { sidebarWidth, startResizing } = useSidebarResizer();
  const {
    terminalTheme,
    setTerminalTheme,
    customTheme,
    setCustomTheme,
    terminalFontSize,
    setTerminalFontSize,
    terminalScrollback,
    setTerminalScrollback,
    isQuakeModeEnabled,
    setIsQuakeModeEnabled,
    isStayAwakeEnabled,
    setIsStayAwakeEnabled,
    isGPUAccelerationEnabled,
    setIsGPUAccelerationEnabled,
    defaultShell,
    setDefaultShell,
    isAdmin,
    relaunchAdmin,
  } = useSettings();

  const { keymap, updateKeybinding, resetKeybindings } = useKeybindings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [hibernatedTabs, setHibernatedTabs] = useState<Set<string>>(new Set());

  // Hibernation logic: Check every minute for inactive tabs
  useEffect(() => {
    const HIBERNATION_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      const newHibernated = new Set(hibernatedTabs);
      let changed = false;

      tabs.forEach((tab) => {
        if (tab.id === activeTabId) {
          if (newHibernated.has(tab.id)) {
            newHibernated.delete(tab.id);
            changed = true;
          }
          return;
        }

        // Check last active time of all panes in this tab
        const panes = tab.panes ? Object.keys(tab.panes) : [];
        const lastActive = panes.length > 0 
          ? Math.max(...panes.map((p) => globalPtyRegistry[p]?.lastActive || 0))
          : 0;

        if (lastActive > 0 && now - lastActive > HIBERNATION_THRESHOLD) {
          if (!newHibernated.has(tab.id)) {
            newHibernated.add(tab.id);
            changed = true;
            console.log(`[Hibernation] Hibernating tab ${tab.id} (${tab.title})`);
          }
        }
      });

      if (changed) setHibernatedTabs(newHibernated);
    }, 60000);

    return () => clearInterval(interval);
  }, [tabs, activeTabId, hibernatedTabs]);

  // Wake up tab when it becomes active
  useEffect(() => {
    if (activeTabId && hibernatedTabs.has(activeTabId)) {
      const newHibernated = new Set(hibernatedTabs);
      newHibernated.delete(activeTabId);
      setHibernatedTabs(newHibernated);
      console.log(`[Hibernation] Waking up tab ${activeTabId}`);
    }
  }, [activeTabId, hibernatedTabs]);

  // Modal States
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    initialValue: '',
    onConfirm: () => {},
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const terminalRefs = useRef<{ [key: string]: { clear: () => void } | null }>({});

  const handleTerminalNotification = useCallback(
    (tabId: string, type: 'alert' | 'confirmation') => {
      updateTabStatus(tabId, type === 'alert' ? { hasAlert: true } : { hasConfirmation: true });
    },
    [updateTabStatus]
  );

  const handleTerminalClear = useCallback((paneId: string, clearFn: () => void) => {
    terminalRefs.current[paneId] = { clear: clearFn };
  }, []);

  const handleCheckUpdates = async () => {
    if (!window.electron) return;
    const result = await window.electron.checkForUpdates();
    if (result.success && !result.updateInfo) alert('You are on the latest version!');
    else if (!result.success) alert('Error checking for updates: ' + result.error);
  };

  const handleCloseTab = useCallback(
    (id: string) => {
      const tabToClose = tabs.find((t) => t.id === id);
      if (tabToClose && tabToClose.panes) {
        Object.keys(tabToClose.panes).forEach((paneId) => {
          if (terminalRefs.current[paneId]) delete terminalRefs.current[paneId];
        });
      }
      closeTab(id);
    },
    [tabs, closeTab]
  );

  const handleClosePane = useCallback(
    (tabId: string, paneId: string) => {
      if (terminalRefs.current[paneId]) delete terminalRefs.current[paneId];
      closePane(tabId, paneId);
    },
    [closePane]
  );

  const handleRenameTab = useCallback(
    (id: string, currentTitle: string) => {
      setPromptModal({
        isOpen: true,
        title: 'Rename Task',
        initialValue: currentTitle,
        onConfirm: (newTitle) => {
          if (newTitle) renameTab(id, newTitle);
          setPromptModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    },
    [renameTab]
  );

  const handleAddTerminal = useCallback(
    async (asAdmin: boolean) => {
      if (asAdmin && !isAdmin) {
        setConfirmModal({
          isOpen: true,
          title: 'Restart as Administrator?',
          message:
            'To run terminals as Administrator, the Workspace Manager must be restarted with elevated privileges.\n\nRestart now?',
          onConfirm: () => {
            relaunchAdmin();
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }
      addTab(undefined, asAdmin);
    },
    [isAdmin, relaunchAdmin, addTab]
  );

  const renderLayout = (tab: Tab, layout: PaneLayout): React.ReactNode => {
    if (hibernatedTabs.has(tab.id)) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666',
            fontSize: '12px',
          }}
        >
          Tab is hibernating to save memory...
        </div>
      );
    }

    if (layout.type === 'terminal') {
      const pane = tab.panes[layout.paneId!];
      if (!pane) return null;
      return (
        <Terminal
          key={pane.id}
          paneId={pane.id}
          cwd={pane.cwd}
          shell={defaultShell}
          initialCommand={pane.initialCommand}
          envVars={pane.envVars}
          isActive={activeTabId === tab.id}
          theme={terminalTheme}
          customTheme={customTheme}
          fontSize={terminalFontSize}
          scrollback={terminalScrollback}
          onCommand={addHistory}
          onNotification={(type) => handleTerminalNotification(tab.id, type)}
          onTitleChange={(t) => {
            const newTitle = cleanTerminalTitle(t, tab.title, tab.isManualTitle);
            if (newTitle) updateTabStatus(tab.id, { title: newTitle });
          }}
          onClear={(clearFn) => handleTerminalClear(pane.id, clearFn)}
          onSplitHorizontal={() => splitPane(tab.id, pane.id, 'horizontal')}
          onSplitVertical={() => splitPane(tab.id, pane.id, 'vertical')}
          onClosePane={() => handleClosePane(tab.id, pane.id)}
          showPaneControls={true}
          keymap={keymap}
        />
      );
    }
    if (layout.type === 'split') {
      const isHorizontal = layout.splitDirection === 'horizontal';
      if (!layout.children) return null;
      return (
        <Group orientation={isHorizontal ? 'vertical' : 'horizontal'} style={{ width: '100%', height: '100%' }}>
          <Panel style={{ position: 'relative', overflow: 'hidden' }}>
            {renderLayout(tab, layout.children[0])}
          </Panel>
          <Separator className={`pane-resizer-${layout.splitDirection}`} />
          <Panel style={{ position: 'relative', overflow: 'hidden' }}>
            {renderLayout(tab, layout.children[1])}
          </Panel>
        </Group>
      );
    }
    return null;
  };

  const { commands } = useCommands({
    onAddTerminal: handleAddTerminal,
    onCloseTab: handleCloseTab,
    onRenameTab: (id) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab) handleRenameTab(id, tab.title);
    },
    onClearTerminal: () => {
      if (activeTabId) {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.panes) {
          Object.keys(activeTab.panes).forEach((paneId) => {
            if (terminalRefs.current[paneId]) terminalRefs.current[paneId]?.clear();
          });
        }
      }
    },
    onOpenSettings: () => setIsSettingsOpen(true),
    onCheckUpdates: handleCheckUpdates,
    onToggleTheme: () => {
      const themes = ['vscode', 'monokai', 'solarized-dark', 'one-dark'];
      setTerminalTheme(themes[(themes.indexOf(terminalTheme) + 1) % themes.length]);
    },
    onSaveWorkspace: saveWorkspace,
    onLoadWorkspace: loadWorkspace,
    workspaces,
    activeTabId,
    keymap,
  });

  useEffect(() => {
    if (!window.electron) return;
    const cleanup = window.electron.onUpdateStatus((data) => {
      if (data.status === 'available' || data.status === 'downloaded') setIsUpdateAvailable(true);
      else if (data.status === 'not-available') setIsUpdateAvailable(false);
    });
    return cleanup;
  }, []);

  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const addTabRef = useRef(addTab);
  const closeTabRef = useRef(handleCloseTab);
  const renameTabRef = useRef(renameTab);
  const removeProjectRef = useRef(removeProject);
  const keymapRef = useRef(keymap);
  const setActiveTabIdRef = useRef(setActiveTabId);

  useEffect(() => {
    tabsRef.current = tabs;
    activeTabIdRef.current = activeTabId;
    addTabRef.current = addTab;
    closeTabRef.current = handleCloseTab;
    renameTabRef.current = renameTab;
    removeProjectRef.current = removeProject;
    keymapRef.current = keymap;
    setActiveTabIdRef.current = setActiveTabId;
  });

  useEffect(() => {
    if (!window.electron) return;
    return window.electron.onSidebarContextAction((data) => {
      switch (data.action) {
        case 'close-tab':
          closeTabRef.current(data.id);
          break;
        case 'rename-tab': {
          const tab = tabsRef.current.find((t) => t.id === data.id);
          if (tab) {
            const newTitle = prompt('Rename Task:', tab.title);
            if (newTitle) renameTabRef.current(data.id, newTitle);
          }
          break;
        }
        case 'remove-project':
          removeProjectRef.current(data.path);
          break;
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isKeyMatch(e, keymapRef.current.commandPalette)) {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      if (isKeyMatch(e, keymapRef.current.newTab)) {
        e.preventDefault();
        addTabRef.current();
      }
      if (isKeyMatch(e, keymapRef.current.closeTab)) {
        e.preventDefault();
        if (activeTabIdRef.current) closeTabRef.current(activeTabIdRef.current);
      }
      if (isKeyMatch(e, keymapRef.current.nextTab)) {
        e.preventDefault();
        const t = tabsRef.current;
        const idx = t.findIndex((tab) => tab.id === activeTabIdRef.current);
        if (idx !== -1) setActiveTabIdRef.current(t[(idx + 1) % t.length].id);
      }
      if (isKeyMatch(e, keymapRef.current.prevTab)) {
        e.preventDefault();
        const t = tabsRef.current;
        const idx = t.findIndex((tab) => tab.id === activeTabIdRef.current);
        if (idx !== -1) setActiveTabIdRef.current(t[(idx - 1 + t.length) % t.length].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  useEffect(() => {
    if (activeTabId) clearTabNotifications(activeTabId);
  }, [activeTabId, clearTabNotifications]);

  // Periodic cleanup of orphaned terminal buffers
  useEffect(() => {
    const allPaneIds = tabs.flatMap((tab) => (tab.panes ? Object.keys(tab.panes) : []));
    clearOrphanedBuffers(allPaneIds);
  }, [tabs]);

  return (
    <div className="app-root-layout">
      <TitleBar />
      <div className="workspace-layout">
        <Sidebar
          width={sidebarWidth}
          projects={projects}
          tabs={tabs}
          activeTabId={activeTabId}
          onAddProject={addProject}
          onRemoveProject={removeProject}
          onAddTerminal={handleAddTerminal}
          onSelectTab={setActiveTabId}
          onCloseTab={(id, e) => {
            e.stopPropagation();
            handleCloseTab(id);
          }}
          onRenameTab={handleRenameTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAddTabWithCwd={(cwd) => {
            const p = projects.find((p) => p.path === cwd);
            addTab(cwd, false, p?.startupCommand, p?.envVars);
          }}
          onRunProjectScript={(cwd, name) => {
            const p = projects.find((p) => p.path === cwd);
            addTab(cwd, false, `npm run ${name}`, p?.envVars);
          }}
          onReorderTabs={reorderTabs}
          onReorderProjects={reorderProjects}
          onRefreshGitStatus={refreshGitStatus}
        />
        <div className="resizer" onMouseDown={startResizing} />
        <div className="main-content">
          <div className="terminal-container">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                style={{
                  display: activeTabId === tab.id ? 'block' : 'none',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                {renderLayout(tab, tab.layout)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <StatusBar
        status="Ready"
        activeTabTitle={activeTab?.title}
        tabCount={tabs.length}
        isUpdateAvailable={isUpdateAvailable}
        onShowUpdates={() => setIsSettingsOpen(true)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        terminalTheme={terminalTheme}
        onThemeChange={setTerminalTheme}
        customTheme={customTheme}
        onCustomThemeChange={setCustomTheme}
        terminalFontSize={terminalFontSize}
        onFontSizeChange={setTerminalFontSize}
        terminalScrollback={terminalScrollback}
        onScrollbackChange={setTerminalScrollback}
        isQuakeModeEnabled={isQuakeModeEnabled}
        onQuakeModeChange={setIsQuakeModeEnabled}
        isStayAwakeEnabled={isStayAwakeEnabled}
        onStayAwakeChange={setIsStayAwakeEnabled}
        isGPUAccelerationEnabled={isGPUAccelerationEnabled}
        onGPUAccelerationChange={setIsGPUAccelerationEnabled}
        workspaces={workspaces}
        onDeleteWorkspace={deleteWorkspace}
        history={history}
        onToggleBookmark={toggleBookmark}
        onClearHistory={clearHistory}
        onRunCommand={(cmd) => {
          addTab(undefined, false, cmd);
          setIsSettingsOpen(false);
        }}
        defaultShell={defaultShell}
        onShellChange={setDefaultShell}
        keymap={keymap}
        onUpdateKeybinding={updateKeybinding}
        onResetKeybindings={resetKeybindings}
      />
      {isQuickSwitcherOpen && (
        <QuickSwitcher
          isOpen={isQuickSwitcherOpen}
          onClose={() => setIsQuickSwitcherOpen(false)}
          tabs={tabs}
          projects={projects}
          commands={commands}
          onSelectTab={setActiveTabId}
          onSelectProject={(path) => {
            const p = projects.find((p) => p.path === path);
            addTab(path, false, p?.startupCommand, p?.envVars);
          }}
        />
      )}
      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        initialValue={promptModal.initialValue}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
