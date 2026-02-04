import { useState, useEffect } from 'react';
import { loadState, saveState } from './usePersistence';

export const useSettings = () => {
  const [terminalTheme, setTerminalTheme] = useState('vscode');
  const [terminalFontSize, setTerminalFontSize] = useState(14);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedTheme = await loadState('terminalTheme', 'vscode');
      const savedFontSize = await loadState('terminalFontSize', 14);
      setTerminalTheme(savedTheme);
      setTerminalFontSize(savedFontSize);
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
      saveState('terminalFontSize', terminalFontSize);
    }
  }, [terminalFontSize, isLoaded]);

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