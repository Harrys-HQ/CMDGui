import { useState } from 'react';
import type { SearchAddon } from 'xterm-addon-search';

export default function TerminalSearch({
  searchAddon,
  onClose,
}: {
  searchAddon: SearchAddon | null;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({ caseSensitive: false, wholeWord: false });
  return (
    <div className="terminal-search-bar" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          searchAddon?.findNext(e.target.value, searchOptions);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              searchAddon?.findPrevious(searchQuery, searchOptions);
            } else {
              searchAddon?.findNext(searchQuery, searchOptions);
            }
          }
          if (e.key === 'Escape') {
            onClose();
          }
        }}
      />
      <button
        title="Case Sensitive"
        className={searchOptions.caseSensitive ? 'active-search-opt' : ''}
        onClick={() => {
          const newOpts = { ...searchOptions, caseSensitive: !searchOptions.caseSensitive };
          setSearchOptions(newOpts);
          searchAddon?.findNext(searchQuery, newOpts);
        }}
        style={{
          fontSize: '10px',
          padding: '2px 4px',
          border: searchOptions.caseSensitive ? '1px solid var(--accent-primary)' : 'none',
        }}
      >
        Aa
      </button>
      <div style={{ width: '1px', height: '16px', background: '#444' }} />
      <button
        onClick={() => searchAddon?.findPrevious(searchQuery, searchOptions)}
        title="Previous Match (Shift+Enter)"
      >
        ↑
      </button>
      <button
        onClick={() => searchAddon?.findNext(searchQuery, searchOptions)}
        title="Next Match (Enter)"
      >
        ↓
      </button>
      <button
        onClick={() => {
          onClose();
        }}
        title="Close"
      >
        ×
      </button>
    </div>
  );
}
