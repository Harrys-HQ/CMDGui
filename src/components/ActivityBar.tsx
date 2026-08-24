import React from 'react';
import { Folder, GitBranch, Network, Settings } from 'lucide-react';

export type SidebarView = 'explorer' | 'git' | 'ports';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onViewChange,
  isSidebarVisible,
  onToggleSidebar,
  onOpenSettings,
}) => {
  const items: { id: SidebarView; icon: React.ReactNode; label: string }[] = [
    { id: 'explorer', icon: <Folder size={20} />, label: 'Explorer' },
    { id: 'git', icon: <GitBranch size={20} />, label: 'Source Control' },
    { id: 'ports', icon: <Network size={20} />, label: 'Active Ports' },
  ];

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {items.map((item) => (
          <div
            key={item.id}
            className={`activity-bar-item ${activeView === item.id && isSidebarVisible ? 'active' : ''}`}
            onClick={() => {
              if (activeView === item.id) {
                onToggleSidebar();
              } else {
                onViewChange(item.id);
                if (!isSidebarVisible) onToggleSidebar();
              }
            }}
            title={item.label}
          >
            <span className="activity-icon">{item.icon}</span>
          </div>
        ))}
      </div>
      <div className="activity-bar-bottom">
        <div
          className="activity-bar-item"
          onClick={onOpenSettings}
          title="Settings (Open Full Settings)"
        >
          <span className="activity-icon"><Settings size={20} /></span>
        </div>
      </div>
    </div>
  );
};

export default ActivityBar;
