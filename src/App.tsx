import React, { useState, useEffect, useCallback } from 'react';
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
import { cleanTerminalTitle } from './utils/terminalUtils';
import { Tab, PaneLayout } from './types';

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
  const { projects, addProject, removeProject, reorderProjects } = useProjects();
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
    defaultShell,
    setDefaultShell,
    isAdmin,
    relaunchAdmin,
  } = useSettings();

  const { keymap, updateKeybinding, resetKeybindings } = useKeybindings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  const terminalRefs = React.useRef<{ [key: string]: { clear: () => void } | null }>({});

  const handleCheckUpdates = async () => {
    const result = await window.electron.checkForUpdates();
    if (result.success) {
      if (!result.updateInfo) {
        alert('You are on the latest version!');
      }
    } else {
      alert('Error checking for updates: ' + result.error);
    }
  };

  const handleCloseTab = useCallback((id: string) => {
    closeTab(id);
    if (terminalRefs.current[id]) {
      delete terminalRefs.current[id];
    }
  }, [closeTab]);

  const { commands } = useCommands({
    onAddTerminal: (admin) => handleAddTerminal(admin),
    onCloseTab: (id) => handleCloseTab(id),
    onRenameTab: (id) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab) handleRenameTab(id, tab.title);
    },
    onClearTerminal: () => {
      if (activeTabId && terminalRefs.current[activeTabId]) {
        terminalRefs.current[activeTabId]?.clear();
      }
    },
    onOpenSettings: () => setIsSettingsOpen(true),
    onCheckUpdates: handleCheckUpdates,
    onToggleTheme: () => {
      const themes = ['vscode', 'monokai', 'solarized-dark', 'one-dark'];
      const currentIndex = themes.indexOf(terminalTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setTerminalTheme(themes[nextIndex]);
    },
    onSaveWorkspace: saveWorkspace,
    onLoadWorkspace: loadWorkspace,
    workspaces,
    activeTabId,
    keymap,
  });

  useEffect(() => {
    const cleanup = window.electron.onUpdateStatus((data) => {
      if (data.status === 'available') {
        setIsUpdateAvailable(true);
      } else if (data.status === 'downloaded') {
        setIsUpdateAvailable(true);
      } else if (data.status === 'not-available') {
        setIsUpdateAvailable(false);
      }
    });
    return cleanup;
  }, []);

  const handleAddTerminal = async (asAdmin: boolean) => {
    if (asAdmin && !isAdmin) {
      if (
        confirm(
          'To run terminals as Administrator, the Workspace Manager must be restarted with elevated privileges.\n\nRestart now?'
        )
      ) {
        relaunchAdmin();
      }
      return;
    }
    addTab(undefined, asAdmin);
  };

  // Refs for stable access in event listener
  const tabsRef = React.useRef(tabs);
  const activeTabIdRef = React.useRef(activeTabId);
  const addTabRef = React.useRef(addTab);
  const closeTabRef = React.useRef(handleCloseTab);
  const setActiveTabIdRef = React.useRef(setActiveTabId);
  const renameTabRef = React.useRef(renameTab);
  const removeProjectRef = React.useRef(removeProject);
  const keymapRef = React.useRef(keymap);

  useEffect(() => {
    tabsRef.current = tabs;
    activeTabIdRef.current = activeTabId;
    addTabRef.current = addTab;
    closeTabRef.current = handleCloseTab;
    setActiveTabIdRef.current = setActiveTabId;
    renameTabRef.current = renameTab;
    removeProjectRef.current = removeProject;
    keymapRef.current = keymap;
  });

  useEffect(() => {
    const cleanup = window.electron.onSidebarContextAction((data) => {
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
    return cleanup;
  }, []);

  const handleRenameTab = (id: string, currentTitle: string) => {
    const newTitle = prompt('Rename Task:', currentTitle);
    if (newTitle) renameTab(id, newTitle);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette
      if (isKeyMatch(e, keymapRef.current.commandPalette)) {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      
      // New Tab
      if (isKeyMatch(e, keymapRef.current.newTab)) {
        e.preventDefault();
        addTabRef.current();
      }

      // Close Tab
      if (isKeyMatch(e, keymapRef.current.closeTab)) {
        e.preventDefault();
        if (activeTabIdRef.current) closeTabRef.current(activeTabIdRef.current);
      }

      // Next Tab
      if (isKeyMatch(e, keymapRef.current.nextTab)) {
        e.preventDefault();
        const tabs = tabsRef.current;
        const activeTabId = activeTabIdRef.current;
        const index = tabs.findIndex((t) => t.id === activeTabId);
        const nextIndex = (index + 1) % tabs.length;
        setActiveTabIdRef.current(tabs[nextIndex].id);
      }

      // Prev Tab
      if (isKeyMatch(e, keymapRef.current.prevTab)) {
        e.preventDefault();
        const tabs = tabsRef.current;
        const activeTabId = activeTabIdRef.current;
        const index = tabs.findIndex((t) => t.id === activeTabId);
        const prevIndex = (index - 1 + tabs.length) % tabs.length;
        setActiveTabIdRef.current(tabs[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Run once

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (activeTabId) {
      clearTabNotifications(activeTabId);
    }
  }, [activeTabId, clearTabNotifications]);

  const renderLayout = (tab: Tab, layout: PaneLayout): React.ReactNode => {
    if (layout.type === 'terminal') {
      const pane = tab.panes[layout.paneId!];
      if (!pane) return null;

      return (
        <Terminal
          key={pane.id}
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
          onNotification={(type) =>
            updateTabStatus(
              tab.id,
              type === 'alert' ? { hasAlert: true } : { hasConfirmation: true }
            )
          }
          onTitleChange={(t) => {
            const newTitle = cleanTerminalTitle(t, tab.title, tab.isManualTitle);
            if (newTitle) updateTabStatus(tab.id, { title: newTitle });
          }}
          onClear={(clearFn) => {
            terminalRefs.current[pane.id] = { clear: clearFn };
          }}
          onSplitHorizontal={() => splitPane(tab.id, pane.id, 'horizontal')}
          onSplitVertical={() => splitPane(tab.id, pane.id, 'vertical')}
          onClosePane={() => closePane(tab.id, pane.id)}
          showPaneControls={true}
        />
      );
    }

    if (layout.type === 'split') {
      const isHorizontal = layout.splitDirection === 'horizontal';
      if (!layout.children) return null;
      
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: isHorizontal ? 'column' : 'row',
            width: '100%',
            height: '100%',
            gap: '2px',
            background: '#333',
          }}
        >
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {renderLayout(tab, layout.children[0])}
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {renderLayout(tab, layout.children[1])}
          </div>
        </div>
      );
    }
    return null;
  };

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
            const project = projects.find(p => p.path === cwd);
            addTab(cwd, false, project?.startupCommand, project?.envVars);
          }}
          onRunProjectScript={(cwd, scriptName) => {
            const project = projects.find(p => p.path === cwd);
            addTab(cwd, false, `npm run ${scriptName}`, project?.envVars);
          }}
          onReorderTabs={reorderTabs}
          onReorderProjects={reorderProjects}
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
            const project = projects.find(p => p.path === path);
            addTab(path, false, project?.startupCommand, project?.envVars);
          }}
        />
      )}
    </div>
  );
};

export default App;
