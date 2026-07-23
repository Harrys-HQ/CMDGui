import React from 'react';

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
  const items: { id: SidebarView; icon: string; label: string }[] = [
    { id: 'explorer', icon: '📁', label: 'Explorer' },
    { id: 'git', icon: '🌿', label: 'Source Control' },
    { id: 'ports', icon: '🔌', label: 'Active Ports' },
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
          <span className="activity-icon">⚙️</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityBar;
