import React, { useState, useEffect } from 'react';
import { Project, Tab } from '../types';
import ProjectItem from './ProjectItem';
import TaskItem from './TaskItem';
import FileExplorer from './FileExplorer';
import { loadState, saveState } from '../hooks/usePersistence';

import { SidebarView } from './ActivityBar';

interface SidebarProps {
  activeView: SidebarView;
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
  className?: string;
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
  activeView,
  width: _width,
  projects,
  tabs,
  activeTabId,
  onAddProject,
  onRemoveProject: _onRemoveProject,
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
  className = '',
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
  const [selectedGitPath, setSelectedGitPath] = useState<string | null>(null);

  const gitProjects = projects.filter((p) => p.gitBranch);

  useEffect(() => {
    if (gitProjects.length > 0 && !selectedGitPath) {
      setSelectedGitPath(gitProjects[0].path);
    }
  }, [gitProjects, selectedGitPath]);

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
    <div className={`sidebar ${className}`} style={{ width: 'var(--sidebar-width)' }} onClick={onRefreshGitStatus}>
      <div className="sidebar-content">
        {activeView === 'explorer' && (
          <>
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
                    style={{
                      padding: '15px',
                      color: '#666',
                      fontSize: '12px',
                      fontStyle: 'italic',
                    }}
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
          </>
        )}

        {activeView === 'git' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-section-header" style={{ cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>SOURCE CONTROL</span>
            </div>
            
            {gitProjects.length > 0 ? (
              <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {gitProjects.length > 1 && (
                  <select
                    value={selectedGitPath || ''}
                    onChange={(e) => setSelectedGitPath(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#2d2d2d',
                      color: '#cccccc',
                      border: '1px solid #444',
                      padding: '6px',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  >
                    {gitProjects.map((p) => (
                      <option key={p.path} value={p.path}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

                {(() => {
                  const activeProj = gitProjects.find((p) => p.path === selectedGitPath);
                  if (!activeProj) return null;
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#0dbc79' }}>ᚠ</span>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>{activeProj.gitBranch}</span>
                        {activeProj.gitDirty && <span style={{ color: 'var(--accent-primary)', fontSize: '10px', marginLeft: 'auto' }}>● Modified</span>}
                      </div>

                      <div style={{ fontWeight: 'bold', color: '#888', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Changes ({activeProj.gitFiles?.length || 0})
                      </div>

                      {activeProj.gitFiles && activeProj.gitFiles.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                          {activeProj.gitFiles.map((fileLine, idx) => {
                            const status = fileLine.substring(0, 2).trim();
                            const fileName = fileLine.substring(2).trim();
                            
                            let color = '#ccc';
                            let indicator = status;
                            if (status === 'M' || status.includes('M')) { color = '#e5c07b'; indicator = 'Modified'; }
                            else if (status === 'A' || status.includes('A')) { color = '#98c379'; indicator = 'Added'; }
                            else if (status === 'D' || status.includes('D')) { color = '#e06c75'; indicator = 'Deleted'; }
                            else if (status === '??') { color = '#5c6370'; indicator = 'Untracked'; }
                            
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#d4d4d4', maxWidth: '170px' }} title={fileName}>
                                  {fileName}
                                </span>
                                <span style={{ color, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  {indicator}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ color: '#666', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                          No changes detected. Working tree clean.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>🌿</div>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>No Git Repositories</div>
                <div style={{ fontSize: '11px' }}>
                  Add a Git-tracked folder to the Project Manager to view details here.
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'settings' && (
          <div style={{ padding: '0' }}>
            <div className="sidebar-section-header" style={{ cursor: 'default' }}>
              <span style={{ fontWeight: 'bold' }}>SETTINGS & CONFIGURATION</span>
            </div>
            <div
              className="project-item"
              onClick={onOpenSettings}
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <span style={{ marginRight: '8px' }}>⚙️</span> Open Full Settings
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default Sidebar;
