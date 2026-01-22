import React, { useState, useEffect, useRef } from 'react';
import { Tab, Project } from '../types';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  projects: Project[];
  onSelectTab: (id: string) => void;
  onSelectProject: (path: string) => void;
}

const QuickSwitcher: React.FC<QuickSwitcherProps> = ({ 
  isOpen, 
  onClose, 
  tabs, 
  projects, 
  onSelectTab, 
  onSelectProject 
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = [
    ...tabs.map(t => ({ id: t.id, name: t.title, type: 'tab', sub: 'Active Task' })),
    ...projects.map(p => ({ id: p.path, name: p.name, type: 'project', sub: p.path }))
  ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      const item = filteredItems[selectedIndex];
      if (item) {
        if (item.type === 'tab') onSelectTab(item.id);
        else onSelectProject(item.id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()} 
        style={{ width: '600px', maxHeight: '400px', background: '#252526', border: '1px solid #454545', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}
      >
        <div style={{ padding: '10px' }}>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search tabs and projects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: '#3c3c3c',
              border: '1px solid #007acc',
              color: 'white',
              padding: '8px 12px',
              fontSize: '14px',
              outline: 'none',
              borderRadius: '2px'
            }}
          />
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '330px' }}>
          {filteredItems.map((item, index) => (
            <div 
              key={`${item.type}-${item.id}`}
              onClick={() => {
                if (item.type === 'tab') onSelectTab(item.id);
                else onSelectProject(item.id);
                onClose();
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: index === selectedIndex ? '#094771' : 'transparent',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ fontSize: '14px', color: index === selectedIndex ? 'white' : '#ccc' }}>
                <span style={{ marginRight: '8px' }}>{item.type === 'tab' ? '💻' : '📂'}</span>
                {item.name}
              </div>
              <div style={{ fontSize: '11px', color: index === selectedIndex ? '#add6ff' : '#888', marginLeft: '24px' }}>
                {item.sub}
              </div>
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
