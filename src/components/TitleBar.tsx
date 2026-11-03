import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Terminal, Sparkles, RotateCw, Minus, Square, Copy, X, Search, Zap } from 'lucide-react';

interface TitleBarProps {
  onOpenAiAssistant?: () => void;
  onRefreshDisplay?: () => void;
  onOpenQuickSwitcher?: () => void;
  onToggleDualBrainStudio?: () => void;
  isDualBrainStudioActive?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({
  onOpenAiAssistant,
  onRefreshDisplay,
  onOpenQuickSwitcher,
  onToggleDualBrainStudio,
  isDualBrainStudioActive,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = React.useMemo(() => {
    try {
      return typeof window !== 'undefined' ? getCurrentWindow() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!appWindow) return;
    let isMounted = true;
    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        if (isMounted) setIsMaximized(maximized);
      } catch {
        /* ignore */
      }
    };
    checkMaximized();

    // Listen for resize to update maximized state
    let unlistenFn: (() => void) | undefined;
    try {
      appWindow.onResized(() => {
        checkMaximized();
      }).then((fn) => {
        unlistenFn = fn;
      }).catch(() => {});
    } catch {
      /* ignore */
    }

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, [appWindow]);

  const handleMinimize = () => {
    try {
      appWindow?.minimize().catch(() => {});
    } catch {
      /* ignore */
    }
  };
  const handleMaximize = () => {
    try {
      appWindow?.toggleMaximize().catch(() => {});
    } catch {
      /* ignore */
    }
  };
  const handleClose = () => {
    try {
      appWindow?.close().catch(() => {});
    } catch {
      /* ignore */
    }
  };

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

        {onToggleDualBrainStudio && (
          <button
            className={`titlebar-ai-chip non-draggable ${isDualBrainStudioActive ? 'active' : ''}`}
            onClick={onToggleDualBrainStudio}
            title="Open Mission Control: route tasks, automate handoffs, and validate results"
            style={{
              background: isDualBrainStudioActive
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))'
                : undefined,
              borderColor: isDualBrainStudioActive ? 'var(--neon-amber)' : undefined,
              color: isDualBrainStudioActive ? '#fff' : undefined,
            }}
          >
            <Zap size={12} style={{ color: 'var(--neon-amber)' }} /> Mission Control
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
