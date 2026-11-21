import CollapsibleSection from './CollapsibleSection';
import React from 'react';
import { Project, Tab } from '../../types';
import ProjectItem from '../ProjectItem';
import FileExplorer from '../FileExplorer';

import type { ToastType } from '../../hooks/useToast';

interface Props {
  expandedSections: { projects: boolean; snippets: boolean };
  toggleSection: (section: 'projects' | 'snippets') => void;
  onAddProject: () => void;
  projects: Project[];
  searchQuery: string;
  handleProjectDragOver: (e: React.DragEvent, index: number) => void;
  handleProjectDrop: (e: React.DragEvent, index: number) => void;
  dragOverProjectIndex: number | null;
  onAddTabWithCwd: (cwd: string) => void;
  onRunProjectScript: (cwd: string, scriptName: string) => void;
  setOpenExplorerPath: React.Dispatch<React.SetStateAction<string | null>>;
  openExplorerPath: string | null;
  handleProjectContextMenu: (e: React.MouseEvent, project: Project) => void;
  onReorderProjects: (startIndex: number, endIndex: number) => void;
  handleProjectDragStart: (index: number) => void;
  handleProjectDragEnd: () => void;
  snippets: { id: string; name: string; command: string }[];
  saveSnippets: (newSnippets: { id: string; name: string; command: string }[]) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  tabs: Tab[];
  activeTabId: string;
  onRunCustomCommand: ((cwd: string, command: string) => void) | undefined;
}

export default function ProjectList({
  expandedSections,
  toggleSection,
  onAddProject,
  projects,
  searchQuery,
  handleProjectDragOver,
  handleProjectDrop,
  dragOverProjectIndex,
  onAddTabWithCwd,
  onRunProjectScript,
  setOpenExplorerPath,
  openExplorerPath,
  handleProjectContextMenu,
  onReorderProjects,
  handleProjectDragStart,
  handleProjectDragEnd,
  snippets,
  saveSnippets,
  showToast,
  tabs,
  activeTabId,
  onRunCustomCommand,
}: Props) {
  return (
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
        {(() => {
          const filteredProjects = (Array.isArray(projects) ? projects : []).filter(
            (p) =>
              !searchQuery ||
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.path.toLowerCase().includes(searchQuery.toLowerCase())
          );
          return (
            <div className="project-tree" style={{ padding: '4px 0' }}>
              {(Array.isArray(projects) ? projects : []).map((p, index) => {
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
                      onMoveUp={index > 0 ? () => onReorderProjects(index, index - 1) : undefined}
                      onMoveDown={
                        index < projects.length - 1
                          ? () => onReorderProjects(index, index + 1)
                          : undefined
                      }
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
          );
        })()}
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
          {Array.isArray(snippets) &&
            snippets.map((snippet) => (
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
            <div
              style={{
                padding: '10px',
                color: '#666',
                fontSize: '11px',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              No snippets saved. Click + to add one.
            </div>
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}
