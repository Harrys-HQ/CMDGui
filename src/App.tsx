import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import Sidebar from './components/Sidebar';
import QuickSwitcher from './components/QuickSwitcher';
import { useTabs } from './hooks/useTabs';
import { useProjects } from './hooks/useProjects';
import { useSidebarResizer } from './hooks/useSidebarResizer';
import { useSettings } from './hooks/useSettings';
import { cleanTerminalTitle } from './utils/terminalUtils';

const App: React.FC = () => {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    updateTabStatus,
    clearTabNotifications,
  } = useTabs();

  const { projects, addProject, removeProject } = useProjects();
  const { sidebarWidth, startResizing } = useSidebarResizer();
  const {
    terminalTheme,
    setTerminalTheme,
    terminalFontSize,
    setTerminalFontSize,
    isAdmin,
    relaunchAdmin,
  } = useSettings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

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
  const closeTabRef = React.useRef(closeTab);
  const renameTabRef = React.useRef(renameTab);
  const removeProjectRef = React.useRef(removeProject);

  useEffect(() => {
    tabsRef.current = tabs;
    closeTabRef.current = closeTab;
    renameTabRef.current = renameTab;
    removeProjectRef.current = removeProject;
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
      // Quick Switcher: Ctrl + Shift + P (VS Code style) to avoid conflict with Ctrl + P (Previous Line)
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      
      // New Tab: Ctrl + Shift + N (Avoids Ctrl + N - Next Line)
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        addTab();
      }

      // Close Tab: Ctrl + Shift + W (Avoids Ctrl + W - Delete Word)
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }

      // Tab Switching: Ctrl + Tab / Ctrl + Shift + Tab
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const index = tabs.findIndex((t) => t.id === activeTabId);
        const nextIndex = (index + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const index = tabs.findIndex((t) => t.id === activeTabId);
        const prevIndex = (index - 1 + tabs.length) % tabs.length;
        setActiveTabId(tabs[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, closeTab, setActiveTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (activeTabId) {
      clearTabNotifications(activeTabId);
    }
  }, [activeTabId, clearTabNotifications]);

  return (
    <div className="app-root-layout">
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
            closeTab(id);
          }}
          onRenameTab={handleRenameTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAddTabWithCwd={(cwd) => addTab(cwd)}
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
                <Terminal
                  cwd={tab.cwd}
                  isActive={activeTabId === tab.id}
                  theme={terminalTheme}
                  fontSize={terminalFontSize}
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
                />
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
        terminalFontSize={terminalFontSize}
        onFontSizeChange={setTerminalFontSize}
      />

      {isQuickSwitcherOpen && (
        <QuickSwitcher
          isOpen={isQuickSwitcherOpen}
          onClose={() => setIsQuickSwitcherOpen(false)}
          tabs={tabs}
          projects={projects}
          onSelectTab={setActiveTabId}
          onSelectProject={(path) => addTab(path)}
        />
      )}
    </div>
  );
};

export default App;
