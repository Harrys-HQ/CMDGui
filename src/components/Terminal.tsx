import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebglAddon } from '@xterm/addon-webgl';
import { CanvasAddon } from '@xterm/addon-canvas';
import { TerminalTheme } from '../types';
import { Keymap, isKeyMatch } from '../hooks/useKeybindings';
import { globalPtyRegistry, isPaneKilled, cleanupKilledPane } from '../utils/terminalUtils';

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
  keymap: Keymap;
}

const getTheme = (name: string = 'vscode', custom?: TerminalTheme) => {
  const base = {
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
  if (name === 'custom' && custom) return custom;
  switch (name) {
    case 'monokai':
      return { ...base, background: '#272822', foreground: '#f8f8f2' };
    case 'solarized-dark':
      return { ...base, background: '#002b36', foreground: '#839496' };
    case 'one-dark':
      return { ...base, background: '#282c34', foreground: '#abb2bf' };
    default:
      return base;
  }
};

const Terminal: React.FC<TerminalProps> = ({
  paneId,
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
  keymap,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({ caseSensitive: false, wholeWord: false });
  const dataBuffer = useRef<string[]>([]);
  const writeBuffer = useRef<string>('');
  const isDirtyRef = useRef(false);
  const onTitleChangeRef = useRef(onTitleChange);
  const onExitRef = useRef(onExit);
  const onCommandRef = useRef(onCommand);
  const onNotificationRef = useRef(onNotification);
  const onClearRef = useRef(onClear);
  const isActiveRef = useRef(isActive);

  const isFitPendingRef = useRef(false);
  const writeRafId = useRef<number | null>(null);

  const loadHighPerformanceRenderer = (term: Xterm) => {
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
      console.log(`[Terminal ${paneId}] WebGL renderer loaded.`);
    } catch (e) {
      console.warn(`[Terminal ${paneId}] WebGL failed, falling back to Canvas:`, e);
      try {
        const canvasAddon = new CanvasAddon();
        term.loadAddon(canvasAddon);
        console.log(`[Terminal ${paneId}] Canvas renderer loaded.`);
      } catch (e2) {
        console.warn(`[Terminal ${paneId}] Canvas failed, using DOM renderer:`, e2);
      }
    }
  };

  const flushWriteBuffer = () => {
    if (xtermRef.current && writeBuffer.current) {
      try {
        xtermRef.current.write(writeBuffer.current);
        writeBuffer.current = '';
        isDirtyRef.current = true;
      } catch (e) {
        console.error('Failed to write to terminal:', e);
      }
    }
    writeRafId.current = null;
  };

  const fitTerminal = () => {
    if (!xtermRef.current || !fitAddonRef.current || !terminalRef.current) return;
    if (!xtermRef.current.element || !xtermRef.current.textarea) return;
    if (!isActiveRef.current) return;
    if (isFitPendingRef.current) return;

    const el = terminalRef.current;
    if (el.offsetWidth === 0 || el.offsetHeight === 0 || !document.body.contains(el)) return;

    isFitPendingRef.current = true;

    // Use requestAnimationFrame to debounce and prevent layout thrashing
    requestAnimationFrame(() => {
      isFitPendingRef.current = false;
      if (!xtermRef.current || !fitAddonRef.current || !isActiveRef.current) return;
      try {
        const oldCols = xtermRef.current.cols;
        const oldRows = xtermRef.current.rows;

        fitAddonRef.current.fit();

        const newCols = xtermRef.current.cols;
        const newRows = xtermRef.current.rows;

        // Only IPC if dimensions actually changed
        if ((oldCols !== newCols || oldRows !== newRows) && pidRef.current !== null) {
          window.electron.resizeTerminal(pidRef.current, newCols, newRows);
        }
      } catch (e) {
        console.warn('Terminal fit skipped:', e);
      }
    });
  };

  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
    onExitRef.current = onExit;
    onCommandRef.current = onCommand;
    onNotificationRef.current = onNotification;
    onClearRef.current = onClear;
    isActiveRef.current = isActive;

    if (isActive) {
      if (globalPtyRegistry[paneId]) {
        globalPtyRegistry[paneId].lastActive = Date.now();
      }

      // If terminal becomes active, flush both local and global buffers
      if (xtermRef.current) {
        if (globalPtyRegistry[paneId]?.dataBuffer?.length) {
          xtermRef.current.write(globalPtyRegistry[paneId].dataBuffer!.join(''));
          globalPtyRegistry[paneId].dataBuffer = [];
        }
        if (dataBuffer.current.length > 0) {
          xtermRef.current.write(dataBuffer.current.join(''));
          dataBuffer.current = [];
        }
        // Also trigger a fit after a short delay to ensure layout is ready
        setTimeout(fitTerminal, 50);
      }
    }
  }, [onTitleChange, onExit, onCommand, onNotification, onClear, isActive]);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Xterm({
      cursorBlink: true,
      fontSize,
      scrollback,
      lineHeight: 1.2,
      fontFamily: 'Consolas, monospace',
      theme: getTheme(theme, customTheme),
      allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((_, uri) => window.electron.openExternal(uri));
    const searchAddon = new SearchAddon();
    const serializeAddon = new SerializeAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(serializeAddon);
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    serializeAddonRef.current = serializeAddon;

    // Restore terminal buffer from localStorage if available
    const savedBuffer = localStorage.getItem(`terminal_buffer_${paneId}`);
    if (savedBuffer) {
      try {
        term.write(savedBuffer);
      } catch (e) {
        console.error('Failed to restore terminal buffer:', e);
      }
    }

    if (isActiveRef.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
      try {
        term.open(terminalRef.current);
        loadHighPerformanceRenderer(term);

        if (dataBuffer.current.length > 0) {
          term.write(dataBuffer.current.join(''));
          dataBuffer.current = [];
        }
        fitTerminal();
      } catch (e) {
        console.error('Failed to open terminal:', e);
      }
    }

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;

      if (isKeyMatch(e, keymap.find)) {
        setIsSearchOpen(true);
        return false;
      }
      if (isKeyMatch(e, keymap.copy)) {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          term.clearSelection();
        }
        return false;
      }
      if (isKeyMatch(e, keymap.paste)) {
        navigator.clipboard.readText().then((text) => {
          // eslint-disable-next-line no-control-regex
          const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
          term.paste(sanitized);
        });
        return false;
      }
      if (isKeyMatch(e, keymap.newLine)) {
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\n');
        }
        return false;
      }
      if (isKeyMatch(e, keymap.clearTerminal)) {
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\x0c');
        }
        return false;
      }

      // Allow navigation and global keybindings to bubble up to App.tsx
      if (
        isKeyMatch(e, keymap.newTab) ||
        isKeyMatch(e, keymap.closeTab) ||
        isKeyMatch(e, keymap.nextTab) ||
        isKeyMatch(e, keymap.prevTab) ||
        isKeyMatch(e, keymap.commandPalette)
      ) {
        return false;
      }

      // Prevent Tab from being swallowed if it's part of a navigation shortcut
      if (e.key === 'Tab' && e.ctrlKey) return false;

      return true;
    });

    if (onClearRef.current)
      onClearRef.current(() => {
        if (pidRef.current !== null) window.electron.writeTerminal(pidRef.current, '\x0c');
      });

    let isUnmounted = false;
    const setupPty = async () => {
      let pid: number;
      if (globalPtyRegistry[paneId]) {
        pid = globalPtyRegistry[paneId].pid;
        if (globalPtyRegistry[paneId].cleanupData) globalPtyRegistry[paneId].cleanupData!();
        if (globalPtyRegistry[paneId].cleanupExit) globalPtyRegistry[paneId].cleanupExit!();
      } else {
        // Wait for a single frame to ensure DOM is ready and measurements are accurate
        await new Promise((resolve) => requestAnimationFrame(resolve));

        if (isUnmounted) return;

        // Try to fit before creating PTY if element is already open
        if (term.element) {
          try {
            fitAddon.fit();
          } catch (e) {
            // Ignore
          }
        }

        pid = await window.electron.createTerminal({
          cols: term.cols || 80,
          rows: term.rows || 24,
          cwd,
          shell,
          envVars,
        });
        if (isPaneKilled(paneId)) {
          window.electron.killTerminal(pid);
          cleanupKilledPane(paneId);
          return;
        }
        globalPtyRegistry[paneId] = { pid, dataBuffer: [], lastActive: Date.now() };
        if (initialCommand)
          setTimeout(() => {
            if (!isUnmounted && globalPtyRegistry[paneId])
              window.electron.writeTerminal(pid, initialCommand + '\n');
          }, 500);
      } else {
        globalPtyRegistry[paneId].lastActive = Date.now();
      }

      if (isUnmounted) return;
      pidRef.current = pid;
      setIsReady(true);

      // Restore buffered data if any
      if (globalPtyRegistry[paneId]?.dataBuffer?.length) {
        if (term.element && isActiveRef.current) {
          term.write(globalPtyRegistry[paneId].dataBuffer!.join(''));
          globalPtyRegistry[paneId].dataBuffer = [];
        }
      }

      const cleanupData = window.electron.onTerminalData(pid, (data) => {
        if (isUnmounted) return;
        if (term.element && isActiveRef.current) {
          writeBuffer.current += data;
          if (writeRafId.current === null) {
            writeRafId.current = requestAnimationFrame(flushWriteBuffer);
          }
        } else {
          // Store in global registry for hibernation support
          if (globalPtyRegistry[paneId]) {
            if (!globalPtyRegistry[paneId].dataBuffer) globalPtyRegistry[paneId].dataBuffer = [];
            globalPtyRegistry[paneId].dataBuffer!.push(data);
            if (globalPtyRegistry[paneId].dataBuffer!.length > 1000)
              globalPtyRegistry[paneId].dataBuffer!.shift();
          }
          isDirtyRef.current = true;
        }
        if (!isActiveRef.current && onNotificationRef.current) {
          const lower = data.toLowerCase();
          const patterns = ['password', 'sudo', 'confirm', 'error:', 'failed', 'exception'];
          const match = patterns.find((p) => lower.includes(p));
          if (match) {
            if (['password', 'sudo', 'confirm'].includes(match))
              onNotificationRef.current('confirmation');
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
      term.onData((data) => {
        if (!isUnmounted && pidRef.current !== null)
          window.electron.writeTerminal(pidRef.current, data);
      });
      term.onResize((size) => {
        if (!isUnmounted && pidRef.current !== null)
          window.electron.resizeTerminal(pidRef.current, size.cols, size.rows);
      });
      term.onTitleChange((title) => {
        if (onTitleChangeRef.current) onTitleChangeRef.current(title);
      });
    };

    setupPty();

    const resizeObserver = new ResizeObserver(() => {
      if (isActiveRef.current) {
        fitTerminal();
      }
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    const handleResize = () => {
      if (!isActiveRef.current || !terminalRef.current || !term.element) return;
      fitTerminal();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      isUnmounted = true;
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      try {
        term.dispose();
      } catch (e) {
        console.error('Disposal failed:', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, shell, envVars, paneId, initialCommand]);

  useEffect(() => {
    if (xtermRef.current) xtermRef.current.options.theme = getTheme(theme, customTheme);
  }, [theme, customTheme]);
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      if (isActive) {
        fitTerminal();
      }
    }
  }, [fontSize, isActive]);
  useEffect(() => {
    if (xtermRef.current) xtermRef.current.options.scrollback = scrollback;
  }, [scrollback]);

  useEffect(() => {
    let rafId: number;
    if (isActive && terminalRef.current && xtermRef.current) {
      rafId = requestAnimationFrame(() => {
        const el = terminalRef.current;
        if (!el || !xtermRef.current || !isActiveRef.current) return;
        try {
          if (!xtermRef.current.element) {
            xtermRef.current.open(el);
            loadHighPerformanceRenderer(xtermRef.current);
            if (dataBuffer.current.length > 0) {
              xtermRef.current.write(dataBuffer.current.join(''));
              dataBuffer.current = [];
            }
          }
          requestAnimationFrame(() => {
            if (isActiveRef.current) fitTerminal();
          });
          if (pidRef.current !== null) {
            xtermRef.current.focus();
          }
        } catch (e) {
          console.error('Focus/Resize after activation failed:', e);
        }
      });
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isActive, isReady]);
  useEffect(() => {
    // Periodic buffer persistence (every 30 seconds)
    const interval = setInterval(() => {
      if (!isDirtyRef.current || !xtermRef.current || !serializeAddonRef.current) return;

      const performSave = () => {
        if (!xtermRef.current || !serializeAddonRef.current) return;
        try {
          // Serialize current buffer state
          const buffer = serializeAddonRef.current.serialize();
          localStorage.setItem(`terminal_buffer_${paneId}`, buffer);
          isDirtyRef.current = false;
        } catch (e) {
          console.error('Failed to serialize terminal buffer:', e);
        }
      };

      // Use requestIdleCallback if available to avoid blocking main thread
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(performSave, { timeout: 2000 });
      } else {
        performSave();
      }
    }, 30000);

    return () => {
      // Save one last time on unmount if dirty
      if (isDirtyRef.current && xtermRef.current && serializeAddonRef.current) {
        try {
          const buffer = serializeAddonRef.current.serialize();
          localStorage.setItem(`terminal_buffer_${paneId}`, buffer);
        } catch {
          // Ignore
        }
      }
      clearInterval(interval);
      if (writeRafId.current !== null) cancelAnimationFrame(writeRafId.current);
    };
  }, [paneId]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electron.showContextMenu('terminal');
  };

  useEffect(() => {
    if (!window.electron.onTerminalContextAction) return;

    const cleanup = window.electron.onTerminalContextAction((action: string) => {
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
            // eslint-disable-next-line no-control-regex
            const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
            term.paste(sanitized);
          });
          break;
        case 'split-horizontal':
          if (onSplitHorizontal) onSplitHorizontal();
          break;
        case 'split-vertical':
          if (onSplitVertical) onSplitVertical();
          break;
        case 'clear':
          if (pidRef.current !== null) {
            window.electron.writeTerminal(pidRef.current, '\x0c');
          }
          break;
      }
    });

    return cleanup;
  }, [onSplitHorizontal, onSplitVertical]);

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onContextMenu={handleContextMenu}
    >
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
          }}
        >
          <button
            onClick={onSplitHorizontal}
            style={{
              background: '#333',
              color: '#ccc',
              border: '1px solid #444',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '10px',
            }}
          >
            ━
          </button>
          <button
            onClick={onSplitVertical}
            style={{
              background: '#333',
              color: '#ccc',
              border: '1px solid #444',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '10px',
            }}
          >
            ┃
          </button>
          <button
            onClick={onClosePane}
            style={{
              background: '#333',
              color: '#ccc',
              border: '1px solid #444',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '10px',
            }}
          >
            ×
          </button>
        </div>
      )}
      {isSearchOpen && (
        <div className="terminal-search-bar" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchAddonRef.current?.findNext(e.target.value, searchOptions);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  searchAddonRef.current?.findPrevious(searchQuery, searchOptions);
                } else {
                  searchAddonRef.current?.findNext(searchQuery, searchOptions);
                }
              }
              if (e.key === 'Escape') {
                setIsSearchOpen(false);
                xtermRef.current?.focus();
              }
            }}
          />
          <button
            title="Case Sensitive"
            className={searchOptions.caseSensitive ? 'active-search-opt' : ''}
            onClick={() => {
              const newOpts = { ...searchOptions, caseSensitive: !searchOptions.caseSensitive };
              setSearchOptions(newOpts);
              searchAddonRef.current?.findNext(searchQuery, newOpts);
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
            onClick={() => searchAddonRef.current?.findPrevious(searchQuery, searchOptions)}
            title="Previous Match (Shift+Enter)"
          >
            ↑
          </button>
          <button
            onClick={() => searchAddonRef.current?.findNext(searchQuery, searchOptions)}
            title="Next Match (Enter)"
          >
            ↓
          </button>
          <button
            onClick={() => {
              setIsSearchOpen(false);
              xtermRef.current?.focus();
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      )}
      <div
        ref={terminalRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          contain: 'paint',
        }}
      />
    </div>
  );
};

export default Terminal;
