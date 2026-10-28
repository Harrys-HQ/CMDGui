import React, { useState, useEffect, useRef } from 'react';
import { Tab, Project } from '../types';
import { Command } from '../hooks/useCommands';
import { Terminal, Command as CommandIcon, Search } from 'lucide-react';
import TechIcon from './TechIcon';

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
  icon: React.ReactNode;
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
          type: 'command' as const,
          sub: c.category || 'Action',
          icon: <CommandIcon size={15} color="var(--accent-primary)" strokeWidth={2} />,
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
            sub: 'Active Terminal Task',
            icon: <Terminal size={15} color="var(--accent-primary)" strokeWidth={2} />,
            action: () => onSelectTab(t.id),
          })),
        ...(projects || [])
          .filter((p) => p && p.path && p.name)
          .map((p) => ({
            id: p.path,
            name: p.name,
            type: 'project' as const,
            sub: p.path,
            icon: <TechIcon type={p.type} size={15} />,
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
      setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
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

  const getTypeBadge = (type: 'tab' | 'project' | 'command') => {
    switch (type) {
      case 'tab':
        return { label: 'TAB', color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'project':
        return { label: 'WORKSPACE', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'command':
        return { label: 'ACTION', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
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
          maxHeight: '460px',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-surface-l2)',
          }}
        >
          <Search size={16} color="var(--accent-primary)" />
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
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-active)',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--font-family-ui)',
              boxSizing: 'border-box',
            }}
          />
          <kbd
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-family-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--bg-surface-l1)',
              border: '1px solid var(--border-color)',
              color: 'var(--fg-secondary)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '360px', padding: '6px' }}>
          {filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const badge = getTypeBadge(item.type);
            return (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                style={{
                  margin: '2px 0',
                  padding: '9px 12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-surface-active)' : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(59, 130, 246, 0.35)'
                    : '1px solid transparent',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.12s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface-l1)',
                      border: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isSelected ? 'var(--fg-active)' : 'var(--fg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{item.name}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          color: badge.color,
                          background: badge.bg,
                          letterSpacing: '0.4px',
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                        fontFamily:
                          item.type === 'project'
                            ? 'var(--font-family-mono)'
                            : 'var(--font-family-ui)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                </div>

                {item.shortcut && (
                  <kbd
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--fg-active)',
                      background: 'var(--bg-surface-l1)',
                      border: '1px solid var(--border-color)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-family-mono)',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                  >
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div
              style={{
                padding: '36px',
                textAlign: 'center',
                color: 'var(--fg-secondary)',
                fontSize: '13px',
              }}
            >
              No matching tabs or commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;
