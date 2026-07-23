import React, { useState, useEffect, useRef } from 'react';
import { Tab, Project } from '../types';
import { Command } from '../hooks/useCommands';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  projects: Project[];
  commands: Command[];
  onSelectTab: (id: string) => void;
  onSelectProject: (path: string) => void;
}

interface QuickSwitcherItem {
  id: string;
  name: string;
  type: 'tab' | 'project' | 'command';
  sub: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  onClose,
  tabs,
  projects,
  commands,
  onSelectTab,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCommandMode = query.startsWith('>');
  const searchText = isCommandMode ? query.slice(1).trim() : query;

  const fuzzyMatch = (text: string, queryStr: string) => {
    if (!queryStr) return true;
    const cleanText = text.toLowerCase();
    const cleanQuery = queryStr.toLowerCase();
    let qIdx = 0;
    for (let i = 0; i < cleanText.length && qIdx < cleanQuery.length; i++) {
      if (cleanText[i] === cleanQuery[qIdx]) qIdx++;
    }
    return qIdx === cleanQuery.length;
  };

  const filteredItems: QuickSwitcherItem[] = isCommandMode
    ? commands
        .filter((c) => fuzzyMatch(c.name, searchText))
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: 'command',
          sub: c.category,
          icon: c.icon,
          shortcut: c.shortcut,
          action: c.action,
        }))
    : [
        ...(tabs || [])
          .filter((t) => t && t.id && t.title)
          .map((t) => ({
            id: t.id,
            name: t.title,
            type: 'tab' as const,
            sub: 'Active Task',
            icon: '💻',
            action: () => onSelectTab(t.id),
          })),
        ...(projects || [])
          .filter((p) => p && p.path && p.name)
          .map((p) => ({
            id: p.path,
            name: p.name,
            type: 'project' as const,
            sub: p.path,
            icon: '📂',
            action: () => onSelectProject(p.path),
          })),
      ].filter((item) => fuzzyMatch(item.name, searchText));

  useEffect(() => {
    // Focus on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      const item = filteredItems[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          maxHeight: '440px',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              isCommandMode ? 'Type a command to run...' : "Search tabs... (type '>' for commands)"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: 'var(--bg-root)',
              border: '1px solid var(--border-color)',
              color: 'var(--fg-active)',
              padding: '12px 16px',
              fontSize: '14px',
              outline: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-family-ui)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '340px', padding: '8px' }}>
          {filteredItems.map((item, index) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => {
                item.action();
                onClose();
              }}
              style={{
                margin: '2px 0',
                padding: '10px 14px',
                cursor: 'pointer',
                background: index === selectedIndex ? 'var(--accent-primary)' : 'transparent',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: index === selectedIndex ? 'var(--fg-active)' : 'var(--fg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ marginRight: '10px', display: 'inline-flex', alignItems: 'center', fontSize: '15px' }}>
                    {item.icon}
                  </span>
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: index === selectedIndex ? 'rgba(255,255,255,0.85)' : 'var(--fg-secondary)',
                    marginLeft: '25px',
                    marginTop: '2px',
                  }}
                >
                  {item.sub}
                </div>
              </div>
              {item.shortcut && (
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--fg-active)',
                    background: index === selectedIndex ? 'rgba(255,255,255,0.2)' : 'var(--bg-root)',
                    border: '1px solid var(--border-color)',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                >
                  {item.shortcut}
                </div>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--fg-secondary)', fontSize: '13px' }}>
              No matching items found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;
