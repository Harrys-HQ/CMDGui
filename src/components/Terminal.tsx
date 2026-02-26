import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { TerminalTheme } from '../types';

interface TerminalProps {
  paneId: string;
  cwd?: string;
  shell?: string;
  initialCommand?: string;
  envVars?: Record<string, string>;
  isActive: boolean;
  theme?: string;
  customTheme?: TerminalTheme;
  fontSize?: number;
  scrollback?: number;
  onTitleChange?: (title: string) => void;
  onExit?: () => void;
  onCommand?: (command: string) => void;
  onNotification?: (type: 'alert' | 'confirmation') => void;
  onClear?: (clearFn: () => void) => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  onClosePane?: () => void;
  showPaneControls?: boolean;
}

const getTheme = (name: string = 'vscode', custom?: TerminalTheme) => {
  const base = { background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#ffffff', selectionBackground: 'rgba(255, 255, 255, 0.3)', black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510', blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5', brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#e5e5e5' };
  if (name === 'custom' && custom) return custom;
  switch (name) {
    case 'monokai': return { ...base, background: '#272822', foreground: '#f8f8f2' };
    case 'solarized-dark': return { ...base, background: '#002b36', foreground: '#839496' };
    case 'one-dark': return { ...base, background: '#282c34', foreground: '#abb2bf' };
    default: return base;
  }
};

// Global PTY registry to persist processes during layout shifts (splits)
const globalPtyRegistry: Record<string, { pid: number, cleanupData?: () => void, cleanupExit?: () => void }> = {};

const Terminal: React.FC<TerminalProps> = ({ paneId, cwd, shell, initialCommand, envVars, isActive, theme, customTheme, fontSize = 14, scrollback = 1000, onTitleChange, onExit, onCommand, onNotification, onClear, onSplitHorizontal, onSplitVertical, onClosePane, showPaneControls }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dataBuffer = useRef<string[]>([]);
  const onTitleChangeRef = useRef(onTitleChange);
  const onExitRef = useRef(onExit);
  const onCommandRef = useRef(onCommand);
  const onNotificationRef = useRef(onNotification);
  const onClearRef = useRef(onClear);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
    onExitRef.current = onExit;
    onCommandRef.current = onCommand;
    onNotificationRef.current = onNotification;
    onClearRef.current = onClear;
    isActiveRef.current = isActive;
  }, [onTitleChange, onExit, onCommand, onNotification, onClear, isActive]);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Xterm({ cursorBlink: true, fontSize, scrollback, fontFamily: 'Consolas, monospace', theme: getTheme(theme, customTheme), allowProposedApi: true });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((_, uri) => window.electron.openExternal(uri));
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon); term.loadAddon(webLinksAddon); term.loadAddon(searchAddon);
    xtermRef.current = term; fitAddonRef.current = fitAddon; searchAddonRef.current = searchAddon;

    if (isActiveRef.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
      try {
        term.open(terminalRef.current);
        if (dataBuffer.current.length > 0) {
          term.write(dataBuffer.current.join(''));
          dataBuffer.current = [];
        }
        fitAddon.fit();
      } catch (e) {
        console.error('Failed to open terminal:', e);
      }
    }

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;
      if (e.ctrlKey && e.code === 'KeyF') { setIsSearchOpen(true); return false; }
      if (e.ctrlKey && e.key === 'Tab') return false;
      return true;
    });

    if (onClearRef.current) onClearRef.current(() => { if (pidRef.current !== null) window.electron.writeTerminal(pidRef.current, '\x0c'); });

    let isUnmounted = false;
    const setupPty = async () => {
      let pid: number;
      if (globalPtyRegistry[paneId]) {
        pid = globalPtyRegistry[paneId].pid;
        if (globalPtyRegistry[paneId].cleanupData) globalPtyRegistry[paneId].cleanupData!();
        if (globalPtyRegistry[paneId].cleanupExit) globalPtyRegistry[paneId].cleanupExit!();
      } else {
        pid = await window.electron.createTerminal({ cols: term.cols || 80, rows: term.rows || 24, cwd, shell, envVars });
        globalPtyRegistry[paneId] = { pid };
        if (initialCommand) setTimeout(() => { if (!isUnmounted) window.electron.writeTerminal(pid, initialCommand + '\n'); }, 500);
      }

      if (isUnmounted) return;
      pidRef.current = pid; setIsReady(true);

      const cleanupData = window.electron.onTerminalData(pid, (data) => {
        if (isUnmounted) return;
        if (term.element) {
          try {
            term.write(data);
          } catch (e) {
            console.error('Failed to write to terminal:', e);
          }
        } else {
          dataBuffer.current.push(data);
          if (dataBuffer.current.length > 1000) dataBuffer.current.shift();
        }
        if (!isActiveRef.current && onNotificationRef.current) {
          const lower = data.toLowerCase();
          const patterns = ['password', 'sudo', 'confirm', 'error:', 'failed', 'exception'];
          const match = patterns.find(p => lower.includes(p));
          if (match) {
            if (['password', 'sudo', 'confirm'].includes(match)) onNotificationRef.current('confirmation');
            else onNotificationRef.current('alert');
          }
        }
      });

      const cleanupExit = window.electron.onTerminalExit(pid, () => {
        if (isUnmounted) return;
        if (term.element) term.write('\r\n\x1b[31mTerminal exited.\x1b[0m\r\n');
        if (onExitRef.current) onExitRef.current();
        delete globalPtyRegistry[paneId];
      });

      globalPtyRegistry[paneId].cleanupData = cleanupData;
      globalPtyRegistry[paneId].cleanupExit = cleanupExit;
      term.onData(data => { if (!isUnmounted && pidRef.current !== null) window.electron.writeTerminal(pidRef.current, data); });
      term.onResize(size => { if (!isUnmounted && pidRef.current !== null) window.electron.resizeTerminal(pidRef.current, size.cols, size.rows); });
      term.onTitleChange(title => { if (onTitleChangeRef.current) onTitleChangeRef.current(title); });
    };

    setupPty();

    const handleResize = () => {
      if (!isActiveRef.current || !terminalRef.current || !term.element) return;
      if (terminalRef.current.offsetWidth === 0) return;
      try {
        fitAddon.fit();
        if (pidRef.current !== null) window.electron.resizeTerminal(pidRef.current, term.cols, term.rows);
      } catch (e) {
        console.error('Resize failed:', e);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      isUnmounted = true;
      window.removeEventListener('resize', handleResize);
      try {
        term.dispose();
      } catch (e) {
        console.error('Disposal failed:', e);
      }
    };
  }, [cwd, shell, envVars, paneId, customTheme, fontSize, initialCommand, scrollback, theme]);

  useEffect(() => { if (xtermRef.current) xtermRef.current.options.theme = getTheme(theme, customTheme); }, [theme, customTheme]);
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      const el = terminalRef.current;
      if (isActive && el && el.offsetWidth > 0 && xtermRef.current.element) {
        try {
          fitAddonRef.current?.fit();
        } catch (e) {
          console.error('Fit failed after font size change:', e);
        }
      }
    }
  }, [fontSize, isActive]);
  useEffect(() => { if (xtermRef.current) xtermRef.current.options.scrollback = scrollback; }, [scrollback]);

    useEffect(() => {
      if (isActive && terminalRef.current && xtermRef.current) {
        requestAnimationFrame(() => {
          const el = terminalRef.current;
          if (!el || el.offsetWidth === 0 || !xtermRef.current) return;
          try {
            if (!xtermRef.current.element) {
              xtermRef.current.open(el);
              if (dataBuffer.current.length > 0) {
                xtermRef.current.write(dataBuffer.current.join(''));
                dataBuffer.current = [];
              }
            }
            fitAddonRef.current?.fit();
            if (pidRef.current !== null) {
              window.electron.resizeTerminal(pidRef.current, xtermRef.current.cols, xtermRef.current.rows);
              xtermRef.current.focus();
            }
          } catch (e) {
            console.error('Focus/Resize after activation failed:', e);
          }
        });
      }
    }, [isActive, isReady]);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {showPaneControls && (
        <div className="pane-controls" style={{ position: 'absolute', top: '5px', right: '10px', zIndex: 100, display: 'flex', gap: '4px', opacity: 0.3 }}>
          <button onClick={onSplitHorizontal} style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}>━</button>
          <button onClick={onSplitVertical} style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}>┃</button>
          <button onClick={onClosePane} style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}>×</button>
        </div>
      )}
      {isSearchOpen && (
        <div className="terminal-search-bar">
          <input autoFocus type="text" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); searchAddonRef.current?.findNext(e.target.value); }} onKeyDown={e => { if (e.key === 'Enter') searchAddonRef.current?.findNext(searchQuery); if (e.key === 'Escape') setIsSearchOpen(false); }} />
          <button onClick={() => searchAddonRef.current?.findPrevious(searchQuery)}>↑</button>
          <button onClick={() => searchAddonRef.current?.findNext(searchQuery)}>↓</button>
          <button onClick={() => setIsSearchOpen(false)}>×</button>
        </div>
      )}
      <div ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

export default Terminal;
