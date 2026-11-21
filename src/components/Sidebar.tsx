import { useProjectList } from './sidebar/useProjectList';
import { usePortManager } from './sidebar/usePortManager';
import { useGitManager } from './sidebar/useGitManager';
import PortManager from './sidebar/PortManager';
import GitManager from './sidebar/GitManager';
import ProjectList from './sidebar/ProjectList';
import React, { useState } from 'react';
import { Project, Tab } from '../types';
import { useToast } from '../hooks/useToast';
import { Search } from 'lucide-react';

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

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  width: _width,
  projects,
  tabs,
  activeTabId,
  onAddProject,
  onRemoveProject: _onRemoveProject,
  onAddTerminal: _onAddTerminal,
  onSelectTab: _onSelectTab,
  onCloseTab: _onCloseTab,
  onRenameTab: _onRenameTab,
  onOpenSettings: _onOpenSettings,
  onAddTabWithCwd,
  onRunProjectScript,
  onRunCustomCommand,
  onReorderTabs: _onReorderTabs,
  onReorderProjects,
  onRefreshGitStatus,
  className = '',
}) => {
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);
  const { showToast } = useToast();
  const {
    gitProjects,
    selectedGitPath,
    setSelectedGitPath,
    commitMessage,
    setCommitMessage,
    isPending,
    setIsPending,
  } = useGitManager(projects);
  const {
    ports,
    isRefreshingPorts,
    portSearchQuery,
    setPortSearchQuery,
    expandedPorts,
    setExpandedPorts,
    hideSystemPorts,
    setHideSystemPorts,
    refreshPorts,
  } = usePortManager(activeView);
  const {
    searchQuery,
    setSearchQuery,
    expandedSections,
    toggleSection,
    openExplorerPath,
    setOpenExplorerPath,
    snippets,
    saveSnippets,
    dragOverProjectIndex,
    handleProjectDragOver,
    handleProjectDrop,
    handleProjectDragStart,
    handleProjectDragEnd,
    handleProjectContextMenu,
  } = useProjectList(onReorderProjects);
  return (
    <div
      className={`sidebar ${className} ${isExternalDragOver ? 'drag-over-active' : ''}`}
      style={{ width: 'var(--sidebar-width)' }}
      onClick={onRefreshGitStatus}
      onDragOver={(e) => {
        if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!isExternalDragOver) setIsExternalDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsExternalDragOver(false);
      }}
      onDrop={() => {
        setIsExternalDragOver(false);
      }}
    >
      {activeView === 'explorer' && (
        <div className="sidebar-search-container">
          <Search size={14} style={{ color: 'var(--fg-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Filter projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}
      <div className="sidebar-content">
        {activeView === 'explorer' && (
          <ProjectList
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            onAddProject={onAddProject}
            projects={projects}
            searchQuery={searchQuery}
            handleProjectDragOver={handleProjectDragOver}
            handleProjectDrop={handleProjectDrop}
            dragOverProjectIndex={dragOverProjectIndex}
            onAddTabWithCwd={onAddTabWithCwd}
            onRunProjectScript={onRunProjectScript}
            setOpenExplorerPath={setOpenExplorerPath}
            openExplorerPath={openExplorerPath}
            handleProjectContextMenu={handleProjectContextMenu}
            onReorderProjects={onReorderProjects}
            handleProjectDragStart={handleProjectDragStart}
            handleProjectDragEnd={handleProjectDragEnd}
            snippets={snippets}
            saveSnippets={saveSnippets}
            showToast={showToast}
            tabs={tabs}
            activeTabId={activeTabId}
            onRunCustomCommand={onRunCustomCommand}
          />
        )}

        {activeView === 'git' && (
          <GitManager
            onRefreshGitStatus={onRefreshGitStatus}
            gitProjects={gitProjects}
            selectedGitPath={selectedGitPath}
            setSelectedGitPath={setSelectedGitPath}
            isPending={isPending}
            setIsPending={setIsPending}
            showToast={showToast}
            commitMessage={commitMessage}
            setCommitMessage={setCommitMessage}
          />
        )}

        {activeView === 'ports' && (
          <PortManager
            isRefreshingPorts={isRefreshingPorts}
            refreshPorts={refreshPorts}
            portSearchQuery={portSearchQuery}
            setPortSearchQuery={setPortSearchQuery}
            hideSystemPorts={hideSystemPorts}
            setHideSystemPorts={setHideSystemPorts}
            ports={ports}
            showToast={showToast}
            setExpandedPorts={setExpandedPorts}
            expandedPorts={expandedPorts}
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
