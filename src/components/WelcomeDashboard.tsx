import React from 'react';
import { Project } from '../types';
import { Terminal, Plus, FolderOpen, Sparkles, Command } from 'lucide-react';

interface WelcomeDashboardProps {
  onNewTerminal: (cwd?: string, asAdmin?: boolean, initialCmd?: string) => void;
  onOpenProject: () => void;
  recentProjects: Project[];
  onSelectProject: (path: string) => void;
  onOpenAiAssistant?: () => void;
  onOpenQuickSwitcher?: () => void;
}

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  onNewTerminal,
  onOpenProject,
  recentProjects,
  onSelectProject,
  onOpenAiAssistant,
  onOpenQuickSwitcher,
}) => {
  const getProjectIcon = (type?: string) => {
    switch (type) {
      case 'android': return '🤖';
      case 'react-native': return '📱';
      case 'flutter': return '💙';
      case 'react': return '⚛️';
      case 'vue': return '🖖';
      case 'node': return '🟢';
      case 'python': return '🐍';
      case 'rust': return '🦀';
      case 'go': return '🐹';
      default: return '📂';
    }
  };

  return (
    <div className="welcome-dashboard">
      <div className="welcome-header">
        <div className="welcome-logo">
          <Terminal size={64} style={{ strokeWidth: 1.5 }} />
        </div>
        <h1>CmdGUI</h1>
        <p>A modern, persistent workspace manager for developers.</p>
      </div>

      <div className="welcome-content">
        {/* 1. START GROUP */}
        <div className="welcome-section">
          <h2>Start Actions</h2>
          <div className="welcome-actions" style={{ flexWrap: 'wrap' }}>
            <button className="welcome-btn" onClick={() => onNewTerminal()}>
              <Plus size={16} style={{ color: 'var(--accent-primary)' }} /> New Terminal
            </button>
            <button className="welcome-btn" onClick={onOpenProject}>
              <FolderOpen size={16} style={{ color: 'var(--accent-primary)' }} /> Open Project Folder
            </button>
            {onOpenAiAssistant && (
              <button
                className="welcome-btn"
                onClick={onOpenAiAssistant}
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--fg-active)',
                  boxShadow: '0 0 12px var(--accent-glow)',
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} /> AI Shell Assistant
              </button>
            )}
          </div>
        </div>

        {/* 2. RECENT PROJECTS GROUP */}
        {Array.isArray(recentProjects) && recentProjects.length > 0 && (
          <div className="welcome-section">
            <h2>Recent Projects</h2>
            <div className="recent-projects-list">
              {recentProjects.slice(0, 5).map((p) => (
                <div
                  key={p.path}
                  className="recent-project-item"
                  onClick={() => onSelectProject(p.path)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{getProjectIcon(p.type)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="project-name">{p.name}</span>
                      <span className="project-path">{p.path}</span>
                    </div>
                  </div>
                  {p.gitBranch && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--fg-secondary)',
                        fontFamily: 'var(--font-family-mono)',
                      }}
                    >
                      🌿 {p.gitBranch}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. HELPFUL SHORTCUTS GROUP */}
        <div className="welcome-section">
          <h2>Helpful Shortcuts</h2>
          <div className="shortcut-grid">
            <div
              className="shortcut-item"
              onClick={onOpenQuickSwitcher}
              style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="shortcut-key">Ctrl+P</span>
              <span className="shortcut-desc">Quick Switcher</span>
            </div>
            <div
              className="shortcut-item"
              onClick={() => onNewTerminal()}
              style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="shortcut-key">Ctrl+T</span>
              <span className="shortcut-desc">New Tab</span>
            </div>
            <div
              className="shortcut-item"
              onClick={onOpenAiAssistant}
              style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="shortcut-key">Ctrl+K</span>
              <span className="shortcut-desc">AI Generator</span>
            </div>
            <div
              className="shortcut-item"
              onClick={onOpenQuickSwitcher}
              style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="shortcut-key">&gt; cmd</span>
              <span className="shortcut-desc">Command Palette</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
