import React, { useState } from 'react';
import { Project, Tab } from '../types';
import ProjectItem from './ProjectItem';
import TaskItem from './TaskItem';

interface SidebarProps {
  width: number;
  onResizeStart: () => void;
  projects: Project[];
  tabs: Tab[];
  activeTabId: string;
  onAddProject: () => void;
  onRemoveProject: (path: string) => void;
  onAddTerminal: (asAdmin: boolean) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string, currentTitle: string) => void;
  onOpenSettings: () => void;
  onAddTabWithCwd: (cwd: string) => void;
}

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

const Sidebar: React.FC<SidebarProps> = ({
  width,
  onResizeStart,
  projects,
  tabs,
  activeTabId,
  onAddProject,
  onRemoveProject,
  onAddTerminal,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onOpenSettings,
  onAddTabWithCwd
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    tasks: true
  });

  const toggleSection = (section: 'projects' | 'tasks') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTabs = tabs.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    window.electron.showContextMenu('project', { path: project.path });
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    window.electron.showContextMenu('tab', { id: tab.id });
  };

  return (
    <div className="sidebar" style={{ width }}>
      <CollapsibleSection 
        title="PROJECT MANAGER" 
        isExpanded={expandedSections.projects} 
        onToggle={() => toggleSection('projects')}
        action={
          <div 
              className="sidebar-action-btn" 
              onClick={(e) => { e.stopPropagation(); onAddProject(); }}
              title="Add Project Folder"
          >
              +
          </div>
        }
      >
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
                <ProjectItem 
                  key={p.path}
                  project={p}
                  searchQuery={searchQuery}
                  onSelect={() => onAddTabWithCwd(p.path)}
                  onRemove={(e) => { e.stopPropagation(); onRemoveProject(p.path); }}
                  onContextMenu={(e) => handleProjectContextMenu(e, p)}
                />
            ))}
            {filteredProjects.length === 0 && (
                <div style={{ padding: '15px', color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                    No projects found.
                </div>
            )}
        </div>
      </CollapsibleSection>

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
                  setIsAddMenuOpen(!isAddMenuOpen);
                }}
                title="New Terminal..."
            >
                +
            </div>
            {isAddMenuOpen && (
              <div 
                className="dropdown-menu"
                onMouseLeave={() => setIsAddMenuOpen(false)}
              >
                <div 
                  className="project-item" 
                  onClick={() => { 
                    onAddTerminal(false); 
                    setIsAddMenuOpen(false);
                  }}
                >
                  <span>New Terminal</span>
                </div>
                <div 
                  className="project-item" 
                  onClick={() => { 
                    onAddTerminal(true);
                    setIsAddMenuOpen(false);
                  }}
                >
                  <span style={{ marginRight: '6px' }}>🛡️</span>
                  <span>Run as Admin...</span>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="task-list">
          {filteredTabs.map(tab => (
              <TaskItem 
                key={tab.id}
                tab={tab}
                isActive={activeTabId === tab.id}
                searchQuery={searchQuery}
                onSelect={() => onSelectTab(tab.id)}
                onClose={(e) => onCloseTab(tab.id, e)}
                onRename={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRenameTab(tab.id, tab.title);
                }}
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
              />
          ))}
        </div>
      </CollapsibleSection>
      
      <div style={{ flex: 1 }}></div>

      <div 
          onClick={onOpenSettings}
          className="sidebar-footer-btn"
      >
          <span style={{ marginRight: '8px', fontSize: '16px' }}>⚙️</span> Settings & Docs
      </div>
    </div>
  );
};

export default Sidebar;