import React from 'react';
import { Tab } from '../types';

interface TopTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string, currentTitle: string) => void;
  onReorderTabs: (startIndex: number, endIndex: number) => void;
}

const TopTabBar: React.FC<TopTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onReorderTabs: _onReorderTabs, // Will implement reordering later if needed
}) => {
  return (
    <div className="top-tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`top-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.hasAlert ? 'has-alert' : ''} ${tab.hasConfirmation ? 'has-confirmation' : ''}`}
          onClick={() => onSelectTab(tab.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            onRenameTab(tab.id, tab.title);
          }}
          title={tab.title}
        >
          <span className="tab-icon">💻</span>
          <span className="tab-title">{tab.title}</span>
          <div className="tab-close" onClick={(e) => onCloseTab(tab.id, e)}>
            ×
          </div>
          {tab.id === activeTabId && <div className="active-tab-indicator" />}
        </div>
      ))}
    </div>
  );
};

export default TopTabBar;
