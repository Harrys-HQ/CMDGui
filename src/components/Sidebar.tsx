import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Tab } from '../types';
import ProjectItem from './ProjectItem';
import TaskItem from './TaskItem';
import FileExplorer from './FileExplorer';
import { loadState, saveState } from '../hooks/usePersistence';
import { useToast } from '../hooks/useToast';

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
  onRunCustomCommand?: (cwd: string, command: string) => void;
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
  onRunCustomCommand,
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
    snippets: true,
  });
  const [openExplorerPath, setOpenExplorerPath] = useState<string | null>(null);
  const [selectedGitPath, setSelectedGitPath] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  const [ports, setPorts] = useState<any[]>([]);
  const [isRefreshingPorts, setIsRefreshingPorts] = useState(false);
  const [portSearchQuery, setPortSearchQuery] = useState('');

  const [snippets, setSnippets] = useState<{ id: string; name: string; command: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadSnippets = async () => {
      const saved = await loadState<{ id: string; name: string; command: string }[]>('commandSnippets', [
        { id: '1', name: 'Clean Install', command: 'npm ci' },
        { id: '2', name: 'Format Code', command: 'npm run format' },
        { id: '3', name: 'Git Status', command: 'git status' },
      ]);
      if (mounted) {
        setSnippets(saved || []);
      }
    };
    loadSnippets();
    return () => {
      mounted = false;
    };
  }, []);

  const saveSnippets = (newSnippets: { id: string; name: string; command: string }[]) => {
    setSnippets(newSnippets);
    saveState('commandSnippets', newSnippets);
  };

  const isComponentMounted = useRef(true);
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  const refreshPorts = useCallback(async () => {
    if (!window.electron) return;
    setIsRefreshingPorts(true);
    try {
      const list = await window.electron.getActivePorts();
      if (isComponentMounted.current) {
        setPorts(list);
      }
    } catch (e) {
      console.error('Failed to get active ports:', e);
    } finally {
      if (isComponentMounted.current) {
        setIsRefreshingPorts(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeView === 'ports') {
      refreshPorts();
      const interval = setInterval(() => {
        refreshPorts();
      }, 5000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeView, refreshPorts]);

  const gitProjects = projects.filter((p) => p.gitBranch);

  useEffect(() => {
    if (gitProjects.length > 0 && !selectedGitPath) {
      setSelectedGitPath(gitProjects[0].path);
    }
  }, [gitProjects, selectedGitPath]);

  useEffect(() => {
    const loadExpandedState = async () => {
      const savedState = await loadState<{ projects: boolean; tasks: boolean; snippets: boolean }>(
        'sidebarExpandedSections',
        { projects: true, tasks: true, snippets: true }
      );
      if (savedState) {
        setExpandedSections(savedState);
      }
    };
    loadExpandedState();
  }, []);

  const toggleSection = (section: 'projects' | 'tasks' | 'snippets') => {
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

            <CollapsibleSection
              title="COMMAND SNIPPETS"
              isExpanded={expandedSections.snippets}
              onToggle={() => toggleSection('snippets')}
              action={
                <div
                  className="sidebar-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = prompt('Enter snippet name:');
                    if (!name) return;
                    const command = prompt('Enter command to run:');
                    if (!command) return;
                    const newSnippets = [...snippets, { id: Date.now().toString(), name, command }];
                    saveSnippets(newSnippets);
                    showToast('Snippet added!', 'success');
                  }}
                  title="Add New Snippet"
                >
                  +
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px' }}>
                {snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="project-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.02)',
                      cursor: 'default',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        flex: 1,
                      }}
                      onClick={() => {
                        const activeTab = tabs.find((t) => t.id === activeTabId);
                        let targetCwd = undefined;
                        if (activeTab && activeTab.panes) {
                          const panesList = Object.values(activeTab.panes);
                          if (panesList.length > 0) {
                            targetCwd = panesList[0].cwd;
                          }
                        }
                        if (onRunCustomCommand) {
                          onRunCustomCommand(targetCwd || '', snippet.command);
                          showToast(`Running "${snippet.name}"...`, 'info');
                        }
                      }}
                      title={`Click to run: ${snippet.command}`}
                    >
                      <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#fff' }}>
                        {snippet.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#888',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {snippet.command}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const newCmd = prompt('Edit command:', snippet.command);
                          if (newCmd !== null) {
                            const newSnippets = snippets.map((s) =>
                              s.id === snippet.id ? { ...s, command: newCmd } : s
                            );
                            saveSnippets(newSnippets);
                            showToast('Snippet updated!', 'success');
                          }
                        }}
                        style={{ fontSize: '10px', cursor: 'pointer', opacity: 0.6 }}
                        title="Edit Snippet"
                      >
                        ✏️
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete snippet "${snippet.name}"?`)) {
                            const newSnippets = snippets.filter((s) => s.id !== snippet.id);
                            saveSnippets(newSnippets);
                            showToast('Snippet deleted!', 'success');
                          }
                        }}
                        style={{ fontSize: '10px', cursor: 'pointer', opacity: 0.6 }}
                        title="Delete Snippet"
                      >
                        ❌
                      </span>
                    </div>
                  </div>
                ))}
                {snippets.length === 0 && (
                  <div style={{ padding: '10px', color: '#666', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                    No snippets saved. Click + to add one.
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </>
        )}

        {activeView === 'git' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-section-header" style={{ cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>SOURCE CONTROL</span>
              <div
                className="sidebar-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRefreshGitStatus) onRefreshGitStatus();
                }}
                title="Refresh Git Status"
              >
                🔄
              </div>
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

                      {/* Git Action Toolbar */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        <button
                          disabled={isPending}
                          onClick={async () => {
                            if (!window.electron || !activeProj.path) return;
                            setIsPending(true);
                            try {
                              const res = await window.electron.gitPull(activeProj.path);
                              showToast('Pull: ' + res, 'success');
                              if (onRefreshGitStatus) onRefreshGitStatus();
                            } catch (e) {
                              showToast('Pull failed: ' + String(e), 'error');
                            } finally {
                              setIsPending(false);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: '#ccc',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Pull from Remote"
                        >
                          ⬇️ Pull
                        </button>
                        <button
                          disabled={isPending}
                          onClick={async () => {
                            if (!window.electron || !activeProj.path) return;
                            setIsPending(true);
                            try {
                              const res = await window.electron.gitPush(activeProj.path);
                              showToast('Push: ' + res, 'success');
                              if (onRefreshGitStatus) onRefreshGitStatus();
                            } catch (e) {
                              showToast('Push failed: ' + String(e), 'error');
                            } finally {
                              setIsPending(false);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: '#ccc',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Push to Remote"
                        >
                          ⬆️ Push
                        </button>
                        <button
                          disabled={isPending || !activeProj.gitDirty}
                          onClick={async () => {
                            if (!window.electron || !activeProj.path) return;
                            setIsPending(true);
                            try {
                              const res = await window.electron.gitStageAll(activeProj.path);
                              showToast(res, 'success');
                              if (onRefreshGitStatus) onRefreshGitStatus();
                            } catch (e) {
                              showToast('Staging failed: ' + String(e), 'error');
                            } finally {
                              setIsPending(false);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: activeProj.gitDirty ? '#ccc' : '#666',
                            fontSize: '11px',
                            cursor: activeProj.gitDirty ? 'pointer' : 'not-allowed',
                          }}
                          title="Stage All Changes"
                        >
                          ➕ Stage
                        </button>
                      </div>

                      {/* Commit Section */}
                      {activeProj.gitDirty && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid #333' }}>
                          <input
                            type="text"
                            placeholder="Commit message..."
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            disabled={isPending}
                            style={{
                              background: '#1e1e1e',
                              color: '#fff',
                              border: '1px solid #444',
                              padding: '6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              outline: 'none',
                            }}
                          />
                          <button
                            disabled={isPending || !commitMessage.trim()}
                            onClick={async () => {
                              if (!window.electron || !activeProj.path) return;
                              setIsPending(true);
                              try {
                                const res = await window.electron.gitCommit(activeProj.path, commitMessage);
                                showToast('Committed: ' + res, 'success');
                                setCommitMessage('');
                                if (onRefreshGitStatus) onRefreshGitStatus();
                              } catch (e) {
                                showToast('Commit failed: ' + String(e), 'error');
                              } finally {
                                setIsPending(false);
                              }
                            }}
                            style={{
                              padding: '6px 8px',
                              background: 'var(--accent-primary, #007acc)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
                              opacity: commitMessage.trim() ? 1 : 0.5,
                            }}
                          >
                            Commit Changes
                          </button>
                        </div>
                      )}

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

        {activeView === 'ports' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-section-header" style={{ cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>ACTIVE PORTS</span>
              <div
                className={`sidebar-action-btn ${isRefreshingPorts ? 'spinning' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  refreshPorts();
                }}
                title="Refresh Active Ports"
              >
                🔄
              </div>
            </div>

            <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="sidebar-search-container" style={{ margin: '0 0 10px 0', padding: 0 }}>
                <input
                  type="text"
                  className="sidebar-search-input"
                  placeholder="Filter ports/processes..."
                  value={portSearchQuery}
                  onChange={(e) => setPortSearchQuery(e.target.value)}
                />
              </div>

              {ports.length > 0 ? (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {ports
                    .filter((p) => {
                      const q = portSearchQuery.toLowerCase();
                      return (
                        p.port.toString().includes(q) ||
                        p.processName.toLowerCase().includes(q) ||
                        p.pid.toString().includes(q)
                      );
                    })
                    .map((p) => (
                      <div
                        key={p.port}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--accent-primary, #007acc)', fontWeight: 'bold', fontSize: '12px' }}>
                              :{p.port}
                            </span>
                            <span style={{ color: '#888', fontSize: '10px' }}>
                              PID: {p.pid}
                            </span>
                          </div>
                          <span
                            style={{
                              color: '#d4d4d4',
                              fontSize: '11px',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                            title={p.processName}
                          >
                            {p.processName}
                          </span>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.electron) return;
                            if (window.confirm(`Are you sure you want to terminate ${p.processName} (PID: ${p.pid}) on port ${p.port}?`)) {
                              try {
                                const res = await window.electron.killProcessByPid(p.pid);
                                showToast(res, 'success');
                                refreshPorts();
                              } catch (err) {
                                showToast(`Failed to kill process: ${err}`, 'error');
                              }
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#3c1a1a',
                            border: '1px solid #6c2a2a',
                            borderRadius: '3px',
                            color: '#ff6b6b',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                          title="Kill Process"
                        >
                          🛑 Kill
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ color: '#666', fontStyle: 'italic', padding: '20px 0', textAlign: 'center', fontSize: '12px' }}>
                  No active local ports detected.
                </div>
              )}
            </div>
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
