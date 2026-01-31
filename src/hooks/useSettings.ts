import { useState, useEffect } from 'react';
import { loadState, saveState } from './usePersistence';

export const useSettings = () => {
  const [terminalTheme, setTerminalTheme] = useState(() => loadState('terminalTheme', 'vscode'));
  const [terminalFontSize, setTerminalFontSize] = useState(() => loadState('terminalFontSize', 14));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    saveState('terminalTheme', terminalTheme);
  }, [terminalTheme]);

  useEffect(() => {
    saveState('terminalFontSize', terminalFontSize);
  }, [terminalFontSize]);

  useEffect(() => {
    window.electron.checkAdmin().then(setIsAdmin);
  }, []);

  const relaunchAdmin = () => {
    window.electron.relaunchAdmin();
  };

  return {
    terminalTheme,
    setTerminalTheme,
    terminalFontSize,
    setTerminalFontSize,
    isAdmin,
    relaunchAdmin,
  };
};