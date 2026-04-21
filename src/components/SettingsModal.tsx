import React, { useState, useEffect } from 'react';
import { UpdateInfo, Workspace, TerminalTheme } from '../types';
import { HistoryItem } from '../hooks/useCommandHistory';
import { Keymap, KeybindingAction, Keybinding, formatKeybinding } from '../hooks/useKeybindings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalTheme: string;
  onThemeChange: (theme: string) => void;
  customTheme?: TerminalTheme;
  onCustomThemeChange?: (theme: TerminalTheme) => void;
  terminalFontSize: number;
  onFontSizeChange: (size: number) => void;
  terminalScrollback?: number;
  onScrollbackChange?: (size: number) => void;
  isQuakeModeEnabled?: boolean;
  onQuakeModeChange?: (enabled: boolean) => void;
  isStayAwakeEnabled?: boolean;
  onStayAwakeChange?: (enabled: boolean) => void;
  isGPUAccelerationEnabled?: boolean;
  onGPUAccelerationChange?: (enabled: boolean) => void;
  workspaces?: Workspace[];
  onDeleteWorkspace?: (id: string) => void;
  history?: HistoryItem[];
  onToggleBookmark?: (id: string) => void;
  onClearHistory?: () => void;
  onRunCommand?: (command: string) => void;
  defaultShell?: string;
  onShellChange?: (shell: string) => void;
  keymap?: Keymap;
  onUpdateKeybinding?: (action: KeybindingAction, binding: Keybinding) => void;
  onResetKeybindings?: () => void;
}

const ACTION_LABELS: Record<KeybindingAction, string> = {
  commandPalette: 'Open Command Palette',
  newTab: 'New Terminal Tab',
  closeTab: 'Close Active Tab',
  nextTab: 'Switch to Next Tab',
  prevTab: 'Switch to Previous Tab',
  clearTerminal: 'Clear Terminal',
  copy: 'Copy Selection',
  paste: 'Paste',
  find: 'Find in Terminal',
  newLine: 'Insert New Line (Terminal)',
};

const KeybindingRecorder: React.FC<{
  action: KeybindingAction;
  onSave: (binding: Keybinding) => void;
  onCancel: () => void;
}> = ({ action, onSave, onCancel }) => {
  const [recording, setRecording] = useState<Keybinding | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const newBinding: Keybinding = {
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      };

      setRecording(newBinding);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="keybinding-recorder-overlay">
      <div className="keybinding-recorder-modal">
        <h3>Record Keybinding for &quot;{ACTION_LABELS[action]}&quot;</h3>
        <div className="recording-display">
          {recording ? formatKeybinding(recording) : 'Press desired key combination...'}
        </div>
        <div className="recorder-actions">
          <button
            onClick={() => recording && onSave(recording)}
            disabled={!recording}
            className="primary-btn"
          >
            Save
          </button>
          <button onClick={onCancel} className="secondary-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  terminalTheme,
  onThemeChange,
  customTheme,
  onCustomThemeChange,
  terminalFontSize,
  onFontSizeChange,
  terminalScrollback,
  onScrollbackChange,
  isQuakeModeEnabled,
  onQuakeModeChange,
  isStayAwakeEnabled,
  onStayAwakeChange,
  isGPUAccelerationEnabled,
  onGPUAccelerationChange,
  workspaces,
  onDeleteWorkspace,
  history,
  onToggleBookmark,
  onClearHistory,
  onRunCommand,
  defaultShell,
  onShellChange,
  keymap,
  onUpdateKeybinding,
  onResetKeybindings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'project' | 'appearance' | 'keybindings' | 'cli' | 'workspaces' | 'history' | 'about'
  >('project');
  const [appVersion, setAppVersion] = useState<string>('1.8.0');
  const [recordingAction, setRecordingAction] = useState<KeybindingAction | null>(null);

  // Update State
  const [updateState, setUpdateState] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      window.electron.getVersion().then(setAppVersion);

      // Subscribe to update status
      const cleanup = window.electron.onUpdateStatus((data) => {
        console.log('Update Status:', data);
        if (data.status === 'checking') {
          setUpdateState('checking');
        } else if (data.status === 'available') {
          setUpdateState('available');
          if (data.info) setUpdateInfo(data.info);
        } else if (data.status === 'not-available') {
          setUpdateState('not-available');
        } else if (data.status === 'downloading') {
          setUpdateState('downloading');
          setDownloadProgress(data.progress?.percent || 0);
        } else if (data.status === 'downloaded') {
          setUpdateState('downloaded');
        } else if (data.status === 'error') {
          setUpdateState('error');
          setErrorMessage(data.error || 'Unknown error');
        }
      });
      return cleanup;
    }
  }, [isOpen]);

  const handleCheckUpdate = async () => {
    setUpdateState('checking');
    setErrorMessage('');
    try {
      await window.electron.checkForUpdates();
      // Status updates will come via the listener
    } catch {
      setUpdateState('error');
      setErrorMessage('Failed to initiate check.');
    }
  };

  const handleDownload = async () => {
    setUpdateState('downloading');
    setDownloadProgress(0);
    try {
      await window.electron.downloadUpdate();
    } catch {
      setUpdateState('error');
      setErrorMessage('Failed to start download.');
    }
  };

  const handleQuitAndInstall = () => {
    window.electron.quitAndInstall();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">CmdGUI Settings</h2>
          <button onClick={onClose} className="modal-close-btn">
            ×
          </button>
        </div>

        <div className="modal-tabs">
          <div
            className={`modal-tab ${activeTab === 'project' ? 'active' : ''}`}
            onClick={() => setActiveTab('project')}
          >
            DOCS
          </div>
          <div
            className={`modal-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            APPEARANCE
          </div>
          <div
            className={`modal-tab ${activeTab === 'keybindings' ? 'active' : ''}`}
            onClick={() => setActiveTab('keybindings')}
          >
            KEYBINDINGS
          </div>
          <div
            className={`modal-tab ${activeTab === 'cli' ? 'active' : ''}`}
            onClick={() => setActiveTab('cli')}
          >
            CLI
          </div>
          <div
            className={`modal-tab ${activeTab === 'workspaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspaces')}
          >
            WORKSPACES
          </div>
          <div
            className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            HISTORY
          </div>
          <div
            className={`modal-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ABOUT
          </div>
        </div>

        <div className="modal-content">
          {activeTab === 'project' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Terminal & Keyboard Shortcuts</h3>
                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
                  Workspace Navigation
                </h4>
                <div className="command-grid">
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + N</span>
                    </div>
                    <div className="command-desc-col">
                      <div>New Tab</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + W</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Close Active Tab</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Tab</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Next Tab</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + Tab</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Previous Tab</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + P</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Quick Switcher</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
                  Terminal Interaction
                </h4>
                <div className="command-grid">
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + C</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Copy (if selection) / Interrupt.</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + V</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Paste from clipboard.</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + L</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Clear the screen and buffer.</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + F</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Find in Terminal</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + R</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Reverse search history.</div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'keybindings' && keymap && onUpdateKeybinding && (
            <>
              <section className="modal-section">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3 className="modal-section-title">Customize Keybindings</h3>
                  <button
                    onClick={onResetKeybindings}
                    className="secondary-btn"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="command-grid">
                  {Object.entries(keymap).map(([action, binding]) => (
                    <div
                      key={action}
                      className="command-item"
                      onClick={() => setRecordingAction(action as KeybindingAction)}
                      style={{ cursor: 'pointer' }}
                      title="Click to record new keybinding"
                    >
                      <div className="command-name-col">
                        <span className="command-pill">{formatKeybinding(binding)}</span>
                      </div>
                      <div className="command-desc-col">
                        <div>{ACTION_LABELS[action as KeybindingAction]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {recordingAction && (
                <KeybindingRecorder
                  action={recordingAction}
                  onSave={(newBinding) => {
                    onUpdateKeybinding(recordingAction, newBinding);
                    setRecordingAction(null);
                  }}
                  onCancel={() => setRecordingAction(null)}
                />
              )}
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Terminal Appearance</h3>

                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>Theme</h4>
                <div className="theme-grid">
                  {[
                    { id: 'vscode', name: 'VS Code Dark' },
                    { id: 'monokai', name: 'Monokai' },
                    { id: 'solarized-dark', name: 'Solarized Dark' },
                    { id: 'one-dark', name: 'One Dark' },
                    { id: 'custom', name: 'Custom' },
                  ].map((theme) => (
                    <div
                      key={theme.id}
                      className={`theme-option ${terminalTheme === theme.id ? 'selected' : ''}`}
                      onClick={() => onThemeChange(theme.id)}
                    >
                      {theme.name}
                    </div>
                  ))}
                </div>

                {terminalTheme === 'custom' && customTheme && onCustomThemeChange && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '15px',
                      background: '#2d2d2d',
                      borderRadius: '4px',
                    }}
                  >
                    <h4
                      style={{
                        fontSize: '12px',
                        marginBottom: '15px',
                        color: '#aaa',
                        textTransform: 'uppercase',
                      }}
                    >
                      Custom Theme Editor
                    </h4>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {Object.entries(customTheme).map(([key, value]) => (
                        <div
                          key={key}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <input
                            type="color"
                            value={value}
                            onChange={(e) =>
                              onCustomThemeChange({ ...customTheme, [key]: e.target.value })
                            }
                            style={{
                              width: '24px',
                              height: '24px',
                              padding: '0',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#ccc' }}>{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
                    Font Size ({terminalFontSize}px)
                  </h4>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={terminalFontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                {onScrollbackChange && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
                      Scrollback Limit ({terminalScrollback} lines)
                    </h4>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      step="100"
                      value={terminalScrollback}
                      onChange={(e) => onScrollbackChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#3c3c3c',
                        color: '#fff',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {onQuakeModeChange && (
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="quake-mode-toggle"
                      checked={isQuakeModeEnabled}
                      onChange={(e) => onQuakeModeChange(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="quake-mode-toggle"
                      style={{
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ccc',
                        marginLeft: '10px',
                      }}
                    >
                      Enable Quake Mode (Alt + Space)
                    </label>
                  </div>
                )}

                {onStayAwakeChange && (
                  <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="stay-awake-toggle"
                      checked={isStayAwakeEnabled}
                      onChange={(e) => onStayAwakeChange(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="stay-awake-toggle"
                      style={{
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ccc',
                        marginLeft: '10px',
                      }}
                    >
                      Stay Awake (Prevent system lock/sleep)
                    </label>
                  </div>
                )}

                {onGPUAccelerationChange && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        id="gpu-toggle"
                        checked={isGPUAccelerationEnabled}
                        onChange={(e) => onGPUAccelerationChange(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        htmlFor="gpu-toggle"
                        style={{
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#ccc',
                          marginLeft: '10px',
                        }}
                      >
                        Enable Hardware Acceleration (Requires Restart)
                      </label>
                    </div>
                    {!isGPUAccelerationEnabled && (
                      <p style={{ fontSize: '11px', color: '#888', marginLeft: '25px', marginTop: '4px' }}>
                        Disabling this can fix graphical glitches on some systems.
                      </p>
                    )}
                  </div>
                )}

                {onShellChange && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
                      Default Shell
                    </h4>
                    <select
                      value={defaultShell || ''}
                      onChange={(e) => onShellChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#3c3c3c',
                        color: '#fff',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        outline: 'none',
                      }}
                    >
                      <option value="">System Default</option>
                      <option value="powershell.exe">PowerShell (Windows)</option>
                      <option value="cmd.exe">Command Prompt (Windows)</option>
                      <option value="bash">Bash</option>
                      <option value="zsh">Zsh</option>
                      <option value="wsl.exe">WSL (Windows)</option>
                    </select>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'cli' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Slash Commands (/)</h3>
                <div className="command-grid">
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">/bug</span>
                    </div>
                    <div className="command-desc-col">
                      <div>File an issue.</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">/init</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Generate GEMINI.md context file.</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">/memory</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Manage persistent memories.</div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'workspaces' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Saved Workspaces</h3>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
                  Manage your saved tab layouts and project configurations.
                </p>
                <div className="command-grid">
                  {workspaces && workspaces.length > 0 ? (
                    workspaces.map((w) => (
                      <div key={w.id} className="command-item" style={{ cursor: 'default' }}>
                        <div className="command-name-col">
                          <span className="command-pill">{w.name}</span>
                        </div>
                        <div
                          className="command-desc-col"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {w.tabs.length} Tab(s)
                          </div>
                          <button
                            onClick={() => onDeleteWorkspace && onDeleteWorkspace(w.id)}
                            className="secondary-btn"
                            style={{ padding: '2px 8px', fontSize: '10px', color: '#ff5252' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '13px',
                      }}
                    >
                      No saved workspaces found.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <section className="modal-section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                  }}
                >
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Command History
                  </h3>
                  <button
                    onClick={onClearHistory}
                    className="secondary-btn"
                    style={{ fontSize: '11px', padding: '4px 10px', color: '#ff5252' }}
                  >
                    Clear History
                  </button>
                </div>
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #333',
                    borderRadius: '4px',
                  }}
                >
                  {history && history.length > 0 ? (
                    history.map((h) => (
                      <div
                        key={h.id}
                        className="command-item"
                        style={{ cursor: 'default', borderBottom: '1px solid #2d2d2d' }}
                      >
                        <div className="command-name-col" style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#d4d4d4',
                              fontFamily: 'var(--font-family-mono)',
                            }}
                          >
                            {h.command}
                          </div>
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                            {new Date(h.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => onRunCommand && onRunCommand(h.command)}
                            className="primary-btn"
                            style={{ padding: '4px 12px', fontSize: '11px', height: '28px' }}
                          >
                            Run
                          </button>
                          <button
                            onClick={() => onToggleBookmark && onToggleBookmark(h.id)}
                            className="secondary-btn"
                            style={{
                              padding: '4px 12px',
                              fontSize: '11px',
                              height: '28px',
                              color: h.isBookmarked ? '#e5e510' : '#888',
                            }}
                          >
                            {h.isBookmarked ? '★' : '☆'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No command history yet.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'about' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">App Information</h3>
                <div className="command-grid">
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Version</span>
                    </div>
                    <div className="command-desc-col">
                      <div>{appVersion}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Updates</h3>
                <div style={{ padding: '10px 0' }}>
                  {updateState === 'idle' && (
                    <button
                      className="sidebar-footer-btn"
                      style={{
                        width: 'auto',
                        padding: '10px 20px',
                        backgroundColor: '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={handleCheckUpdate}
                    >
                      Check for Updates
                    </button>
                  )}

                  {updateState === 'checking' && (
                    <div style={{ color: '#ccc' }}>Checking for updates...</div>
                  )}

                  {updateState === 'not-available' && (
                    <div>
                      <div style={{ color: '#ccc', marginBottom: '10px' }}>
                        Your app is up to date!
                      </div>
                      <button
                        className="sidebar-footer-btn"
                        style={{
                          width: 'auto',
                          padding: '10px 20px',
                          backgroundColor: '#007acc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={handleCheckUpdate}
                      >
                        Check Again
                      </button>
                    </div>
                  )}

                  {updateState === 'available' && (
                    <div>
                      <div style={{ color: '#4caf50', marginBottom: '10px' }}>
                        Update Available: {updateInfo?.version}
                      </div>
                      <button
                        className="sidebar-footer-btn"
                        style={{
                          width: 'auto',
                          padding: '10px 20px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={handleDownload}
                      >
                        Download Update
                      </button>
                    </div>
                  )}

                  {updateState === 'downloading' && (
                    <div>
                      <div style={{ color: '#ccc', marginBottom: '10px' }}>
                        Downloading... {downloadProgress.toFixed(1)}%
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#333',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${downloadProgress}%`,
                            height: '100%',
                            backgroundColor: '#4caf50',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {updateState === 'downloaded' && (
                    <div>
                      <div style={{ color: '#4caf50', marginBottom: '10px' }}>
                        Update Downloaded!
                      </div>
                      <button
                        className="sidebar-footer-btn"
                        style={{
                          width: 'auto',
                          padding: '10px 20px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={handleQuitAndInstall}
                      >
                        Quit and Install
                      </button>
                    </div>
                  )}

                  {updateState === 'error' && (
                    <div>
                      <div style={{ color: '#ff5252', marginBottom: '10px' }}>
                        Error: {errorMessage}
                      </div>
                      <button
                        className="sidebar-footer-btn"
                        style={{
                          width: 'auto',
                          padding: '10px 20px',
                          backgroundColor: '#007acc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={handleCheckUpdate}
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
