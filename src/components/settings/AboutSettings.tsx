import type { SettingsModalProps } from './types';

import { UpdateInfo, TerminalTheme } from '../../types';

interface Props {
  portableConfig: Pick<
    SettingsModalProps,
    | 'terminalTheme'
    | 'uiTheme'
    | 'terminalFontSize'
    | 'terminalScrollback'
    | 'isQuakeModeEnabled'
    | 'isStayAwakeEnabled'
    | 'isYoloModeEnabled'
    | 'isGPUAccelerationEnabled'
    | 'defaultShell'
    | 'showTopTabBar'
    | 'customTheme'
    | 'keymap'
  >;
  appVersion: string;
  updateState:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  handleCheckUpdate: () => Promise<void>;
  updateInfo: UpdateInfo | null;
  handleDownload: () => Promise<void>;
  downloadProgress: number;
  handleQuitAndInstall: () => void;
  errorMessage: string;
  onThemeChange: (theme: string) => void;
  onUiThemeChange: ((theme: string) => void) | undefined;
  onFontSizeChange: (size: number) => void;
  onScrollbackChange: ((size: number) => void) | undefined;
  onCustomThemeChange: ((theme: TerminalTheme) => void) | undefined;
}

export default function AboutSettings({
  portableConfig,
  appVersion,
  updateState,
  handleCheckUpdate,
  updateInfo,
  handleDownload,
  downloadProgress,
  handleQuitAndInstall,
  errorMessage,
  onThemeChange,
  onUiThemeChange,
  onFontSizeChange,
  onScrollbackChange,
  onCustomThemeChange,
}: Props) {
  return (
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
              <div style={{ color: '#ccc', marginBottom: '10px' }}>Your app is up to date!</div>
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
              <div style={{ color: '#4caf50', marginBottom: '10px' }}>Update Downloaded!</div>
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
              <div style={{ color: '#ff5252', marginBottom: '10px' }}>Error: {errorMessage}</div>
              <button
                className="sidebar-footer-btn"
                style={{
                  width: 'auto',
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={handleCheckUpdate}
              >
                Retry Check
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '25px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--fg-active)' }}>
            📄 Portable Configuration File (`cmdgui.json`)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '14px' }}>
            Export your theme settings, shortcuts, and workspace layout configuration for backup or
            porting across machines.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="welcome-btn"
              style={{ padding: '8px 14px', fontSize: '12px' }}
              onClick={() => {
                const config = { version: appVersion, ...portableConfig };
                const blob = new Blob([JSON.stringify(config, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'cmdgui.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Portable Config (`cmdgui.json`)
            </button>
            <label
              className="welcome-btn"
              style={{ padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              Import Config
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const parsed = JSON.parse(evt.target?.result as string);
                        if (parsed.terminalTheme) onThemeChange(parsed.terminalTheme);
                        if (parsed.uiTheme && onUiThemeChange) onUiThemeChange(parsed.uiTheme);
                        if (parsed.terminalFontSize) onFontSizeChange(parsed.terminalFontSize);
                        if (parsed.terminalScrollback && onScrollbackChange)
                          onScrollbackChange(parsed.terminalScrollback);
                        if (parsed.customTheme && onCustomThemeChange)
                          onCustomThemeChange(parsed.customTheme);
                        alert('Configuration imported successfully!');
                      } catch {
                        alert('Failed to parse config file.');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </>
  );
}
