import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

interface TerminalProps {
  cwd?: string;
  isActive: boolean;
  onTitleChange?: (title: string) => void;
  onExit?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ cwd, isActive, onTitleChange, onExit }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Xterm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
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
      },
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(terminalRef.current);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.attachCustomKeyEventHandler((e) => {
      // Copy: Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC' && e.type === 'keydown') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          return false;
        }
      }

      // Paste: Ctrl + Shift + V
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyV' && e.type === 'keydown') {
        navigator.clipboard.readText().then(text => {
          term.paste(text);
        });
        return false;
      }

      // Allow these shortcuts to propagate to the window
      if (e.ctrlKey && (e.key === 't' || e.key === 'w' || e.key === 'Tab')) {
        return false;
      }
      return true;
    });

    fitAddon.fit();

    // Create backend terminal process
    window.electron.createTerminal({
      cols: term.cols,
      rows: term.rows,
      cwd
    }).then(pid => {
      pidRef.current = pid;
      setIsReady(true);

      const cleanupData = window.electron.onTerminalData(pid, (data) => {
        term.write(data);
      });

      term.onData(data => {
        window.electron.writeTerminal(pid, data);
      });
      
      term.onResize(size => {
          window.electron.resizeTerminal(pid, size.cols, size.rows);
      });
      
      term.onTitleChange((title) => {
          if (onTitleChange) onTitleChange(title);
      });

      window.electron.onTerminalExit(pid, () => {
          term.write('\r\n\x1b[31mTerminal exited.\x1b[0m\r\n');
          if (onExit) onExit();
      });

      // Handle unmount
      return () => {
          cleanupData();
          window.electron.killTerminal(pid);
      };
    });

    const handleResize = () => {
        fitAddon.fit();
        if (pidRef.current !== null) {
            window.electron.resizeTerminal(pidRef.current, term.cols, term.rows);
        }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []); // Empty dependency array ensures this runs once per mount

  // Handle active state changes to refit the terminal
  useEffect(() => {
      if (isActive && fitAddonRef.current && xtermRef.current) {
          // Small delay to allow layout to settle
          requestAnimationFrame(() => {
             fitAddonRef.current?.fit();
             if (pidRef.current !== null && xtermRef.current) {
                window.electron.resizeTerminal(pidRef.current, xtermRef.current.cols, xtermRef.current.rows);
                xtermRef.current.focus();
            }
          });
      }
  }, [isActive, isReady]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
};

export default Terminal;
