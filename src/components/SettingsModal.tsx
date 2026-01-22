import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalTheme: string;
  onThemeChange: (theme: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, terminalTheme, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<'project' | 'appearance' | 'cli' | 'about'>('project');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.1.0');

  useEffect(() => {
    if (isOpen) {
      window.electron.getVersion().then(setAppVersion);
    }
  }, [isOpen]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus('Checking for updates...');
    try {
      const result = await window.electron.checkForUpdates();
      if (result.success) {
        if (result.updateInfo) {
          setUpdateStatus(`Update available: ${result.updateInfo.version}`);
        } else {
          setUpdateStatus('Your app is up to date!');
        }
      } else {
        setUpdateStatus(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setUpdateStatus('Failed to check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2 className="modal-title">CmdGUI Documentation</h2>
          <button 
            onClick={onClose}
            className="modal-close-btn"
          >×</button>
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
              <div className="command-name-col"><span className="command-pill">Ctrl + N</span></div>
              <div className="command-desc-col">New Tab</div>
            </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + W</span></div>
                      <div className="command-desc-col"><div>Close Active Tab</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Tab</span></div>
                      <div className="command-desc-col"><div>Next Tab</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Shift + Tab</span></div>
                      <div className="command-desc-col"><div>Previous Tab</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + P</span></div>
                      <div className="command-desc-col"><div>Quick Switcher</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + F</span></div>
                      <div className="command-desc-col"><div>Find in Terminal</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + L</span></div>
                      <div className="command-desc-col"><div>Clear the screen.</div></div>
                    </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Terminal & Keyboard Shortcuts</h3>
                <h4 style={{fontSize: '14px', marginBottom: '10px', color: '#888'}}>Terminal Interaction</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + C</span></div>
                      <div className="command-desc-col"><div>Copy (if selection) / Interrupt.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Shift + V</span></div>
                      <div className="command-desc-col"><div>Paste from clipboard.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + R</span></div>
                      <div className="command-desc-col"><div>Reverse search history.</div></div>
                    </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Terminal Theme</h3>
                <div style={{ marginTop: '20px' }}>
                  <div className="theme-grid">
                    {[
                      { id: 'vscode', name: 'VS Code Dark' },
                      { id: 'monokai', name: 'Monokai' },
                      { id: 'solarized-dark', name: 'Solarized Dark' },
                      { id: 'one-dark', name: 'One Dark' }
                    ].map(theme => (
                      <div 
                        key={theme.id}
                        className={`theme-option ${terminalTheme === theme.id ? 'selected' : ''}`}
                        onClick={() => onThemeChange(theme.id)}
                      >
                        {theme.name}
                      </div>
                    ))}
                  </div>
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
                      <div className="command-name-col"><span className="command-pill">/bug</span></div>
                      <div className="command-desc-col"><div>File an issue.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/init</span></div>
                      <div className="command-desc-col"><div>Generate GEMINI.md context file.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/memory</span></div>
                      <div className="command-desc-col"><div>Manage persistent memories.</div></div>
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
                    <div className="command-name-col"><span className="command-pill">Version</span></div>
                    <div className="command-desc-col"><div>{appVersion}</div></div>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Updates</h3>
                <div style={{ padding: '10px 0' }}>
                  <button 
                    className="sidebar-footer-btn" 
                    style={{ width: 'auto', padding: '10px 20px', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: checkingUpdate ? 'not-allowed' : 'pointer' }}
                    onClick={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                  </button>
                  {updateStatus && (
                    <div style={{ marginTop: '15px', color: '#ccc', fontSize: '14px' }}>
                      {updateStatus}
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