import { useState, useEffect } from 'react';
import { loadState, saveState } from './usePersistence';
import { TerminalTheme } from '../types';

const DEFAULT_CUSTOM_THEME: TerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  cursorAccent: '#000000',
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

export const useSettings = () => {
  const [terminalTheme, setTerminalTheme] = useState('vscode');
  const [customTheme, setCustomTheme] = useState<TerminalTheme>(DEFAULT_CUSTOM_THEME);
  const [terminalFontSize, setTerminalFontSize] = useState(14);
  const [terminalScrollback, setTerminalScrollback] = useState(1000);
  const [isQuakeModeEnabled, setIsQuakeModeEnabled] = useState(false);
  const [defaultShell, setDefaultShell] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedTheme = await loadState('terminalTheme', 'vscode');
      const savedCustomTheme = await loadState<TerminalTheme>('customTheme', DEFAULT_CUSTOM_THEME);
      const savedFontSize = await loadState('terminalFontSize', 14);
      const savedScrollback = await loadState('terminalScrollback', 1000);
      const savedQuakeMode = await loadState('isQuakeModeEnabled', false);
      const savedShell = await loadState('defaultShell', '');
      
      setTerminalTheme(savedTheme);
      setCustomTheme({ ...DEFAULT_CUSTOM_THEME, ...savedCustomTheme });
      setTerminalFontSize(savedFontSize);
      setTerminalScrollback(savedScrollback);
      setIsQuakeModeEnabled(savedQuakeMode);
      setDefaultShell(savedShell);
      setIsLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState('terminalTheme', terminalTheme);
    }
  }, [terminalTheme, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('customTheme', customTheme);
    }
  }, [customTheme, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('terminalFontSize', terminalFontSize);
    }
  }, [terminalFontSize, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('terminalScrollback', terminalScrollback);
    }
  }, [terminalScrollback, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('isQuakeModeEnabled', isQuakeModeEnabled);
      window.electron.setQuakeMode(isQuakeModeEnabled);
    }
  }, [isQuakeModeEnabled, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveState('defaultShell', defaultShell);
    }
  }, [defaultShell, isLoaded]);

  useEffect(() => {
    window.electron.checkAdmin().then(setIsAdmin);
    
    // Sync quake mode initial state with main process
    const syncQuake = async () => {
      const savedQuakeMode = await loadState('isQuakeModeEnabled', false);
      window.electron.setQuakeMode(savedQuakeMode);
    };
    syncQuake();
  }, []);

  const relaunchAdmin = () => {
    window.electron.relaunchAdmin();
  };

  return {
    terminalTheme,
    setTerminalTheme,
    customTheme,
    setCustomTheme,
    terminalFontSize,
    setTerminalFontSize,
    terminalScrollback,
    setTerminalScrollback,
    isQuakeModeEnabled,
    setIsQuakeModeEnabled,
    defaultShell,
    setDefaultShell,
    isAdmin,
    relaunchAdmin,
  };
};