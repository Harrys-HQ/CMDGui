import React, { useState } from 'react';
import { Tab } from '../types';
import { Terminal, AlertCircle, HelpCircle, X, Edit3, Copy, Trash2, Plus } from 'lucide-react';

interface TopTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string, currentTitle: string) => void;
  onReorderTabs: (startIndex: number, endIndex: number) => void;
  onDuplicateTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onAddTab?: () => void;
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
  onAddTab,
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

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
    const idx = tabs.findIndex((t) => t.id === tabId);
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const sourceTabId = e.dataTransfer.getData('text/plain');
    let startIdx = draggedIdx;
    if (startIdx === null && sourceTabId) {
      startIdx = tabs.findIndex((t) => t.id === sourceTabId);
    }
    if (startIdx !== null && startIdx !== -1 && startIdx !== dropIdx) {
      onReorderTabs(startIdx, dropIdx);
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
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
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
            {tab.hasAlert ? (
              <AlertCircle size={14} color="#f14c4c" />
            ) : tab.hasConfirmation ? (
              <HelpCircle size={14} color="#cca700" />
            ) : (
              <Terminal size={14} />
            )}
          </span>
          <span className="tab-title">{tab.title}</span>
          {tab.hasAlert && <span className="tab-status-dot alert" title="Activity alert" />}
          {tab.hasConfirmation && <span className="tab-status-dot confirmation" title="Requires input" />}
          <div className="tab-close" onClick={(e) => onCloseTab(tab.id, e)}>
            <X size={12} />
          </div>
        </div>
      ))}

      {onAddTab && (
        <div
          onClick={onAddTab}
          className="top-tab"
          title="New Terminal Tab (Ctrl+T)"
          style={{
            width: '28px',
            minWidth: '28px',
            padding: 0,
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          <Plus size={14} />
        </div>
      )}

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
            style={{ fontSize: '12px', padding: '6px 14px', gap: '8px', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              const target = tabs.find((t) => t.id === contextMenuTabId);
              if (target) onRenameTab(target.id, target.title);
              setContextMenuTabId(null);
            }}
          >
            <Edit3 size={14} /> Rename Tab
          </div>
          {onDuplicateTab && (
            <div
              className="project-item"
              style={{ fontSize: '12px', padding: '6px 14px', gap: '8px', display: 'flex', alignItems: 'center' }}
              onClick={() => {
                onDuplicateTab(contextMenuTabId);
                setContextMenuTabId(null);
              }}
            >
              <Copy size={14} /> Duplicate Session
            </div>
          )}
          {onCloseOthers && tabs.length > 1 && (
            <div
              className="project-item"
              style={{ fontSize: '12px', padding: '6px 14px', gap: '8px', display: 'flex', alignItems: 'center' }}
              onClick={() => {
                onCloseOthers(contextMenuTabId);
                setContextMenuTabId(null);
              }}
            >
              <X size={14} /> Close Other Tabs
            </div>
          )}
          <div
            className="project-item"
            style={{ fontSize: '12px', padding: '6px 14px', gap: '8px', display: 'flex', alignItems: 'center', color: '#f14c4c' }}
            onClick={(e) => {
              onCloseTab(contextMenuTabId, e as any);
              setContextMenuTabId(null);
            }}
          >
            <Trash2 size={14} /> Close Tab
          </div>
        </div>
      )}
    </div>
  );
};

export default TopTabBar;
