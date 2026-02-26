import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { TerminalTheme } from '../types';

interface TerminalProps {
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

const getTheme = (themeName: string = 'vscode', customTheme?: TerminalTheme) => {
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
    brightWhite: '#e5e5e5',
  };

  if (themeName === 'custom' && customTheme) {
    return customTheme;
  }

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
        white: '#f8f8f2',
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
        white: '#eee8d5',
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
        white: '#abb2bf',
      };
    default:
      return baseTheme;
  }
};

const Terminal: React.FC<TerminalProps> = ({
  cwd,
  shell,
  initialCommand,
  envVars,
  isActive,
  theme,
  customTheme,
  fontSize = 14,
  scrollback = 1000,
  onTitleChange,
  onExit,
  onCommand,
  onNotification,
  onClear,
  onSplitHorizontal,
  onSplitVertical,
  onClosePane,
  showPaneControls,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onTitleChangeRef = useRef(onTitleChange);
  const onExitRef = useRef(onExit);
  const onCommandRef = useRef(onCommand);
  const onNotificationRef = useRef(onNotification);
  const isActiveRef = useRef(isActive);
  const initialFontSize = useRef(fontSize);
  const initialTheme = useRef(theme);
  const initialCustomTheme = useRef(customTheme);
  const initialScrollback = useRef(scrollback);

  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
    onExitRef.current = onExit;
    onCommandRef.current = onCommand;
    onNotificationRef.current = onNotification;
    isActiveRef.current = isActive;
  }, [onTitleChange, onExit, onCommand, onNotification, isActive]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Xterm({
      cursorBlink: true,
      fontSize: initialFontSize.current,
      scrollback: initialScrollback.current,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: getTheme(initialTheme.current, initialCustomTheme.current),
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      window.electron.openExternal(uri);
    });
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    // Custom Link Provider for local file paths
    term.registerLinkProvider({
      provideLinks: (bufferLineNumber, callback) => {
        const line = term.buffer.active.getLine(bufferLineNumber - 1);
        if (!line) {
          callback(undefined);
          return;
        }

        const text = line.translateToString(true);
        const links: { range: { start: { x: number, y: number }, end: { x: number, y: number } }, text: string, activate: (event: MouseEvent, text: string) => void }[] = [];
        
        // Match common absolute and relative paths, with optional line/col numbers
        // Matches C:\..., /home/..., ./src/..., src/...
        const pathRegex = /(?:[a-zA-Z]:[\\/]|(?:\.\/|\.\.\/|\/)+)[\w./\\:]+/g;
        
        let match;
        while ((match = pathRegex.exec(text)) !== null) {
          const pathString = match[0];
          
          links.push({
            range: {
              start: { x: match.index + 1, y: bufferLineNumber },
              end: { x: match.index + pathString.length, y: bufferLineNumber }
            },
            text: pathString,
            activate: (event: MouseEvent, text: string) => {
              // Extract just the path part, ignoring :line:col
              const match = text.match(/^(.+?)(:\d+)?(:\d+)?$/);
              const cleanPath = match ? match[1] : text;
              window.electron.openLocalPath(cleanPath);
            }
          });
        }
        
        callback(links.length > 0 ? links : undefined);
      }
    });

    // Only open if currently active to save DOM resources
    if (isActiveRef.current && terminalRef.current) {
      term.open(terminalRef.current);
    }

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
        navigator.clipboard.readText().then((text) => {
          // Sanitize: Strip non-printable/dangerous control characters while preserving Tab and Newline
          // eslint-disable-next-line no-control-regex
          const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
          term.paste(sanitized);
        });
        return false;
      }

      if (e.ctrlKey && e.code === 'KeyF') {
        setIsSearchOpen(true);
        return false;
      }

      if (e.ctrlKey && e.code === 'Enter') {
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\n');
        }
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

      // Allow Ctrl+N/P/W to pass to shell (Next/Prev/DeleteWord)
      // Pass Ctrl+Shift+N/P/W to App (New/Switcher/Close)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.code === 'KeyN' || e.code === 'KeyP' || e.code === 'KeyW')
      ) {
        return false;
      }

      // Pass Tab switching to App
      if (e.ctrlKey && e.key === 'Tab') {
        return false;
      }
      return true;
    });

    fitAddon.fit();

    if (onClear) {
      onClear(() => {
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\x0c');
        }
      });
    }

    let cleanupData: (() => void) | null = null;
    let cleanupExit: (() => void) | null = null;
    let isUnmounted = false;

    window.electron
      .createTerminal({
        cols: term.cols,
        rows: term.rows,
        cwd,
        shell,
        envVars,
      })
      .then((pid) => {
        if (isUnmounted) {
          window.electron.killTerminal(pid);
          return;
        }

        pidRef.current = pid;
        setIsReady(true);
        
        if (initialCommand) {
          // Add a tiny delay to ensure the shell is fully ready to receive input
          setTimeout(() => {
            window.electron.writeTerminal(pid, initialCommand + '\n');
          }, 500);
        }

        cleanupData = window.electron.onTerminalData(pid, (data) => {
          term.write(data);

          if (!isActiveRef.current && onNotificationRef.current) {
            const lowerData = data.toLowerCase();
            const confirmationPatterns = [
              'password',
              'sudo',
              'confirm',
              '(y/n)?',
              '[y/n]',
              'press any key',
            ];
            const alertPatterns = ['permission denied', 'error:', 'fatal:', 'failed', 'exception'];

            if (confirmationPatterns.some((pattern) => lowerData.includes(pattern))) {
              onNotificationRef.current('confirmation');
            } else if (alertPatterns.some((pattern) => lowerData.includes(pattern))) {
              onNotificationRef.current('alert');
            }
          }
        });

        let commandBuffer = '';
        term.onData((data) => {
          window.electron.writeTerminal(pid, data);
          
          // Basic command history tracking:
          // Detect Enter key and send buffer
          if (data === '\r' || data === '\n') {
            if (commandBuffer.trim().length > 1) {
              if (onCommandRef.current) onCommandRef.current(commandBuffer.trim());
            }
            commandBuffer = '';
          } else if (data === '\x7f' || data === '\b') {
            // Backspace
            commandBuffer = commandBuffer.slice(0, -1);
          } else {
            // Only add printable characters to buffer
            if (data.length === 1 && data >= ' ') {
              commandBuffer += data;
            }
          }
        });

        term.onResize((size) => {
          window.electron.resizeTerminal(pid, size.cols, size.rows);
        });

        term.onTitleChange((title) => {
          if (onTitleChangeRef.current) onTitleChangeRef.current(title);
        });

        cleanupExit = window.electron.onTerminalExit(pid, () => {
          term.write('\r\n\x1b[31mTerminal exited.\x1b[0m\r\n');
          if (onExitRef.current) onExitRef.current();
        });
      });

    const handleResize = () => {
      if (!isActiveRef.current) return;
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

    const container = terminalRef.current;
    container?.addEventListener('contextmenu', handleContextMenu);

    const cleanupContext = window.electron.onTerminalContextAction((action) => {
      if (!isActiveRef.current) return;
      const term = xtermRef.current;
      if (!term) return;

      switch (action) {
        case 'copy': {
          const selection = term.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            term.clearSelection();
          }
          break;
        }
        case 'paste':
          navigator.clipboard.readText().then((text) => {
            // Sanitize: Strip non-printable/dangerous control characters while preserving Tab and Newline
            // eslint-disable-next-line no-control-regex
            const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
            term.paste(sanitized);
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
      container?.removeEventListener('contextmenu', handleContextMenu);
      cleanupContext();
      if (cleanupData) cleanupData();
      if (cleanupExit) cleanupExit();
      if (pidRef.current !== null) {
        window.electron.killTerminal(pidRef.current);
        pidRef.current = null;
      }
      term.dispose();
    };
  }, [cwd, shell, initialCommand, envVars, onClear]); // Only re-run if cwd changes, theme and fontSize are handled in separate effects

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTheme(theme, customTheme);
    }
  }, [theme, customTheme]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      fitAddonRef.current?.fit();
    }
  }, [fontSize]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.scrollback = scrollback;
    }
  }, [scrollback]);

  useEffect(() => {
    if (isActive && terminalRef.current && xtermRef.current) {
      // Ensure terminal is opened in the container if it's not already
      // This is safe to call multiple times if we're not disposing the whole term
      if (!terminalRef.current.hasChildNodes()) {
        xtermRef.current.open(terminalRef.current);
      }
      
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        if (pidRef.current !== null && xtermRef.current) {
          window.electron.resizeTerminal(
            pidRef.current,
            xtermRef.current.cols,
            xtermRef.current.rows
          );
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
      {showPaneControls && (
        <div 
          className="pane-controls"
          style={{
            position: 'absolute',
            top: '5px',
            right: '10px',
            zIndex: 100,
            display: 'flex',
            gap: '4px',
            opacity: 0.3,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
        >
          <button 
            onClick={onSplitHorizontal} 
            title="Split Horizontal"
            style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}
          >
            ━
          </button>
          <button 
            onClick={onSplitVertical} 
            title="Split Vertical"
            style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}
          >
            ┃
          </button>
          <button 
            onClick={onClosePane} 
            title="Close Pane"
            style={{ background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}
          >
            ×
          </button>
        </div>
      )}
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
