import React, { useState, useEffect } from 'react';
import { UpdateInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalTheme: string;
  onThemeChange: (theme: string) => void;
  terminalFontSize: number;
  onFontSizeChange: (size: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  terminalTheme,
  onThemeChange,
  terminalFontSize,
  onFontSizeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'project' | 'appearance' | 'cli' | 'about'>('project');
  const [appVersion, setAppVersion] = useState<string>('1.2.0');

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
          <h2 className="modal-title">CmdGUI Documentation</h2>
          <button onClick={onClose} className="modal-close-btn">
            ×
          </button>
        </div>

        <div className="modal-tabs">
          <div
            className={`modal-tab ${activeTab === 'project' ? 'active' : ''}`}
            onClick={() => setActiveTab('project')}
          >
            GEMINI - PROJECT
          </div>
          <div
            className={`modal-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            APPEARANCE
          </div>
          <div
            className={`modal-tab ${activeTab === 'cli' ? 'active' : ''}`}
            onClick={() => setActiveTab('cli')}
          >
            GEMINI - CLI
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
                <h3 className="modal-section-title">Active Interface Shortcuts</h3>
                <div className="command-grid">
                  <div className="command-row">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + Shift + N</span>
                    </div>
                    <div className="command-desc-col">New Tab</div>
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
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + F</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Find in Terminal</div>
                    </div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col">
                      <span className="command-pill">Ctrl + L</span>
                    </div>
                    <div className="command-desc-col">
                      <div>Clear the screen.</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Terminal & Keyboard Shortcuts</h3>
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
