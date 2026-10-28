/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Project } from '../types';
import TechIcon from './TechIcon';
import { ChevronUp, ChevronDown, FolderTree, Zap, GitBranch } from 'lucide-react';

interface ProjectItemProps {
  project: Project;
  searchQuery: string;
  onSelect: () => void;
  onRunScript?: (scriptName: string) => void;
  onToggleExplorer?: () => void;
  isExplorerOpen?: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onMoveUp?: (e: React.MouseEvent) => void;
  onMoveDown?: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const getHighlightedText = (text: string, highlight: string) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const parts = text.split(
    new RegExp(`(${highlight.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  );
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="highlight-match">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

const ProjectItem: React.FC<ProjectItemProps> = React.memo(
  ({
    project,
    searchQuery,
    onSelect,
    onRunScript,
    onToggleExplorer,
    isExplorerOpen,
    onContextMenu,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDragEnd,
  }) => {
    const [isScriptMenuOpen, setIsScriptMenuOpen] = useState(false);

    const toggleScriptMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsScriptMenuOpen(!isScriptMenuOpen);
    };

    const handleToggleExplorer = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleExplorer) onToggleExplorer();
    };

    const favoriteScripts = ['dev', 'start', 'build', 'test', 'watch', 'serve'];
    const availableFavorites =
      project.scripts && typeof project.scripts === 'object'
        ? Object.keys(project.scripts).filter((s) => favoriteScripts.includes(s.toLowerCase()))
        : [];

    return (
      <div
        onClick={onSelect}
        onContextMenu={onContextMenu}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', project.path);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="project-item"
        title={project.path}
        style={{
          position: 'relative',
          borderLeft: isExplorerOpen ? '2px solid var(--accent-primary)' : 'none',
          height: 'auto',
          minHeight: '32px',
          paddingTop: '8px',
          paddingBottom: '8px',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
            <TechIcon type={project.type} size={15} />
          </span>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 500 }}>
              {getHighlightedText(project.name, searchQuery)}
            </span>
            {project.gitBranch && (
              <div
                className={`git-badge ${project.gitDirty ? 'dirty' : ''}`}
                style={{
                  marginLeft: 0,
                  marginTop: '3px',
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <GitBranch size={10} strokeWidth={2.2} />
                <span>{project.gitBranch}</span>
                {project.gitDirty && <span>*</span>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {onMoveUp && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(e);
                }}
                className="task-close-btn"
                title="Move Up"
                style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}
              >
                <ChevronUp size={12} strokeWidth={2.2} />
              </span>
            )}
            {onMoveDown && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(e);
                }}
                className="task-close-btn"
                title="Move Down"
                style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}
              >
                <ChevronDown size={12} strokeWidth={2.2} />
              </span>
            )}
            <span
              onClick={handleToggleExplorer}
              title="Toggle File Explorer"
              style={{
                cursor: 'pointer',
                opacity: isExplorerOpen ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                padding: '2px 4px',
                color: isExplorerOpen ? 'var(--accent-primary)' : 'var(--fg-secondary)',
              }}
            >
              <FolderTree size={13} strokeWidth={1.8} />
            </span>
            {project.scripts &&
              typeof project.scripts === 'object' &&
              Object.keys(project.scripts).length > 0 && (
                <div style={{ position: 'static' }}>
                  <span
                    onClick={toggleScriptMenu}
                    title="All Scripts"
                    style={{
                      color: 'var(--accent-primary)',
                      opacity: 0.85,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px 4px',
                    }}
                  >
                    <Zap size={13} strokeWidth={2} />
                  </span>
                  {isScriptMenuOpen && (
                    <div
                      className="dropdown-menu"
                      onMouseLeave={() => setIsScriptMenuOpen(false)}
                      style={{
                        top: '100%',
                        right: '20px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        position: 'absolute',
                      }}
                    >
                      {Object.entries(project.scripts).map(([scriptName, scriptCmd]) => (
                        <div
                          key={scriptName}
                          className="project-item"
                          style={{ fontSize: '11px', padding: '6px 12px' }}
                          title={scriptCmd as string}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsScriptMenuOpen(false);
                            if (onRunScript) onRunScript(scriptName);
                          }}
                        >
                          <span style={{ fontWeight: 'bold', marginRight: '8px', color: '#d4d4d4' }}>
                            {scriptName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>

        {availableFavorites.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginTop: '6px',
              marginLeft: '23px',
            }}
          >
            {availableFavorites.map((s) => (
              <div
                key={s}
                className="script-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRunScript) onRunScript(s);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ProjectItem.displayName = 'ProjectItem';

export default ProjectItem;
