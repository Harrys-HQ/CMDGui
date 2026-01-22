import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';

interface TerminalProps {
  cwd?: string;
  isActive: boolean;
  theme?: string;
  onTitleChange?: (title: string) => void;
  onExit?: () => void;
  onNotification?: (type: 'alert' | 'confirmation') => void;
}

const getTheme = (themeName: string = 'vscode') => {
  const baseTheme = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  };

  switch (themeName) {
    case 'monokai':
      return {
        ...baseTheme,
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f0',
        black: '#272822',
        red: '#f92672',
        green: '#a6e22e',
        yellow: '#f4bf75',
        blue: '#66d9ef',
        magenta: '#ae81ff',
        cyan: '#a1efe4',
        white: '#f8f8f2'
      };
    case 'solarized-dark':
      return {
        ...baseTheme,
        background: '#002b36',
        foreground: '#839496',
        cursor: '#93a1a1',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5'
      };
    case 'one-dark':
      return {
        ...baseTheme,
        background: '#282c34',
        foreground: '#abb2bf',
        cursor: '#528bff',
        black: '#282c34',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf'
      };
    default:
      return baseTheme;
  }
};

const Terminal: React.FC<TerminalProps> = ({ cwd, isActive, theme, onTitleChange, onExit, onNotification }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const lastPressRef = useRef<{ key: string, time: number } | null>(null);
  const onTitleChangeRef = useRef(onTitleChange);
  const onExitRef = useRef(onExit);
  const onNotificationRef = useRef(onNotification);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
    onExitRef.current = onExit;
    onNotificationRef.current = onNotification;
    isActiveRef.current = isActive;
  }, [onTitleChange, onExit, onNotification, isActive]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Xterm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: getTheme(theme),
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((event, uri) => {
        window.electron.openExternal(uri);
    });
    const searchAddon = new SearchAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    
    term.open(terminalRef.current);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;

      if (e.ctrlKey && e.code === 'KeyC') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          term.clearSelection();
          return false;
        }
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          return false;
        }
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
        navigator.clipboard.readText().then(text => {
          term.paste(text);
        });
        return false;
      }

      if (e.ctrlKey && e.code === 'KeyF') {
        setIsSearchOpen(true);
        return false;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && pidRef.current !== null) {
          switch (e.key.toLowerCase()) {
              case 'c': 
                   if (!term.hasSelection()) {
                       window.electron.writeTerminal(pidRef.current, '\x03');
                       return false;
                   }
                   break;
              case 'l': 
                  window.electron.writeTerminal(pidRef.current, '\x0c');
                  return false;
          }
      }

      if (e.ctrlKey && (e.key === 'n' || e.key === 'w' || e.key === 'Tab')) {
        return false;
      }
      return true;
    });

    fitAddon.fit();

    let cleanupData: (() => void) | null = null;
    let isUnmounted = false;

    window.electron.createTerminal({
      cols: term.cols,
      rows: term.rows,
      cwd
    }).then(pid => {
      if (isUnmounted) {
        window.electron.killTerminal(pid);
        return;
      }

      pidRef.current = pid;
      setIsReady(true);

      cleanupData = window.electron.onTerminalData(pid, (data) => {
        term.write(data);
        
        if (!isActiveRef.current && onNotificationRef.current) {
            const lowerData = data.toLowerCase();
            const confirmationPatterns = ['password', 'sudo', 'confirm', '(y/n)?', '[y/n]', 'press any key'];
            const alertPatterns = ['permission denied', 'error:', 'fatal:', 'failed', 'exception'];
            
            if (confirmationPatterns.some(pattern => lowerData.includes(pattern))) {
                onNotificationRef.current('confirmation');
            } else if (alertPatterns.some(pattern => lowerData.includes(pattern))) {
                onNotificationRef.current('alert');
            }
        }
      });

      term.onData(data => {
        window.electron.writeTerminal(pid, data);
      });
      
      term.onResize(size => {
          window.electron.resizeTerminal(pid, size.cols, size.rows);
      });
      
      term.onTitleChange((title) => {
          if (onTitleChangeRef.current) onTitleChangeRef.current(title);
      });

      window.electron.onTerminalExit(pid, () => {
          term.write('\r\n\x1b[31mTerminal exited.\x1b[0m\r\n');
          if (onExitRef.current) onExitRef.current();
      });
    });

    const handleResize = () => {
        fitAddon.fit();
        if (pidRef.current !== null) {
            window.electron.resizeTerminal(pidRef.current, term.cols, term.rows);
        }
    };
    
    window.addEventListener('resize', handleResize);

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        window.electron.showContextMenu('terminal');
    };
    terminalRef.current?.addEventListener('contextmenu', handleContextMenu);

    const cleanupContext = window.electron.onTerminalContextAction((action) => {
        if (!isActiveRef.current) return;
        const term = xtermRef.current;
        if (!term) return;

        switch (action) {
            case 'copy':
                const selection = term.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection);
                    term.clearSelection();
                }
                break;
            case 'paste':
                navigator.clipboard.readText().then(text => {
                    term.paste(text);
                });
                break;
            case 'clear':
                if (pidRef.current !== null) {
                    window.electron.writeTerminal(pidRef.current, '\x0c');
                }
                break;
        }
    });

    return () => {
      isUnmounted = true;
      window.removeEventListener('resize', handleResize);
      terminalRef.current?.removeEventListener('contextmenu', handleContextMenu);
      cleanupContext();
      if (cleanupData) cleanupData();
      if (pidRef.current !== null) {
        window.electron.killTerminal(pidRef.current);
        pidRef.current = null;
      }
      term.dispose();
    };
  }, []);

  useEffect(() => {
      if (xtermRef.current) {
          xtermRef.current.options.theme = getTheme(theme);
      }
  }, [theme]);

  useEffect(() => {
      if (isActive && fitAddonRef.current && xtermRef.current) {
          requestAnimationFrame(() => {
             fitAddonRef.current?.fit();
             if (pidRef.current !== null && xtermRef.current) {
                window.electron.resizeTerminal(pidRef.current, xtermRef.current.cols, xtermRef.current.rows);
                xtermRef.current.focus();
            }
          });
      }
  }, [isActive, isReady]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchAddonRef.current) {
      searchAddonRef.current.findNext(query);
    }
  };

  const findNext = () => searchAddonRef.current?.findNext(searchQuery);
  const findPrevious = () => searchAddonRef.current?.findPrevious(searchQuery);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isSearchOpen && (
        <div className="terminal-search-bar">
          <input 
            autoFocus
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findNext();
              if (e.key === 'Escape') setIsSearchOpen(false);
            }}
          />
          <button onClick={findPrevious}>↑</button>
          <button onClick={findNext}>↓</button>
          <button onClick={() => setIsSearchOpen(false)}>×</button>
        </div>
      )}
      <div ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

export default Terminal;
