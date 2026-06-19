import React from 'react';
import { Project } from '../types';

interface WelcomeDashboardProps {
  onNewTerminal: () => void;
  onOpenProject: () => void;
  recentProjects: Project[];
  onSelectProject: (path: string) => void;
}

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  onNewTerminal,
  onOpenProject,
  recentProjects,
  onSelectProject,
}) => {
  return (
    <div className="welcome-dashboard">
      <div className="welcome-header">
        <div className="welcome-logo">⚡</div>
        <h1>CmdGUI</h1>
        <p>A modern, persistent workspace manager for developers.</p>
      </div>

      <div className="welcome-content">
        <div className="welcome-section">
          <h2>Start</h2>
          <div className="welcome-actions">
            <button className="welcome-btn" onClick={onNewTerminal}>
              <span className="btn-icon">➕</span> New Terminal
            </button>
            <button className="welcome-btn" onClick={onOpenProject}>
              <span className="btn-icon">📁</span> Open Project Folder
            </button>
          </div>
        </div>

        {recentProjects.length > 0 && (
          <div className="welcome-section">
            <h2>Recent Projects</h2>
            <div className="recent-projects-list">
              {recentProjects.slice(0, 5).map((p) => (
                <div
                  key={p.path}
                  className="recent-project-item"
                  onClick={() => onSelectProject(p.path)}
                >
                  <span className="project-name">{p.name}</span>
                  <span className="project-path">{p.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="welcome-section">
          <h2>Helpful Shortcuts</h2>
          <div className="shortcut-grid">
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl+P</span>
              <span className="shortcut-desc">Quick Switcher</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl+T</span>
              <span className="shortcut-desc">New Tab</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl+W</span>
              <span className="shortcut-desc">Close Tab</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl+Tab</span>
              <span className="shortcut-desc">Next Tab</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
