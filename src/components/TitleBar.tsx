import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Terminal, Sparkles, RotateCw, Minus, Square, Copy, X, Search } from 'lucide-react';

interface TitleBarProps {
  onOpenAiAssistant?: () => void;
  onRefreshDisplay?: () => void;
  onOpenQuickSwitcher?: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({
  onOpenAiAssistant,
  onRefreshDisplay,
  onOpenQuickSwitcher,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };
    checkMaximized();

    // Listen for resize to update maximized state
    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div className="titlebar-container draggable-area" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <div className="titlebar-brand" data-tauri-drag-region>
          <span className="titlebar-brand-icon" data-tauri-drag-region>
            <Terminal size={13} strokeWidth={2.2} />
          </span>
          CmdGUI
        </div>

        {onOpenAiAssistant && (
          <button
            className="titlebar-ai-chip non-draggable"
            onClick={onOpenAiAssistant}
            title="Open AI Command Generator (Alt+A / Ctrl+K)"
          >
            <Sparkles size={12} /> AI Hub
          </button>
        )}

        {onRefreshDisplay && (
          <button
            className="titlebar-btn non-draggable"
            onClick={onRefreshDisplay}
            title="Refresh Display (Ctrl+Alt+R) - Fix visual artifacts"
          >
            <RotateCw size={11} /> Redraw
          </button>
        )}
      </div>

      {onOpenQuickSwitcher && (
        <div
          className="titlebar-search-trigger non-draggable"
          onClick={onOpenQuickSwitcher}
          title="Open Command Palette & Quick Switcher (Ctrl+P)"
        >
          <Search size={12} />
          <span>Quick Switcher / &gt; commands</span>
          <kbd>Ctrl+P</kbd>
        </div>
      )}

      {/* Windows 11 Fluent Window Caption Controls */}
      <div className="titlebar-window-controls non-draggable">
        <button
          className="titlebar-window-ctrl"
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize Window"
        >
          <Minus size={14} />
        </button>
        <button
          className="titlebar-window-ctrl"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          aria-label="Maximize Window"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          className="titlebar-window-ctrl close"
          onClick={handleClose}
          title="Close"
          aria-label="Close Window"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
