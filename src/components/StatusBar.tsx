import React from 'react';

interface StatusBarProps {
  status: string;
  activeTabTitle?: string;
  tabCount: number;
  isUpdateAvailable?: boolean;
  onShowUpdates?: () => void;
  onToggleQuickSwitcher?: () => void;
  onOpenSettings?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  status,
  activeTabTitle,
  tabCount,
  isUpdateAvailable,
  onShowUpdates,
  onToggleQuickSwitcher,
  onOpenSettings,
}) => {
  return (
    <div className="status-bar">
      <div className="status-item" onClick={onOpenSettings} title="Open Settings">
        <span className="codicon codicon-remote"></span>
        <span
          style={{
            background: '#007acc',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
          }}
        >
          WSL / Local
        </span>
      </div>
      <div className="status-item">
        <span style={{ opacity: 0.8 }}>{status}</span>
      </div>

      {isUpdateAvailable && (
        <div
          className="status-item update-available"
          onClick={onShowUpdates}
          style={{ color: '#4caf50', cursor: 'pointer', fontWeight: 'bold' }}
          title="A new version of CmdGUI is available!"
        >
          <span>✨ Update Available</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {activeTabTitle && (
        <div className="status-item">
          <span>{activeTabTitle}</span>
        </div>
      )}
      <div className="status-item" onClick={onToggleQuickSwitcher} title="Switch Tabs (Ctrl+P)">
        <span>Tabs: {tabCount}</span>
      </div>
      <div className="status-item">
        <span>UTF-8</span>
      </div>
      <div className="status-item" onClick={onOpenSettings} title="Notifications">
        <span>🔔</span>
      </div>
    </div>
  );
};


export default StatusBar;
