import React, { useState } from 'react';
import { Tab } from '../types';

interface TopTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string, currentTitle: string) => void;
  onReorderTabs: (startIndex: number, endIndex: number) => void;
  onDuplicateTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
}

const TopTabBar: React.FC<TopTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onReorderTabs,
  onDuplicateTab,
  onCloseOthers,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    setContextMenuTabId(tab.id);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx !== null && draggedIdx !== idx) {
      onReorderTabs(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="top-tab-bar" onClick={() => setContextMenuTabId(null)}>
      {(Array.isArray(tabs) ? tabs : []).map((tab, idx) => (
        <div
          key={tab.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={() => {
            setDraggedIdx(null);
            setDragOverIdx(null);
          }}
          className={`top-tab ${tab.id === activeTabId ? 'active' : ''} ${
            tab.hasAlert ? 'has-alert' : ''
          } ${tab.hasConfirmation ? 'has-confirmation' : ''} ${
            dragOverIdx === idx ? 'drag-over-indicator' : ''
          }`}
          onClick={() => onSelectTab(tab.id)}
          onContextMenu={(e) => handleContextMenu(e, tab)}
          title={tab.title}
          style={{ opacity: draggedIdx === idx ? 0.4 : 1 }}
        >
          {tab.id === activeTabId && <div className="active-tab-indicator" />}
          <span className="tab-icon">
            {tab.hasAlert ? '🔴' : tab.hasConfirmation ? '🟡' : '💻'}
          </span>
          <span className="tab-title">{tab.title}</span>
          {tab.hasAlert && <span className="tab-status-dot alert" title="Activity alert" />}
          {tab.hasConfirmation && <span className="tab-status-dot confirmation" title="Requires input" />}
          <div className="tab-close" onClick={(e) => onCloseTab(tab.id, e)}>
            ×
          </div>
        </div>
      ))}

      {contextMenuTabId && (
        <div
          className="dropdown-menu"
          style={{
            position: 'fixed',
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
            zIndex: 10000,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            borderRadius: '6px',
            padding: '4px 0',
          }}
        >
          <div
            className="project-item"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => {
              const target = tabs.find((t) => t.id === contextMenuTabId);
              if (target) onRenameTab(target.id, target.title);
              setContextMenuTabId(null);
            }}
          >
            ✏️ Rename Tab
          </div>
          {onDuplicateTab && (
            <div
              className="project-item"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => {
                onDuplicateTab(contextMenuTabId);
                setContextMenuTabId(null);
              }}
            >
              📑 Duplicate Session
            </div>
          )}
          {onCloseOthers && tabs.length > 1 && (
            <div
              className="project-item"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => {
                onCloseOthers(contextMenuTabId);
                setContextMenuTabId(null);
              }}
            >
              ❌ Close Other Tabs
            </div>
          )}
          <div
            className="project-item"
            style={{ fontSize: '12px', padding: '6px 14px', color: '#f14c4c' }}
            onClick={(e) => {
              onCloseTab(contextMenuTabId, e as any);
              setContextMenuTabId(null);
            }}
          >
            🗑️ Close Tab
          </div>
        </div>
      )}
    </div>
  );
};

export default TopTabBar;
