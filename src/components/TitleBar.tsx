import React from 'react';

const TitleBar: React.FC = () => {
  return (
    <div
      style={{
        height: '32px',
        width: '100%',
        backgroundColor: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '16px',
        WebkitAppRegion: 'drag', // Make it draggable
        userSelect: 'none',
        borderBottom: '1px solid #333',
        flexShrink: 0,
        zIndex: 9999,
      } as React.CSSProperties}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d4' }}>
        <span style={{ marginRight: '8px' }}>⚡</span>
        CmdGUI
      </div>
    </div>
  );
};

export default TitleBar;
