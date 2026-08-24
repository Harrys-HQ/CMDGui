/* eslint-disable react/prop-types */
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

const TaskItem: React.FC<TaskItemProps> = React.memo(
  ({
    tab,
    isActive,
    searchQuery,
    onSelect,
    onClose,
    onRename,
    onContextMenu,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDragEnd,
  }) => {
    const panes = tab?.panes || {};
    const firstPane = Object.values(panes)[0];
    const isAdmin = firstPane?.isAdmin;
    const cwd = firstPane?.cwd;

    return (
      <div
        onClick={onSelect}
        onDoubleClick={onRename}
        onContextMenu={onContextMenu}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', tab.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className={`project-item ${isActive ? 'active-task' : ''} ${tab.hasAlert ? 'alert-task' : ''} ${tab.hasConfirmation ? 'confirmation-task' : ''}`}
        title={cwd || 'Terminal'}
      >
        <span className="project-icon">
          {isAdmin && (
            <span title="Running as Admin" style={{ marginRight: '4px', fontSize: '10px' }}>
              🛡️
            </span>
          )}
          {tab.hasAlert ? '🔔' : tab.hasConfirmation ? '🔑' : '💻'}
        </span>
        <span
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
          title="Double-click to rename"
        >
          {getHighlightedText(tab.title, searchQuery)}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
          {onMoveUp && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(e);
              }}
              className="task-close-btn"
              title="Move Up"
              style={{ fontSize: '11px' }}
            >
              ▲
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
              style={{ fontSize: '11px' }}
            >
              ▼
            </span>
          )}
          <span onClick={onClose} className="task-close-btn" title="Close Terminal">
            ×
          </span>
        </div>
      </div>
    );
  }
);

TaskItem.displayName = 'TaskItem';

export default TaskItem;
