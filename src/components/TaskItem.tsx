import React from 'react';
import { Tab } from '../types';

interface TaskItemProps {
  tab: Tab;
  isActive: boolean;
  searchQuery: string;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onRename: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const getHighlightedText = (text: string, highlight: string) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
          <span key={i} className="highlight-match">{part}</span> : 
          part
      )}
    </span>
  );
};

const TaskItem: React.FC<TaskItemProps> = ({ tab, isActive, searchQuery, onSelect, onClose, onRename, onContextMenu }) => {
  return (
    <div 
        onClick={onSelect}
        onDoubleClick={onRename}
        onContextMenu={onContextMenu}
        className={`project-item ${isActive ? 'active-task' : ''} ${tab.hasAlert ? 'alert-task' : ''} ${tab.hasConfirmation ? 'confirmation-task' : ''}`}
        title={tab.cwd || 'Terminal'}
    >
        <span className="project-icon">
          {tab.isAdmin && <span title="Running as Admin" style={{ marginRight: '4px', fontSize: '10px' }}>🛡️</span>}
          {tab.hasAlert ? '🔔' : tab.hasConfirmation ? '🔑' : '💻'}
        </span>
        <span 
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
          title="Double-click to rename"
        >
          {getHighlightedText(tab.title, searchQuery)}
        </span>
        <span 
            onClick={onClose}
            className="task-close-btn"
            title="Close Terminal"
        >×</span>
    </div>
  );
};

export default TaskItem;