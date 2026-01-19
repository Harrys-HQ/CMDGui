import React, { useState, useRef, useEffect } from 'react';
import Terminal from './components/Terminal';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';

interface Tab {
  id: string;
  title: string;
  cwd?: string;
}

interface Project {
  name: string;
  path: string;
  type?: string;
}

const ProjectIcon: React.FC<{ type?: string }> = ({ type }) => {
  switch (type) {
    case 'react': return <span className="project-icon" title="React/Node Project">⚛️</span>;
    case 'python': return <span className="project-icon" title="Python Project">🐍</span>;
    case 'rust': return <span className="project-icon" title="Rust Project">🦀</span>;
    case 'go': return <span className="project-icon" title="Go Project">🐹</span>;
    case 'git': return <span className="project-icon" title="Git Repository">🌿</span>;
    default: return <span className="project-icon">📂</span>;
  }
};

const CollapsibleSection: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children, action }) => {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header" onClick={onToggle}>
        <span style={{ 
          marginRight: '5px', 
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.1s',
          display: 'inline-block',
          fontSize: '10px'
        }}>▶</span>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        {action && <div onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {isExpanded && <div className="sidebar-section-content">{children}</div>}
    </div>
  );
};

const DEFAULT_PROJECTS: Project[] = [
  { name: 'CmdGUI', path: 'C:\\Users\\squal\\OneDrive\\Documents\\App-Dev\\Gemini-Workspace-Manager' },
  { name: 'Game Scraper', path: 'C:\\Users\\squal\\OneDrive\\Documents\\App-Dev\\game-scraper-app' },
  { name: 'Rider Mesh', path: 'C:\\Users\\squal\\OneDrive\\Documents\\App-Dev\\rider-mesh-android' },
  { name: 'Documents', path: 'C:\\Users\\squal\\OneDrive\\Documents' }
];

const loadState = <T,>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved state for " + key, e);
    }
  }
  return defaultVal;
};

const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>(() => loadState('tabs', [{ id: '1', title: 'Home', cwd: undefined }]));
  const [activeTabId, setActiveTabId] = useState<string>(() => loadState('activeTabId', '1'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // UI State
  const [sidebarWidth, setSidebarWidth] = useState(() => loadState('sidebarWidth', 250));
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sidebar Sections State
  const [expandedSections, setExpandedSections] = useState(() => loadState('expandedSections', {
    projects: true,
    tasks: true
  }));

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => loadState('projects', DEFAULT_PROJECTS));
  
  const [isAdmin, setIsAdmin] = useState(false);
  
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
    // If asking for admin and we ARE admin, or asking for normal, just add tab
    // (If we are admin, all new processes spawned are admin by default)
    addTab();
  };

  // Detect Project Types
  useEffect(() => {
    const detectTypes = async () => {
      let changed = false;
      const updatedProjects = await Promise.all(projects.map(async (p) => {
        if (!p.type) {
          const type = await window.electron.getProjectInfo(p.path);
          changed = true;
          return { ...p, type };
        }
        return p;
      }));
      
      if (changed) {
        setProjects(updatedProjects);
      }
    };
    detectTypes();
  }, [projects.length]); // Re-run when projects are added/removed

  // Persistence Effects
  useEffect(() => localStorage.setItem('tabs', JSON.stringify(tabs)), [tabs]);
  useEffect(() => localStorage.setItem('activeTabId', JSON.stringify(activeTabId)), [activeTabId]);
  useEffect(() => localStorage.setItem('sidebarWidth', JSON.stringify(sidebarWidth)), [sidebarWidth]);
  useEffect(() => localStorage.setItem('expandedSections', JSON.stringify(expandedSections)), [expandedSections]);
  useEffect(() => localStorage.setItem('projects', JSON.stringify(projects)), [projects]);

  const toggleSection = (section: 'projects' | 'tasks') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddProject = async () => {
    const folderPath = await window.electron.selectFolder();
    if (folderPath) {
      const name = folderPath.split('\\').pop() || folderPath;
      // Check if already exists
      if (projects.some(p => p.path === folderPath)) return;
      
      const newProjects = [...projects, { name, path: folderPath }];
      setProjects(newProjects);
    }
  };

  const handleRemoveProject = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setProjects(projects.filter(p => p.path !== path));
  };

  const addTab = (cwd?: string) => {
    const id = Date.now().toString();
    const title = cwd ? cwd.split('\\').pop() || 'Terminal' : 'Terminal';
    const newTabs = [...tabs, { id, title, cwd }];
    setTabs(newTabs);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
       // Ensure at least one tab
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

  const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + T: New Tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      // Ctrl + W: Close Active Tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          // Dummy mouse event for closeTab
          closeTab(activeTabId, { stopPropagation: () => {} } as React.MouseEvent);
        }
      }
      // Ctrl + Tab: Next Tab
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const index = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (index + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
      // Ctrl + Shift + Tab: Previous Tab
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

  // Resize Handler
  const startResizing = React.useCallback(() => setIsResizing(true), []);
  
  const stopResizing = React.useCallback(() => setIsResizing(false), []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 150 && newWidth < 600) { // Min/Max constraints
            setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="app-root-layout">
      <div className="workspace-layout">
        
        {/* Sidebar */}
        <div className="sidebar" style={{ width: sidebarWidth }}>
            
            {/* Project Manager Section */}
            <CollapsibleSection 
              title="PROJECT MANAGER" 
              isExpanded={expandedSections.projects} 
              onToggle={() => toggleSection('projects')}
              action={
                <div 
                    className="sidebar-action-btn" 
                    onClick={(e) => { e.stopPropagation(); handleAddProject(); }}
                    title="Add Project Folder"
                >
                    +
                </div>
              }
            >
              {/* Search */}
              <div className="sidebar-search-container">
                  <input 
                      type="text" 
                      className="sidebar-search-input" 
                      placeholder="Search projects..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              
              <div className="project-list">
                  {filteredProjects.map(p => (
                      <div 
                          key={p.path} 
                          onClick={() => addTab(p.path)}
                          className="project-item"
                          title={p.path}
                      >
                          <ProjectIcon type={p.type} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                          <span 
                            onClick={(e) => handleRemoveProject(e, p.path)}
                            className="task-close-btn"
                            title="Remove Project"
                          >×</span>
                      </div>
                  ))}
                  {filteredProjects.length === 0 && (
                      <div style={{ padding: '15px', color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                          No projects found.
                      </div>
                  )}
              </div>
            </CollapsibleSection>

            {/* Active Tasks Section */}
            <CollapsibleSection 
              title="ACTIVE TASKS" 
              isExpanded={expandedSections.tasks} 
              onToggle={() => toggleSection('tasks')}
              action={
                <div style={{ position: 'relative' }}>
                  <div 
                      className="sidebar-action-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Simple custom dropdown logic
                        const menu = document.getElementById('add-terminal-menu');
                        if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                      }}
                      title="New Terminal..."
                  >
                      +
                  </div>
                  {/* Dropdown Menu */}
                  <div 
                    id="add-terminal-menu"
                    style={{
                      display: 'none',
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: '#252526',
                      border: '1px solid #3e3e42',
                      borderRadius: '3px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      minWidth: '160px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseLeave={(e) => { e.currentTarget.style.display = 'none'; }}
                  >
                    <div 
                      className="project-item" 
                      onClick={() => { 
                        handleAddTerminal(false); 
                        const menu = document.getElementById('add-terminal-menu');
                        if(menu) menu.style.display = 'none';
                      }}
                    >
                      <span>New Terminal</span>
                    </div>
                    <div 
                      className="project-item" 
                      onClick={() => { 
                        handleAddTerminal(true);
                        const menu = document.getElementById('add-terminal-menu');
                        if(menu) menu.style.display = 'none';
                      }}
                    >
                      <span style={{ marginRight: '6px' }}>🛡️</span>
                      <span>Run as Admin...</span>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="task-list">
                {tabs.map(tab => (
                    <div 
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`project-item ${activeTabId === tab.id ? 'active-task' : ''}`}
                        title={tab.cwd || 'Terminal'}
                    >
                        <span className="project-icon">💻</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.title}</span>
                        <span 
                            onClick={(e) => closeTab(tab.id, e)}
                            className="task-close-btn"
                            title="Close Terminal"
                        >×</span>
                    </div>
                ))}
              </div>
            </CollapsibleSection>
            
            <div style={{ flex: 1 }}></div>

            {/* Settings Button */}
            <div 
                onClick={() => setIsSettingsOpen(true)}
                className="sidebar-footer-btn"
            >
                <span style={{ marginRight: '8px', fontSize: '16px' }}>⚙️</span> Settings & Docs
            </div>
        </div>

        {/* Resizer */}
        <div 
            className="resizer"
            onMouseDown={startResizing}
        />

        {/* Main Content */}
        <div className="main-content">
            {/* Terminal Content - Tabs are now in sidebar */}
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
                            onTitleChange={(t) => {
                                // Clean up title
                                let cleanTitle = t;
                                if (cleanTitle.startsWith('Administrator: ')) cleanTitle = cleanTitle.replace('Administrator: ', '');
                                if (cleanTitle.includes('\\')) cleanTitle = cleanTitle.split('\\').pop() || cleanTitle;
                                
                                setTabs(prev => prev.map(pt => pt.id === tab.id ? { ...pt, title: cleanTitle } : pt));
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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;