/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectItemProps {
  project: Project;
  searchQuery: string;
  onSelect: () => void;
  onRunScript?: (scriptName: string) => void;
  onToggleExplorer?: () => void;
  isExplorerOpen?: boolean;
  onRemove: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const ProjectIcon: React.FC<{ type?: string }> = ({ type }) => {
  switch (type) {
    case 'react':
      return (
        <span className="project-icon" title="React Project">
          ⚛️
        </span>
      );
    case 'vue':
      return (
        <span className="project-icon" title="Vue Project">
          🖖
        </span>
      );
    case 'angular':
      return (
        <span className="project-icon" title="Angular Project">
          🅰️
        </span>
      );
    case 'svelte':
      return (
        <span className="project-icon" title="Svelte Project">
          🔥
        </span>
      );
    case 'node':
      return (
        <span className="project-icon" title="Node.js Project">
          🟢
        </span>
      );
    case 'python':
      return (
        <span className="project-icon" title="Python Project">
          🐍
        </span>
      );
    case 'rust':
      return (
        <span className="project-icon" title="Rust Project">
          🦀
        </span>
      );
    case 'go':
      return (
        <span className="project-icon" title="Go Project">
          🐹
        </span>
      );
    case 'deno':
      return (
        <span className="project-icon" title="Deno Project">
          🦕
        </span>
      );
    case 'docker':
      return (
        <span className="project-icon" title="Docker Project">
          🐳
        </span>
      );
    case 'dotnet':
      return (
        <span className="project-icon" title=" .NET Project">
          🎯
        </span>
      );
    case 'cpp':
      return (
        <span className="project-icon" title="C++ Project">
          💎
        </span>
      );
    case 'git':
      return (
        <span className="project-icon" title="Git Repository">
          🌿
        </span>
      );
    case 'php':
      return (
        <span className="project-icon" title="PHP Project">
          🐘
        </span>
      );
    case 'laravel':
      return (
        <span className="project-icon" title="Laravel Project">
          🚀
        </span>
      );
    case 'ruby':
      return (
        <span className="project-icon" title="Ruby Project">
          💎
        </span>
      );
    case 'java':
      return (
        <span className="project-icon" title="Java Project">
          ☕
        </span>
      );
    default:
      return <span className="project-icon">📂</span>;
  }
};

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
    onRemove,
    onContextMenu,
    onDragStart,
    onDragEnd,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScriptMenuOpen, setIsScriptMenuOpen] = useState(false);

    const toggleScriptMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsScriptMenuOpen(!isScriptMenuOpen);
    };

    const handleToggleExplorer = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleExplorer) onToggleExplorer();
    };

    return (
      <div
        onClick={onSelect}
        onContextMenu={onContextMenu}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="project-item"
        title={project.path}
        style={{
          position: 'relative',
          borderLeft: isExplorerOpen ? '2px solid var(--accent-primary)' : 'none',
        }}
      >
        <ProjectIcon type={project.type} />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {getHighlightedText(project.name, searchQuery)}
          </span>
          {project.gitBranch && (
            <span style={{ fontSize: '10px', color: '#888', marginTop: '-2px' }}>
              <span style={{ marginRight: '4px' }}>ᚠ</span>
              {project.gitBranch}
              {project.gitDirty && <span style={{ color: '#e5e510', marginLeft: '4px' }}>*</span>}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            onClick={handleToggleExplorer}
            title="Toggle File Explorer"
            style={{
              fontSize: '12px',
              marginRight: '8px',
              cursor: 'pointer',
              opacity: isExplorerOpen ? 1 : 0.5,
            }}
          >
            📂
          </span>
          {project.scripts && Object.keys(project.scripts).length > 0 && (
            <div style={{ position: 'static' }}>
              <span
                onClick={toggleScriptMenu}
                title="NPM Scripts available"
                style={{
                  fontSize: '12px',
                  color: '#007acc',
                  marginRight: '6px',
                  opacity: 0.8,
                  cursor: 'pointer',
                }}
              >
                ⚡
              </span>
              {isScriptMenuOpen && (
                <div
                  className="dropdown-menu"
                  onMouseLeave={() => setIsScriptMenuOpen(false)}
                  style={{ top: '100%', right: '20px', maxHeight: '200px', overflowY: 'auto' }}
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
        <span onClick={onRemove} className="project-remove-btn" title="Remove Project">
          ×
        </span>
      </div>
    );
  }
);

ProjectItem.displayName = 'ProjectItem';

export default ProjectItem;
