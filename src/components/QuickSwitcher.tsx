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
          background: '#252526',
          border: '1px solid #454545',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ padding: '10px' }}>
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
              background: '#3c3c3c',
              border: '1px solid #007acc',
              color: 'white',
              padding: '8px 12px',
              fontSize: '14px',
              outline: 'none',
              borderRadius: '2px',
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '330px' }}>
          {filteredItems.map((item, index) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => {
                item.action();
                onClose();
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: index === selectedIndex ? '#094771' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{ fontSize: '14px', color: index === selectedIndex ? 'white' : '#ccc' }}
                >
                  <span style={{ marginRight: '8px' }}>{item.icon}</span>
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: index === selectedIndex ? '#add6ff' : '#888',
                    marginLeft: '24px',
                  }}
                >
                  {item.sub}
                </div>
              </div>
              {item.shortcut && (
                <div
                  style={{
                    fontSize: '11px',
                    color: index === selectedIndex ? '#ccc' : '#666',
                    background: index === selectedIndex ? '#1a5c8a' : '#333',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  {item.shortcut}
                </div>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;
