import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  isAdmin?: boolean;
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
  isGPUAccelerationEnabled?: boolean;
  isYoloModeEnabled?: boolean;
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
  isAdmin = false,
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
  isGPUAccelerationEnabled = true,
  isYoloModeEnabled = false,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const pidRef = useRef<string | null>(null);
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
  const activeCwdRef = useRef(cwd || '');
  const isYoloModeRef = useRef(isYoloModeEnabled);

  useEffect(() => {
    isYoloModeRef.current = isYoloModeEnabled;
  }, [isYoloModeEnabled]);

  useEffect(() => {
    activeCwdRef.current = cwd || '';
  }, [cwd]);

  const envVarsString = JSON.stringify(envVars);

  const fitTimeoutRef = useRef<any>(null);
  const isSettingUpRef = useRef(false);
  const writeRafId = useRef<number | null>(null);
  const lastAutoResponseTimeRef = useRef<number>(0);
  const lastAutoRespondedPromptRef = useRef<string>('');
  const rendererAddonRef = useRef<any>(null);

  const loadHighPerformanceRenderer = useCallback(
    (term: Xterm) => {
      if (!isGPUAccelerationEnabled || !term.element) return;
      if (rendererAddonRef.current) {
        try {
          rendererAddonRef.current.dispose();
        } catch {}
        rendererAddonRef.current = null;
      }
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon.dispose();
          if (rendererAddonRef.current === webglAddon) {
            rendererAddonRef.current = null;
          }
        });
        term.loadAddon(webglAddon);
        rendererAddonRef.current = webglAddon;
        console.log(`[Terminal ${paneId}] WebGL renderer loaded.`);
      } catch (e) {
        console.warn(`[Terminal ${paneId}] WebGL failed, falling back to Canvas:`, e);
        try {
          const canvasAddon = new CanvasAddon();
          term.loadAddon(canvasAddon);
          rendererAddonRef.current = canvasAddon;
          console.log(`[Terminal ${paneId}] Canvas renderer loaded.`);
        } catch (e2) {
          console.warn(`[Terminal ${paneId}] Canvas failed, using DOM renderer:`, e2);
        }
      }
    },
    [paneId, isGPUAccelerationEnabled]
  );

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

    const el = terminalRef.current;
    if (el.offsetWidth === 0 || el.offsetHeight === 0 || !document.body.contains(el)) return;

    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
    }

    fitTimeoutRef.current = setTimeout(() => {
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
    }, 50);
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
  }, [onTitleChange, onExit, onCommand, onNotification, onClear, isActive, paneId]);

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
    const searchAddon = new SearchAddon();
    const serializeAddon = new SerializeAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(serializeAddon);

    // Track CWD via OSC 7 escape sequences
    term.parser.registerOscHandler(7, (data) => {
      try {
        if (data.startsWith('file://')) {
          const url = new URL(data);
          let path = url.pathname;
          if (path.startsWith('/') && path.charAt(2) === ':') {
            path = path.slice(1);
          }
          activeCwdRef.current = decodeURIComponent(path);
          return true;
        }
      } catch (e) {
        console.error('Failed to parse OSC 7 directory:', e);
      }
      return false;
    });

    // Helper to get full wrapped line range and text around bufferLineNumber
    // Helper to get full wrapped line range and text around bufferLineNumber
    const getWrappedLineText = (lineNum: number) => {
      const buffer = term.buffer.active;
      let startLineIdx = lineNum - 1;

      // In xterm.js, line.isWrapped is TRUE on line N if line N is a continuation of line N-1.
      while (startLineIdx > 0 && buffer.getLine(startLineIdx)?.isWrapped) {
        startLineIdx--;
      }

      let endLineIdx = lineNum - 1;
      while (endLineIdx + 1 < buffer.length && buffer.getLine(endLineIdx + 1)?.isWrapped) {
        endLineIdx++;
      }

      let fullText = '';
      const lineOffsets: { lineIdx: number; startChar: number; length: number }[] = [];
      for (let i = startLineIdx; i <= endLineIdx; i++) {
        const l = buffer.getLine(i);
        if (l) {
          // translateToString(true) trims trailing whitespace from each terminal row
          const text = l.translateToString(true).replace(/[\r\n]+/g, '');
          lineOffsets.push({ lineIdx: i, startChar: fullText.length, length: text.length });
          fullText += text;
        }
      }

      return { startLineIdx, endLineIdx, fullText, lineOffsets };
    };

    // Convert character offset in fullText to { x, y } xterm 1-indexed coordinates
    const getCharPosition = (charIdx: number, lineOffsets: { lineIdx: number; startChar: number; length: number }[]) => {
      for (let i = 0; i < lineOffsets.length; i++) {
        const line = lineOffsets[i];
        const nextStart = i + 1 < lineOffsets.length ? lineOffsets[i + 1].startChar : Infinity;
        if (charIdx >= line.startChar && charIdx < nextStart) {
          const localCol = charIdx - line.startChar;
          return { x: localCol + 1, y: line.lineIdx + 1 };
        }
      }
      const last = lineOffsets[lineOffsets.length - 1];
      return { x: last.length + 1, y: last.lineIdx + 1 };
    };

    // 1. Register a provider for URLs, absolute file URLs, and path links across wrapped lines
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const lineIdx = bufferLineNumber - 1;
        const { startLineIdx, endLineIdx, fullText, lineOffsets } = getWrappedLineText(bufferLineNumber);
        const links: any[] = [];

        // Match http/https URLs: e.g. https://github.com/Harrys-HQ/CMDGui/releases/tag/v2.2.0
        const httpUrlRegex = /https?:\/\/[^\s"'<>()]+/gi;
        let match;
        while ((match = httpUrlRegex.exec(fullText)) !== null) {
          let url = match[0].replace(/[)\].,;:]+$/, '');
          const matchStart = match.index;
          const matchEnd = matchStart + url.length;

          const startPos = getCharPosition(matchStart, lineOffsets);
          const endPos = getCharPosition(matchEnd - 1, lineOffsets);

          if (lineIdx >= startPos.y - 1 && lineIdx <= endPos.y - 1) {
            // For xterm.js multi-line link highlights on bufferLineNumber line:
            // Calculate start and end columns for the current bufferLineNumber line segment
            let segStartX = 1;
            let segEndX = term.cols;

            if (lineIdx === startPos.y - 1) {
              segStartX = startPos.x;
            }
            if (lineIdx === endPos.y - 1) {
              segEndX = endPos.x;
            }

            links.push({
              text: url,
              range: {
                start: { x: segStartX, y: bufferLineNumber },
                end: { x: segEndX, y: bufferLineNumber }
              },
              activate() {
                const cleanUrl = url.replace(/\s+/g, '');
                if (window.electron && window.electron.openExternal) {
                  window.electron.openExternal(cleanUrl);
                }
              }
            });
          }
        }

        // Match file:/// links: e.g. file:///C:/path/to/file.ext or file:///C:\path\to\file.ext
        const fileUriRegex = /file:\/\/\/[a-zA-Z]:[/\\][^\s"'<>()]+|file:\/\/\/[^\s"'<>()]+/g;
        while ((match = fileUriRegex.exec(fullText)) !== null) {
          let uri = match[0].replace(/[)\].,;:]+$/, '');
          const matchStart = match.index;
          const matchEnd = matchStart + uri.length;

          const startPos = getCharPosition(matchStart, lineOffsets);
          const endPos = getCharPosition(matchEnd - 1, lineOffsets);

          if (lineIdx >= startPos.y - 1 && lineIdx <= endPos.y - 1) {
            let segStartX = 1;
            let segEndX = term.cols;
            if (lineIdx === startPos.y - 1) segStartX = startPos.x;
            if (lineIdx === endPos.y - 1) segEndX = endPos.x;

            links.push({
              text: uri,
              range: {
                start: { x: segStartX, y: bufferLineNumber },
                end: { x: segEndX, y: bufferLineNumber }
              },
              activate() {
                let filePath = uri.replace(/^file:\/\/\//, '');
                if (/^[a-zA-Z]:\//.test(filePath)) {
                  filePath = filePath.replace(/\//g, '\\');
                }
                if (window.electron && window.electron.openLocalPath) {
                  window.electron.openLocalPath(decodeURIComponent(filePath));
                }
              }
            });
          }
        }

        // Match Windows absolute paths: e.g. C:\path\to\file.ext or C:/path/to/file.ext
        const winPathRegex = /[a-zA-Z]:[/\\][^\s"'<>()]+/g;
        while ((match = winPathRegex.exec(fullText)) !== null) {
          let pathStr = match[0];
          const matchStart = match.index;

          const prevStr = fullText.substring(Math.max(0, matchStart - 8), matchStart);
          if (prevStr.includes('file:///')) {
            continue;
          }

          pathStr = pathStr.replace(/[)\].,;:]+$/, '');
          const matchEnd = matchStart + pathStr.length;

          const startPos = getCharPosition(matchStart, lineOffsets);
          const endPos = getCharPosition(matchEnd - 1, lineOffsets);

          if (lineIdx >= startPos.y - 1 && lineIdx <= endPos.y - 1) {
            let segStartX = 1;
            let segEndX = term.cols;
            if (lineIdx === startPos.y - 1) segStartX = startPos.x;
            if (lineIdx === endPos.y - 1) segEndX = endPos.x;

            links.push({
              text: pathStr,
              range: {
                start: { x: segStartX, y: bufferLineNumber },
                end: { x: segEndX, y: bufferLineNumber }
              },
              activate() {
                if (window.electron && window.electron.openLocalPath) {
                  window.electron.openLocalPath(pathStr);
                }
              }
            });
          }
        }

        callback(links.length > 0 ? links : undefined);
      }
    });

    // 2. Register an asynchronous provider for active workspace relative files across wrapped lines
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const lineIdx = bufferLineNumber - 1;
        const { startLineIdx, endLineIdx, fullText, lineOffsets } = getWrappedLineText(bufferLineNumber);
        const links: any[] = [];

        // Match possible relative paths: e.g. src/App.tsx, package.json, CmdGUI_2.1.1_x64-setup.exe, setup.exe
        const relativePathRegex = /(?:[a-zA-Z0-9_\-\.\/\\]+)\.(?:exe|msi|bat|cmd|ps1|tsx|ts|jsx|js|json|md|txt|log|png|jpg|css|html)/gi;
        const relativeMatches: { text: string; matchStart: number }[] = [];
        let match;
        while ((match = relativePathRegex.exec(fullText)) !== null) {
          let matchedStr = match[0];
          const matchStart = match.index;
          
          // Avoid duplicate matching if it has file:/// prefix or C:\ prefix
          const prevStr = fullText.substring(Math.max(0, matchStart - 8), matchStart);
          if (prevStr.includes('file:///')) {
            continue;
          }
          if (/[a-zA-Z]:\\/.test(fullText.substring(Math.max(0, matchStart - 3), matchStart + 3))) {
            continue;
          }
          if (matchedStr.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(matchedStr)) {
            continue;
          }
          
          matchedStr = matchedStr.replace(/[)\].,;:]+$/, '');
          relativeMatches.push({ text: matchedStr, matchStart });
        }

        const currentCwd = activeCwdRef.current;
        if (currentCwd && relativeMatches.length > 0) {
          const promises = relativeMatches.map(async (m) => {
            const separator = currentCwd.includes('/') ? '/' : '\\';
            const cleanRel = m.text.replace(/[\/\\]/g, separator);
            const fullPath = `${currentCwd}${separator}${cleanRel}`;
            
            try {
              const info = await window.electron.getProjectInfo(fullPath);
              if (info) {
                const matchStart = m.matchStart;
                const matchEnd = matchStart + m.text.length;
                const startPos = getCharPosition(matchStart, lineOffsets);
                const endPos = getCharPosition(matchEnd - 1, lineOffsets);

                if (lineIdx >= startPos.y - 1 && lineIdx <= endPos.y - 1) {
                  let segStartX = 1;
                  let segEndX = term.cols;
                  if (lineIdx === startPos.y - 1) segStartX = startPos.x;
                  if (lineIdx === endPos.y - 1) segEndX = endPos.x;

                  links.push({
                    text: fullPath,
                    range: {
                      start: { x: segStartX, y: bufferLineNumber },
                      end: { x: segEndX, y: bufferLineNumber }
                    },
                    activate() {
                      if (window.electron && window.electron.openLocalPath) {
                        window.electron.openLocalPath(fullPath);
                      }
                    }
                  });
                }
              }
            } catch (e) {
              // Ignore folder check failure
            }
          });
          
          Promise.all(promises).then(() => {
            callback(links.length > 0 ? links : undefined);
          });
        } else {
          callback(undefined);
        }
      }
    });

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

    // term.open is handled exclusively by the activation useEffect below to prevent duplicate visual instances.

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;

      if (isKeyMatch(e, keymap.find)) {
        e.preventDefault();
        setIsSearchOpen(true);
        return false;
      }
      if (isKeyMatch(e, keymap.copy)) {
        e.preventDefault();
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          term.clearSelection();
        }
        return false;
      }
      if (isKeyMatch(e, keymap.paste)) {
        e.preventDefault();
        window.electron.readClipboard().then((text) => {
          // eslint-disable-next-line no-control-regex
          const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
          term.paste(sanitized);
        }).catch((err) => console.error('Clipboard paste failed:', err));
        return false;
      }
      if (isKeyMatch(e, keymap.newLine)) {
        e.preventDefault();
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\n');
        }
        return false;
      }
      if (isKeyMatch(e, keymap.splitHorizontal)) {
        e.preventDefault();
        if (onSplitHorizontal) onSplitHorizontal();
        return false;
      }
      if (isKeyMatch(e, keymap.splitVertical)) {
        e.preventDefault();
        if (onSplitVertical) onSplitVertical();
        return false;
      }
      if (isKeyMatch(e, keymap.closePane)) {
        e.preventDefault();
        if (onClosePane) onClosePane();
        return false;
      }
      if (isKeyMatch(e, keymap.clearTerminal)) {
        e.preventDefault();
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\x0c');
          if (xtermRef.current) {
            xtermRef.current.clear();
            xtermRef.current.write('\x1b[2J\x1b[H');
          }
          localStorage.removeItem(`terminal_buffer_${paneId}`);
        }
        return false;
      }

      // Allow navigation and global keybindings to bubble up to App.tsx
      if (
        isKeyMatch(e, keymap.newTab) ||
        isKeyMatch(e, keymap.closeTab) ||
        isKeyMatch(e, keymap.nextTab) ||
        isKeyMatch(e, keymap.prevTab) ||
        isKeyMatch(e, keymap.commandPalette) ||
        isKeyMatch(e, keymap.toggleSidebar)
      ) {
        return false;
      }

      // Prevent Tab from being swallowed if it's part of a navigation shortcut
      if (e.key === 'Tab' && e.ctrlKey) return false;

      return true;
    });

    if (onClearRef.current)
      onClearRef.current(() => {
        if (pidRef.current !== null) {
          window.electron.writeTerminal(pidRef.current, '\x0c');
          if (xtermRef.current) {
            xtermRef.current.clear();
            xtermRef.current.write('\x1b[2J\x1b[H');
          }
          localStorage.removeItem(`terminal_buffer_${paneId}`);
        }
      });

    let isUnmounted = false;
    const setupPty = async () => {
      if (isSettingUpRef.current) return;
      isSettingUpRef.current = true;
      try {
        let pid: string;
        if (globalPtyRegistry[paneId]) {
          pid = globalPtyRegistry[paneId].pid;
          if (globalPtyRegistry[paneId].cleanupData) globalPtyRegistry[paneId].cleanupData!();
          if (globalPtyRegistry[paneId].cleanupExit) globalPtyRegistry[paneId].cleanupExit!();
          globalPtyRegistry[paneId].lastActive = Date.now();
        } else {
          // Wait for a single frame to ensure DOM is ready and measurements are accurate
          await new Promise((resolve) => requestAnimationFrame(resolve));

          if (isUnmounted) return;

        // Try to fit before creating PTY if element is already open
        if (term.element) {
          try {
            fitAddon.fit();
          } catch {
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
      }

      if (isUnmounted) return;
      pidRef.current = pid;
      setIsReady(true);
      term.focus();

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

        // Clean ANSI escape sequences for robust pattern matching across interactive terminals
        const stripAnsi = (str: string) =>
          // eslint-disable-next-line no-control-regex
          str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

        const rawRecent = (globalPtyRegistry[paneId]?.dataBuffer || []).slice(-10).join('');
        const combinedClean = (stripAnsi(rawRecent) + ' ' + stripAnsi(data)).toLowerCase();

        const confirmationPatterns = [
          '[y/n]',
          '(y/n)',
          'proceed?',
          'confirm?',
          'are you sure',
          'continue?',
          'do you want to continue',
          'override?',
          'overwrite?',
          'requesting permission for',
          'do you want to proceed',
          'accept this file edit',
          'accept this edit',
          '1. yes',
          '> 1. yes',
          '1. yes, accept',
          'shift+tab to auto-approve',
          'shift+tab to approve',
          'accept this',
          'reject this',
        ];
        const destructivePatterns = [
          // File system & OS destruction
          'drop database', 'rm -rf', 'format', 'prod', 'production', 'delete all', 'truncate', 'sudo rm', 'del /s', 'rd /s', 'remove-item -recurse', 'force',
          // Git destructive actions
          'hard reset', 'reset --hard', 'push --force', 'push -f', 'clean -fd', 'branch -d', 'branch -D',
          // Package Manager destructive / publish actions
          'npm publish', 'yarn publish', 'pnpm publish', 'cargo publish', 'pip uninstall', 'npm un', 'yarn remove',
          // Cloud & Infrastructure
          'terraform destroy', 'docker system prune', 'docker rm -f', 'docker rmi -f', 'kubectl delete', 'aws s3 rm --recursive',
          // DB Operations
          'drop table', 'schema drop', 'migrate:reset', 'db:drop', 'db:reset'
        ];
        
        const isConfirmationPrompt = confirmationPatterns.some((p) => combinedClean.includes(p));
        const isDestructiveCommand = destructivePatterns.some((p) => combinedClean.includes(p));

        const now = Date.now();
        const matchedPattern = confirmationPatterns.find((p) => combinedClean.includes(p)) || '';
        const isDuplicateTrigger = (now - lastAutoResponseTimeRef.current < 2000) && (lastAutoRespondedPromptRef.current === matchedPattern);

        if (isConfirmationPrompt && onNotificationRef.current) {
          if (isYoloModeRef.current && pidRef.current !== null && !isDuplicateTrigger) {
            if (isDestructiveCommand) {
              console.warn('[YOLO Guardrail] Automated approval blocked due to destructive command pattern match.');
              onNotificationRef.current('confirmation');
            } else {
              // Determine response key:
              // 1. Shift+Tab sequence '\x1b[Z' for AI auto-approve prompts
              // 2. Carriage Return / Enter '\r' for highlighted menu options (e.g. '> 1. Yes', 'Do you want to proceed?')
              // 3. Option '1\r' or standard 'y\r'
              const isShiftTabPrompt = combinedClean.includes('shift+tab');
              const isHighlightedMenu = combinedClean.includes('> 1. yes') || combinedClean.includes('do you want to proceed');
              const isNumberedOption = combinedClean.includes('1. yes') || combinedClean.includes('1.');
              
              const responseKey = isShiftTabPrompt 
                ? '\x1b[Z' 
                : isHighlightedMenu 
                  ? '\r' 
                  : isNumberedOption 
                    ? '1\r' 
                    : 'y\r';
              
              lastAutoResponseTimeRef.current = now;
              lastAutoRespondedPromptRef.current = matchedPattern;

              setTimeout(() => {
                if (pidRef.current !== null) {
                  window.electron.writeTerminal(pidRef.current, responseKey);
                }
              }, 150);
            }
          } else if (!isYoloModeRef.current || isDestructiveCommand) {
            // Standard confirmation notification when YOLO is disabled or destructive command requires manual review
            onNotificationRef.current('confirmation');
          }
        }

        if (!isActiveRef.current && onNotificationRef.current) {
          const patterns = ['password', 'sudo', 'confirm', 'error:', 'failed', 'exception', '[y/n]', 'proceed?', 'are you sure', 'requesting permission'];
          const match = patterns.find((p) => combinedClean.includes(p));
          if (match) {
            if (['password', 'sudo', 'confirm', '[y/n]', 'proceed?', 'are you sure', 'requesting permission'].includes(match))
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
        if (!isUnmounted)
          window.electron.writeTerminal(pid, data);
      });
      term.onResize((size) => {
        if (!isUnmounted && pidRef.current !== null)
          window.electron.resizeTerminal(pidRef.current, size.cols, size.rows);
      });
      } catch (e) {
        console.error('PTY setup failed:', e);
        try {
          term.write(`\r\n\x1b[31m[Error] PTY setup failed: ${e}\x1b[0m\r\n`);
        } catch {}
      } finally {
        isSettingUpRef.current = false;
      }
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
      if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      try {
        term.dispose();
      } catch (e) {
        console.error('Disposal failed:', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, shell, envVarsString, paneId, initialCommand]);

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
    let timerId: any;
    if (isActive && terminalRef.current && xtermRef.current) {
      rafId = requestAnimationFrame(() => {
        const el = terminalRef.current;
        if (!el || !xtermRef.current || !isActiveRef.current) return;
        try {
          if (!xtermRef.current.element) {
            el.innerHTML = '';
            xtermRef.current.open(el);
            loadHighPerformanceRenderer(xtermRef.current);
            if (dataBuffer.current.length > 0) {
              xtermRef.current.write(dataBuffer.current.join(''));
              dataBuffer.current = [];
            }
          } else {
            // Re-load to recreate the Canvas/WebGL surface after display: none -> block transition
            loadHighPerformanceRenderer(xtermRef.current);
            xtermRef.current.refresh(0, xtermRef.current.rows - 1);
          }
          requestAnimationFrame(() => {
            if (isActiveRef.current) fitTerminal();
          });
          xtermRef.current.focus();
        } catch (e) {
          console.error('Focus/Resize after activation failed:', e);
        }
      });

      // Extra safety check: run a delayed fit in case layout rendering has a sub-millisecond transition
      timerId = setTimeout(() => {
        if (isActiveRef.current && xtermRef.current) {
          fitTerminal();
          xtermRef.current.focus();
        }
      }, 60);
    } else {
      // If inactive, dispose high performance renderer to free resources and prevent context loss
      if (rendererAddonRef.current) {
        try {
          rendererAddonRef.current.dispose();
        } catch {}
        rendererAddonRef.current = null;
      }
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, isReady, loadHighPerformanceRenderer]);
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
        (
          window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }
        ).requestIdleCallback(performSave, { timeout: 2000 });
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
          window.electron.readClipboard().then((text) => {
            // eslint-disable-next-line no-control-regex
            const sanitized = text.replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '');
            term.paste(sanitized);
          }).catch((err) => console.error('Clipboard paste failed:', err));
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
            if (xtermRef.current) {
              xtermRef.current.clear();
              xtermRef.current.write('\x1b[2J\x1b[H');
            }
            localStorage.removeItem(`terminal_buffer_${paneId}`);
          }
          break;
      }
    });

    return cleanup;
  }, [onSplitHorizontal, onSplitVertical, paneId]);

  return (
    <div
      className={`terminal-wrapper ${isActive ? 'active' : ''} ${isAdmin ? 'admin-session' : ''} ${isYoloModeEnabled ? 'yolo-active' : ''}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (xtermRef.current) {
          xtermRef.current.focus();
        }
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '8px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isAdmin && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none',
            }}
          >
            🛡️ ELEVATED
          </span>
        )}
        {isYoloModeEnabled && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'rgba(245, 158, 11, 0.25)',
              color: '#fbbf24',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none',
            }}
          >
            ⚡ YOLO ACTIVE
          </span>
        )}
        {showPaneControls && (
          <div
            className="pane-controls"
            style={{
              display: 'flex',
              gap: '4px',
              opacity: 0.7,
            }}
          >
            <button
              onClick={onSplitHorizontal}
              title="Split Horizontal"
              style={{
                background: '#222',
                color: '#ccc',
                border: '1px solid #444',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: '3px',
              }}
            >
              ━
            </button>
            <button
              onClick={onSplitVertical}
              title="Split Vertical"
              style={{
                background: '#222',
                color: '#ccc',
                border: '1px solid #444',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: '3px',
              }}
            >
              ┃
            </button>
            <button
              onClick={onClosePane}
              title="Close Pane"
              style={{
                background: '#222',
                color: '#ccc',
                border: '1px solid #444',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: '3px',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
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
        }}
      />
    </div>
  );
};

export default Terminal;
