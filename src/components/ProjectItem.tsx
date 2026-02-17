import React from 'react';
import { Project } from '../types';

interface ProjectItemProps {
  project: Project;
  searchQuery: string;
  onSelect: () => void;
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

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  searchQuery,
  onSelect,
  onRemove,
  onContextMenu,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="project-item"
      title={project.path}
    >
      <ProjectIcon type={project.type} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {getHighlightedText(project.name, searchQuery)}
      </span>
      <span onClick={onRemove} className="task-close-btn" title="Remove Project">
        ×
      </span>
    </div>
  );
};

export default ProjectItem;
