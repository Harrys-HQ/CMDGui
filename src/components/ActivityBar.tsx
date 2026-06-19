import React from 'react';

export type SidebarView = 'explorer' | 'git' | 'settings';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onViewChange,
  isSidebarVisible,
  onToggleSidebar,
}) => {
  const items: { id: SidebarView; icon: string; label: string }[] = [
    { id: 'explorer', icon: '📁', label: 'Explorer' },
    { id: 'git', icon: '🌿', label: 'Source Control' },
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
          className={`activity-bar-item ${activeView === 'settings' && isSidebarVisible ? 'active' : ''}`}
          onClick={() => {
            if (activeView === 'settings') {
              onToggleSidebar();
            } else {
              onViewChange('settings');
              if (!isSidebarVisible) onToggleSidebar();
            }
          }}
          title="Settings"
        >
          <span className="activity-icon">⚙️</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityBar;
