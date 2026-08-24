import React from 'react';
import { Globe, Sparkles, Layers, Bell, CheckCircle2, Radio, Maximize2 } from 'lucide-react';

interface StatusBarProps {
  status: string;
  activeTabTitle?: string;
  tabCount: number;
  isUpdateAvailable?: boolean;
  isBroadcastMode?: boolean;
  isZoomed?: boolean;
  onShowUpdates?: () => void;
  onToggleQuickSwitcher?: () => void;
  onOpenSettings?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  status,
  activeTabTitle,
  tabCount,
  isUpdateAvailable,
  isBroadcastMode,
  isZoomed,
  onShowUpdates,
  onToggleQuickSwitcher,
  onOpenSettings,
}) => {
  return (
    <div className="status-bar">
      <div className="status-item" onClick={onOpenSettings} title="Environment Settings">
        <Globe size={13} style={{ marginRight: '6px' }} />
        <span>WSL / Local</span>
      </div>
      <div className="status-item">
        <CheckCircle2 size={12} style={{ marginRight: '6px', opacity: 0.8 }} />
        <span style={{ opacity: 0.9 }}>{status}</span>
      </div>

      {isBroadcastMode && (
        <div
          className="status-item"
          style={{ color: '#ef4444', fontWeight: 600, gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
          title="Multi-Pane Input Broadcast Active (Ctrl+Shift+I)"
        >
          <Radio size={13} className="pulse-icon" />
          <span>BROADCASTING</span>
        </div>
      )}

      {isZoomed && (
        <div
          className="status-item"
          style={{ color: '#38bdf8', fontWeight: 600, gap: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)' }}
          title="Pane Zoomed (Ctrl+Shift+Z)"
        >
          <Maximize2 size={13} />
          <span>ZOOMED</span>
        </div>
      )}

      {isUpdateAvailable && (
        <div
          className="status-item update-available"
          onClick={onShowUpdates}
          style={{ color: '#4ade80', cursor: 'pointer', fontWeight: 600, gap: '6px' }}
          title="A new version of CmdGUI is available!"
        >
          <Sparkles size={13} />
          <span>Update Available</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div className="status-item" title="RAM Footprint">
        <span style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>⚡ RAM: ~140MB</span>
      </div>
      {activeTabTitle && (
        <div className="status-item" title="Active Task">
          <span>{activeTabTitle}</span>
        </div>
      )}
      <div className="status-item" onClick={onOpenSettings} title="Notifications">
        <Bell size={13} />
      </div>
    </div>
  );
};

export default StatusBar;
