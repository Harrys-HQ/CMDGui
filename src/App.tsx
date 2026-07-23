import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Terminal from './components/Terminal';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import Sidebar from './components/Sidebar';
import ActivityBar, { SidebarView } from './components/ActivityBar';
import TopTabBar from './components/TopTabBar';
import Breadcrumbs from './components/Breadcrumbs';
import QuickSwitcher from './components/QuickSwitcher';
import AiAssistantModal from './components/AiAssistantModal';
import ToastContainer from './components/ToastContainer';
import WelcomeDashboard from './components/WelcomeDashboard';
import { useToast } from './hooks/useToast';
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
    isLoaded: isTabsLoaded,
  } = useTabs();

  const { history, addHistory, toggleBookmark, clearHistory } = useCommandHistory();
  const { projects, addProject, removeProject, reorderProjects, refreshGitStatus, isLoaded: isProjectsLoaded } = useProjects();
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
    uiTheme,
    setUiTheme,
    defaultShell,
    setDefaultShell,
    isAdmin,
    relaunchAdmin,
    showTopTabBar,
    setShowTopTabBar,
    isLoaded: isSettingsLoaded,
  } = useSettings();

  const isAppReady = isTabsLoaded && isProjectsLoaded && isSettingsLoaded;

  const { keymap, updateKeybinding, resetKeybindings } = useKeybindings();

  const { showToast } = useToast();

  // Apply UI Theme
  useEffect(() => {
    document.body.classList.remove(
      'theme-dark',
      'theme-light',
      'theme-amoled',
      'theme-nord',
      'theme-tokyonight',
      'theme-cyberpunk'
    );
    document.body.classList.add(`theme-${uiTheme}`);
  }, [uiTheme]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
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
      // eslint-disable-next-line
      setHibernatedTabs(newHibernated);
      console.log(`[Hibernation] Waking up tab ${activeTabId}`);
    }
  }, [activeTabId, hibernatedTabs]);

  // Synchronize Active Workspace Context with Antigravity CLI / AI Agents
  useEffect(() => {
    if (!window.electron || !window.electron.updateActiveContext) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    let activeProjectCwd: string | undefined = undefined;
    let activeProjectName: string | undefined = undefined;

    if (activeTab && activeTab.panes) {
      const panes = Object.values(activeTab.panes);
      const activePane = panes[0];
      if (activePane && activePane.cwd) {
        activeProjectCwd = activePane.cwd;
        const matchedProject = projects.find((p) => p.path === activePane.cwd);
        if (matchedProject) {
          activeProjectName = matchedProject.name;
        } else {
          const parts = activePane.cwd.split(/[\\/]/);
          activeProjectName = parts[parts.length - 1] || 'Unknown Project';
        }
      }
    }

    window.electron.updateActiveContext({
      activeProjectCwd,
      activeProjectName,
      defaultShell,
      activeTabTitle: activeTab?.title,
      totalTabs: tabs.length,
      projectsCount: projects.length,
    });
  }, [tabs, activeTabId, projects, defaultShell]);

  // Handle CLI launch arguments and single-instance events (AGY CLI integration)
  useEffect(() => {
    if (!window.electron || !window.electron.getLaunchArgs || !window.electron.onSingleInstance) return;

    const processArgv = async (argv: string[], cwd?: string) => {
      const pathArg = argv.find((arg, idx) => {
        if (idx === 0) return false;
        if (arg.startsWith('-')) return false;
        if (arg.endsWith('.exe') || arg.includes('CmdGUI') || arg.includes('cmd-gui')) return false;
        return true;
      });

      if (pathArg) {
        let targetPath = pathArg;
        if (cwd && !pathArg.includes(':') && !pathArg.startsWith('/') && !pathArg.startsWith('\\')) {
          const separator = cwd.includes('/') ? '/' : '\\';
          targetPath = `${cwd}${separator}${pathArg}`;
        }
        targetPath = targetPath.replace(/^"|"$/g, '');

        try {
          const info = await window.electron.getProjectInfo(targetPath);
          if (info) {
            await addProject(targetPath);
            addTab(targetPath);
            showToast(`Opened project: ${targetPath}`, 'info');
          }
        } catch (e) {
          console.error('Failed to open project path from arguments:', e);
        }
      }
    };

    window.electron.getLaunchArgs().then((argv) => {
      processArgv(argv);
    }).catch(err => console.error('Failed to get launch args:', err));

    const cleanup = window.electron.onSingleInstance((argv, cwd) => {
      processArgv(argv, cwd);
    });

    return cleanup;
  }, [addProject, addTab]);

  // AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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
    if (result.success && !result.updateInfo) showToast('You are on the latest version!', 'info');
    else if (!result.success) showToast('Error checking for updates: ' + result.error, 'error');
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
          isGPUAccelerationEnabled={isGPUAccelerationEnabled}
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
    onToggleTheme: () => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark'),
    onSetUiTheme: (theme) => setUiTheme(theme as any),
    onToggleSidebar: () => setIsSidebarVisible(!isSidebarVisible),
    onSetSidebarView: (view) => {
      setActiveSidebarView(view as any);
      setIsSidebarVisible(true);
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
      // Don't intercept shortcuts when the user is typing inside input, textarea, or contentEditable elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

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
      <TitleBar onOpenAiAssistant={() => setIsAiModalOpen(true)} />
      <div className="workspace-layout">
        <ActivityBar
          activeView={activeSidebarView}
          onViewChange={setActiveSidebarView}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <Sidebar
          activeView={activeSidebarView}
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
          onRunCustomCommand={(cwd, command) => {
            const p = cwd ? projects.find((p) => p.path === cwd) : undefined;
            addTab(cwd, false, command, p?.envVars);
          }}
          onReorderTabs={reorderTabs}
          onReorderProjects={reorderProjects}
          onRefreshGitStatus={refreshGitStatus}
          className={!isSidebarVisible ? 'collapsed' : ''}
        />
        <div className={`resizer ${!isSidebarVisible ? 'collapsed' : ''}`} onMouseDown={startResizing} />
        <div className="main-content">
          {showTopTabBar && (
            <TopTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onCloseTab={handleCloseTab}
              onRenameTab={handleRenameTab}
              onReorderTabs={reorderTabs}
              onDuplicateTab={(id) => {
                const target = tabs.find((t) => t.id === id);
                if (target && target.panes) {
                  const firstPane = Object.values(target.panes)[0];
                  addTab(firstPane?.cwd);
                }
              }}
              onCloseOthers={(id) => {
                tabs.forEach((t) => {
                  if (t.id !== id) closeTab(t.id);
                });
              }}
            />
          )}
          {!isAppReady ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)', color: '#888' }}>
              Loading workspace...
            </div>
          ) : tabs.length > 0 ? (
            <>
              <Breadcrumbs
                path={
                  activeTab && activeTab.panes
                    ? activeTab.panes[Object.keys(activeTab.panes)[0]]?.cwd || ''
                    : ''
                }
                onNavigate={(path) => addTab(path)}
              />
              <div className="terminal-container">
                {(Array.isArray(tabs) ? tabs : []).map((tab) => {
                  if (activeTabId !== tab.id) return null;
                  return (
                    <div
                      key={tab.id}
                      style={{
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
                  );
                })}
              </div>
            </>
          ) : (
            <WelcomeDashboard
              onNewTerminal={addTab}
              onOpenProject={addProject}
              recentProjects={projects}
              onSelectProject={(path) => {
                const p = projects.find((p) => p.path === path);
                addTab(path, false, p?.startupCommand, p?.envVars);
              }}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
              onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
            />
          )}
        </div>
      </div>
      <StatusBar
        status="Ready"
        activeTabTitle={activeTab?.title}
        tabCount={tabs.length}
        isUpdateAvailable={isUpdateAvailable}
        onShowUpdates={() => setIsSettingsOpen(true)}
        onToggleQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        uiTheme={uiTheme}
        onUiThemeChange={setUiTheme}
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
        showTopTabBar={showTopTabBar}
        onShowTopTabBarChange={setShowTopTabBar}
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
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onRunCommand={(cmd) => addTab(undefined, false, cmd)}
      />
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
      <ToastContainer />
    </div>
  );
};

export default App;
