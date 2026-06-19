import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC = () => {
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
          backgroundColor: '#1e1e1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderBottom: '1px solid #333',
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
          color: '#d4d4d4',
          paddingLeft: '16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span data-tauri-drag-region style={{ marginRight: '8px' }}>
          ⚡
        </span>
        CmdGUI
      </div>

      {/* Custom Window Controls */}
      <div style={{ display: 'flex', height: '100%' }}>
        <button
          onClick={handleMinimize}
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#a0a0a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          ─
        </button>
        <button
          onClick={handleMaximize}
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#a0a0a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {isMaximized ? '❐' : '☐'}
        </button>
        <button
          onClick={handleClose}
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#a0a0a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e81123';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#a0a0a0';
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
