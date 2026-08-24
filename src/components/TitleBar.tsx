import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Terminal, Sparkles, Minus, Square, Copy, X } from 'lucide-react';

interface TitleBarProps {
  onOpenAiAssistant?: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ onOpenAiAssistant }) => {
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
    <div
      className="draggable-area"
      data-tauri-drag-region
      style={
        {
          height: '32px',
          width: '100%',
          backgroundColor: 'var(--bg-sidebar)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          zIndex: 9999,
        } as React.CSSProperties
      }
    >
      <div
        data-tauri-drag-region
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--fg-active)',
          paddingLeft: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
          <span data-tauri-drag-region style={{ marginRight: '8px', display: 'flex', alignItems: 'center', color: 'var(--accent-primary)' }}>
            <Terminal size={14} />
          </span>
          CmdGUI
        </div>

        {onOpenAiAssistant && (
          <button
            className="non-draggable"
            onClick={onOpenAiAssistant}
            title="Open AI Command Generator"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={12} /> AI Assistant
          </button>
        )}
      </div>

      {/* Custom Window Controls */}
      <div style={{ display: 'flex', height: '100%' }}>
        <button
          onClick={handleMinimize}
          title="Minimize"
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          title={isMaximized ? "Restore Down" : "Maximize"}
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          title="Close"
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e81123';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--fg-secondary)';
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
