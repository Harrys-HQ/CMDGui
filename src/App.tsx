import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import Sidebar from './components/Sidebar';
import QuickSwitcher from './components/QuickSwitcher';
import { useTabs } from './hooks/useTabs';
import { useProjects } from './hooks/useProjects';
import { useSidebarResizer } from './hooks/useSidebarResizer';
import { loadState, saveState } from './hooks/usePersistence';

const App: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTabId, 
    addTab, 
    closeTab, 
    renameTab, 
    updateTabStatus, 
    clearTabNotifications 
  } = useTabs();
  
  const { projects, addProject, removeProject } = useProjects();
  const { sidebarWidth, startResizing } = useSidebarResizer();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [terminalTheme, setTerminalTheme] = useState(() => loadState('terminalTheme', 'vscode'));
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => saveState('terminalTheme', terminalTheme), [terminalTheme]);

  // Check Admin Status
  useEffect(() => {
    window.electron.checkAdmin().then(setIsAdmin);
  }, []);

  const handleAddTerminal = async (asAdmin: boolean) => {
    if (asAdmin && !isAdmin) {
      if (confirm('To run terminals as Administrator, the Workspace Manager must be restarted with elevated privileges.\n\nRestart now?')) {
        window.electron.relaunchAdmin();
      }
      return;
    }
    addTab(undefined, asAdmin);
  };

  useEffect(() => {
    const cleanup = window.electron.onSidebarContextAction((data: any) => {
      const { action, id, path } = data;
      switch (action) {
        case 'close-tab':
          closeTab(id);
          break;
        case 'rename-tab':
          const tab = tabs.find(t => t.id === id);
          if (tab) {
            const newTitle = prompt('Rename Task:', tab.title);
            if (newTitle) renameTab(id, newTitle);
          }
          break;
        case 'remove-project':
          removeProject(path);
          break;
      }
    });
    return cleanup;
  }, [tabs]);

  const handleRenameTab = (id: string, currentTitle: string) => {
    const newTitle = prompt('Rename Task:', currentTitle);
    if (newTitle) renameTab(id, newTitle);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        addTab();
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const index = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (index + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const index = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = (index - 1 + tabs.length) % tabs.length;
        setActiveTabId(tabs[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    if (activeTabId) {
      clearTabNotifications(activeTabId);
    }
  }, [activeTabId]);

  return (
    <div className="app-root-layout">
      <div className="workspace-layout">
        
        <Sidebar 
          width={sidebarWidth}
          onResizeStart={startResizing}
          projects={projects}
          tabs={tabs}
          activeTabId={activeTabId}
          onAddProject={addProject}
          onRemoveProject={removeProject}
          onAddTerminal={handleAddTerminal}
          onSelectTab={setActiveTabId}
          onCloseTab={(id, e) => { e.stopPropagation(); closeTab(id); }}
          onRenameTab={handleRenameTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAddTabWithCwd={(cwd) => addTab(cwd)}
        />

        <div className="resizer" onMouseDown={startResizing} />

        <div className="main-content">
            <div className="terminal-container">
                {tabs.map(tab => (
                    <div 
                        key={tab.id} 
                        style={{
                            display: activeTabId === tab.id ? 'block' : 'none', 
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0
                        }}
                    >
                        <Terminal 
                            cwd={tab.cwd} 
                            isActive={activeTabId === tab.id}
                            theme={terminalTheme}
                            onNotification={(type) => updateTabStatus(tab.id, type === 'alert' ? { hasAlert: true } : { hasConfirmation: true })}
                            onTitleChange={(t) => {
                                if (tab.isManualTitle) return;
                                let cleanTitle = t;
                                if (cleanTitle.startsWith('Administrator: ')) cleanTitle = cleanTitle.replace('Administrator: ', '');
                                
                                const genericTitles = ['Windows PowerShell', 'powershell.exe', 'pwsh.exe', 'pwsh', 'cmd.exe', 'Command Prompt', 'Terminal'];
                                if (genericTitles.includes(cleanTitle) && tab.title && !genericTitles.includes(tab.title)) return;
                                if (cleanTitle.includes('\\')) cleanTitle = cleanTitle.split('\\').pop() || cleanTitle;
                                if (tab.title !== cleanTitle) updateTabStatus(tab.id, { title: cleanTitle });
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
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        terminalTheme={terminalTheme}
        onThemeChange={setTerminalTheme}
      />

      <QuickSwitcher 
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        tabs={tabs}
        projects={projects}
        onSelectTab={setActiveTabId}
        onSelectProject={(path) => addTab(path)}
      />
    </div>
  );
};

export default App;
