import React from 'react';
import { Project } from '../types';
import TechIcon from './TechIcon';
import {
  Terminal,
  Plus,
  FolderOpen,
  Sparkles,
  Shield,
  Command,
  GitBranch,
  Cpu,
  Keyboard,
  Clock,
} from 'lucide-react';

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
  return (
    <div className="welcome-dashboard">
      <div className="welcome-header">
        <div className="welcome-brand-mark">
          <Terminal size={32} strokeWidth={2.2} />
        </div>
        <h1>CmdGUI</h1>
        <p>A modern, persistent workspace manager for developers.</p>
      </div>

      <div className="welcome-bento-grid">
        {/* Card 1: Quick Actions */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <span className="card-icon">
              <Plus size={14} strokeWidth={2.5} />
            </span>
            <span>Quick Launch</span>
          </div>
          <div className="welcome-actions-stack">
            <div
              className="welcome-action-tile"
              onClick={() => onNewTerminal()}
              title="Spawn standard terminal session (Ctrl+T)"
            >
              <Terminal size={15} color="var(--accent-primary)" />
              <span>New Terminal</span>
            </div>
            <div
              className="welcome-action-tile"
              onClick={() => onNewTerminal(undefined, true)}
              title="Spawn elevated administrator session (Ctrl+Shift+A)"
            >
              <Shield size={15} color="#ef4444" />
              <span>New Admin Terminal</span>
            </div>
            <div
              className="welcome-action-tile"
              onClick={onOpenProject}
              title="Browse and attach folder as a workspace"
            >
              <FolderOpen size={15} color="#eab308" />
              <span>Open Project Folder</span>
            </div>
            {onOpenAiAssistant && (
              <div
                className="welcome-action-tile ai-tile"
                onClick={onOpenAiAssistant}
                title="Launch AI Command Generator (Alt+A / Ctrl+K)"
              >
                <Sparkles size={15} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600 }}>AI Agent Hub</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Recent Workspaces */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <span className="card-icon">
              <Clock size={14} strokeWidth={2.5} />
            </span>
            <span>Recent Workspaces</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {Array.isArray(recentProjects) && recentProjects.length > 0 ? (
              recentProjects.slice(0, 4).map((p) => (
                <div
                  key={p.path}
                  className="welcome-recent-item"
                  onClick={() => onSelectProject(p.path)}
                  title={p.path}
                >
                  <div className="welcome-recent-info">
                    <TechIcon type={p.type} size={15} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span className="welcome-recent-name">{p.name}</span>
                      <span className="welcome-recent-path">{p.path}</span>
                    </div>
                  </div>
                  {p.gitBranch && (
                    <span className="welcome-git-pill">
                      <GitBranch size={10} strokeWidth={2.2} />
                      {p.gitBranch}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: 'var(--fg-secondary)',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  padding: '24px 0',
                }}
              >
                No recent projects attached yet.
              </div>
            )}
          </div>
        </div>

        {/* Card 3: AI CLI Powerhouse */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <span className="card-icon">
              <Cpu size={14} strokeWidth={2.5} />
            </span>
            <span>Autonomous AI CLI Hub</span>
          </div>
          <div className="welcome-actions-stack">
            <div
              className="welcome-action-tile"
              onClick={() => onNewTerminal(undefined, false, 'agy /boost')}
              title="Launch Antigravity CLI with Boosted Planning"
            >
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
                agy
              </span>
              <span>Antigravity (/boost, /plan, /goal)</span>
            </div>
            <div
              className="welcome-action-tile"
              onClick={() => onNewTerminal(undefined, false, 'claude')}
              title="Launch Claude Code terminal session"
            >
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#f97316' }}>
                claude
              </span>
              <span>Claude Code (Diff & Type Repair)</span>
            </div>
            <div
              className="welcome-action-tile"
              onClick={() => onNewTerminal(undefined, false, 'gemini')}
              title="Launch Gemini CLI session"
            >
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#8b5cf6' }}>
                gemini
              </span>
              <span>Gemini CLI (Walkthroughs & Audits)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Keyboard Cheatsheet */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <span className="card-icon">
              <Keyboard size={14} strokeWidth={2.5} />
            </span>
            <span>Speed Cheatsheet</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="welcome-shortcut-row" onClick={onOpenQuickSwitcher}>
              <span>Command Palette</span>
              <kbd>Ctrl+P</kbd>
            </div>
            <div className="welcome-shortcut-row" onClick={() => onNewTerminal()}>
              <span>New Terminal Tab</span>
              <kbd>Ctrl+T</kbd>
            </div>
            <div className="welcome-shortcut-row" onClick={onOpenAiAssistant}>
              <span>AI Command Assistant</span>
              <kbd>Alt+A</kbd>
            </div>
            <div className="welcome-shortcut-row" onClick={onOpenQuickSwitcher}>
              <span>Run Command Action</span>
              <kbd>&gt; command</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
