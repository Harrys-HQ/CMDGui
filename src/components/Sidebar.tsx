import React, { useState, useEffect } from 'react';
import { Project, Tab } from '../types';
import ProjectItem from './ProjectItem';
import TaskItem from './TaskItem';
import FileExplorer from './FileExplorer';
import { loadState, saveState } from '../hooks/usePersistence';

interface SidebarProps {
  width: number;
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
  onRunProjectScript: (cwd: string, scriptName: string) => void;
  onReorderTabs: (startIndex: number, endIndex: number) => void;
  onReorderProjects: (startIndex: number, endIndex: number) => void;
  onRefreshGitStatus?: () => void;
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
        <span
          style={{
            marginRight: '5px',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.1s',
            display: 'inline-block',
            fontSize: '10px',
          }}
        >
          ▶
        </span>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        {action && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
            {action}
          </div>
        )}
      </div>
      {isExpanded && <div className="sidebar-section-content">{children}</div>}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  width,
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
  onAddTabWithCwd,
  onRunProjectScript,
  onReorderTabs,
  onReorderProjects,
  onRefreshGitStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState<number | null>(null);
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    tasks: true,
  });
  const [openExplorerPath, setOpenExplorerPath] = useState<string | null>(null);

  useEffect(() => {
    const loadExpandedState = async () => {
      const savedState = await loadState<{ projects: boolean; tasks: boolean }>(
        'sidebarExpandedSections',
        { projects: true, tasks: true }
      );
      if (savedState) {
        setExpandedSections(savedState);
      }
    };
    loadExpandedState();
  }, []);

  const toggleSection = (section: 'projects' | 'tasks') => {
    setExpandedSections((prev) => {
      const newState = { ...prev, [section]: !prev[section] };
      saveState('sidebarExpandedSections', newState);
      return newState;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedTabIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex === null || draggedTabIndex === index) return;
    setDragOverTabIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== index) {
      onReorderTabs(draggedTabIndex, index);
    }
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  const handleProjectDragStart = (index: number) => {
    setDraggedProjectIndex(index);
  };

  const handleProjectDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedProjectIndex === null || draggedProjectIndex === index) return;
    setDragOverProjectIndex(index);
  };

  const handleProjectDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedProjectIndex !== null && draggedProjectIndex !== index) {
      onReorderProjects(draggedProjectIndex, index);
    }
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const handleProjectDragEnd = () => {
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="sidebar" style={{ width }} onClick={onRefreshGitStatus}>
      <div className="sidebar-content">
        <CollapsibleSection
          title="PROJECT MANAGER"
          isExpanded={expandedSections.projects}
          onToggle={() => toggleSection('projects')}
          action={
            <div
              className="sidebar-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddProject();
              }}
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
            {projects.map((p, index) => {
              // Only show filtered projects if searching, otherwise show all for reordering
              if (
                searchQuery &&
                !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !p.path.toLowerCase().includes(searchQuery.toLowerCase())
              ) {
                return null;
              }

              return (
                <div
                  key={p.path}
                  onDragOver={(e) => handleProjectDragOver(e, index)}
                  onDrop={(e) => handleProjectDrop(e, index)}
                  className={dragOverProjectIndex === index ? 'drag-over-indicator' : ''}
                >
                  <ProjectItem
                    project={p}
                    searchQuery={searchQuery}
                    onSelect={() => onAddTabWithCwd(p.path)}
                    onRunScript={(scriptName) => onRunProjectScript(p.path, scriptName)}
                    onToggleExplorer={() =>
                      setOpenExplorerPath(openExplorerPath === p.path ? null : p.path)
                    }
                    isExplorerOpen={openExplorerPath === p.path}
                    onRemove={(e) => {
                      e.stopPropagation();
                      onRemoveProject(p.path);
                    }}
                    onContextMenu={(e) => handleProjectContextMenu(e, p)}
                    onDragStart={() => handleProjectDragStart(index)}
                    onDragEnd={handleProjectDragEnd}
                  />
                  {openExplorerPath === p.path && (
                    <FileExplorer
                      rootPath={p.path}
                      onSelectFolder={(path) => onAddTabWithCwd(path)}
                    />
                  )}
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div
                style={{ padding: '15px', color: '#666', fontSize: '12px', fontStyle: 'italic' }}
              >
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
                <div className="dropdown-menu" onMouseLeave={() => setIsAddMenuOpen(false)}>
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
            {tabs.map((tab, index) => {
              // Only show filtered tabs if searching, otherwise show all for reordering
              if (searchQuery && !tab.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return null;
              }

              return (
                <div
                  key={tab.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={dragOverTabIndex === index ? 'drag-over-indicator' : ''}
                >
                  <TaskItem
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
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      </div>

      <div onClick={onOpenSettings} className="sidebar-footer-btn">
        <span style={{ marginRight: '8px', fontSize: '16px' }}>⚙️</span> Settings & Docs
      </div>
    </div>
  );
};

export default Sidebar;
