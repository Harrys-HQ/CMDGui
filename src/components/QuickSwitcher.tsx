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

  const filteredItems: QuickSwitcherItem[] = isCommandMode
    ? commands
        .filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()))
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
      ].filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()));

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
          width: '600px',
          maxHeight: '400px',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          borderRadius: '8px',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
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
              border: '1px solid var(--accent-primary)',
              color: 'var(--fg-active)',
              padding: '10px 14px',
              fontSize: '14px',
              outline: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-family-ui)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '310px', padding: '6px 0' }}>
          {filteredItems.map((item, index) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => {
                item.action();
                onClose();
              }}
              style={{
                margin: '2px 8px',
                padding: '10px 12px',
                cursor: 'pointer',
                background: index === selectedIndex ? 'var(--accent-primary)' : 'transparent',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.1s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: index === selectedIndex ? 'var(--fg-active)' : 'var(--fg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: index === selectedIndex ? 'var(--fg-active)' : 'var(--fg-secondary)',
                    opacity: index === selectedIndex ? 0.9 : 0.7,
                    marginLeft: '24px',
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
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                >
                  {item.shortcut}
                </div>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--fg-secondary)', fontSize: '13px' }}>
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;
