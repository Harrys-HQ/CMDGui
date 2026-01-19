import React from 'react';

interface StatusBarProps {
  status: string;
  activeTabTitle?: string;
  tabCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, activeTabTitle, tabCount }) => {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="codicon codicon-remote"></span>
        <span style={{ background: '#007acc', padding: '0 8px', display: 'flex', alignItems: 'center', height: '100%' }}>
            WSL / Local
        </span>
      </div>
      <div className="status-item">
         <span style={{ opacity: 0.8 }}>{status}</span>
      </div>
      
      <div style={{ flex: 1 }} />
      
      {activeTabTitle && (
          <div className="status-item">
            <span>{activeTabTitle}</span>
          </div>
      )}
      <div className="status-item">
        <span>Tabs: {tabCount}</span>
      </div>
      <div className="status-item">
         <span>UTF-8</span>
      </div>
      <div className="status-item">
         <span>🔔</span>
      </div>
    </div>
  );
};

export default StatusBar;
