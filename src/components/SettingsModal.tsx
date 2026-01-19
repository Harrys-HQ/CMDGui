import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'project' | 'cli'>('project');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">CmdGUI Documentation</h2>
          <button 
            onClick={onClose}
            className="modal-close-btn"
          >×</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <div 
            className={`modal-tab ${activeTab === 'project' ? 'active' : ''}`}
            onClick={() => setActiveTab('project')}
          >
            GEMINI - PROJECT
          </div>
          <div 
            className={`modal-tab ${activeTab === 'cli' ? 'active' : ''}`}
            onClick={() => setActiveTab('cli')}
          >
            GEMINI - CLI
          </div>
        </div>

        {/* Content */}
        <div className="modal-content">
          
          {activeTab === 'project' ? (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Active Interface Shortcuts</h3>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + T</span></div>
                      <div className="command-desc-col"><div>New Terminal Tab</div></div>
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
                      <div className="command-name-col"><span className="command-pill">Ctrl + L</span></div>
                      <div className="command-desc-col"><div>Clear the screen.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + O</span></div>
                      <div className="command-desc-col"><div>Toggle debug console display.</div></div>
                    </div>
                     <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + S</span></div>
                      <div className="command-desc-col"><div>Disable truncation for long responses.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Y</span></div>
                      <div className="command-desc-col"><div>Toggle auto-approval (YOLO mode).</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Esc</span></div>
                      <div className="command-desc-col"><div>Close dialogs and suggestions.</div></div>
                    </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Terminal & Keyboard Shortcuts</h3>
                <h4 style={{fontSize: '14px', marginBottom: '10px', color: '#888'}}>Terminal Interaction</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Shift + C</span></div>
                      <div className="command-desc-col"><div>Copy selected text.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Shift + V</span></div>
                      <div className="command-desc-col"><div>Paste from clipboard.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + R</span></div>
                      <div className="command-desc-col"><div>Reverse search history.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">Ctrl + Enter</span></div>
                      <div className="command-desc-col"><div>Insert new line.</div></div>
                    </div>
                </div>
              </section>

              <section className="modal-section">
                 <h3 className="modal-section-title">Pro Tips</h3>
                 <ul style={{ paddingLeft: '20px', marginTop: '15px' }}>
                    <li style={{ marginBottom: '8px' }}>Use <strong>specific instructions</strong> like "Create a React component" rather than "Make a website".</li>
                    <li style={{ marginBottom: '8px' }}>The agent can <strong>read files</strong>. Ask it to "Explain how main.py works" to get a summary.</li>
                    <li>If a task is complex, ask the agent to <strong>"Plan first"</strong> before executing any code.</li>
                 </ul>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">About</h3>
                <div className="command-grid">
                  <div className="command-item">
                    <div className="command-name-col"><span className="command-pill">Version</span></div>
                    <div className="command-desc-col"><div>1.0.5</div></div>
                  </div>
                  <div className="command-item">
                    <div className="command-name-col"><span className="command-pill">Author</span></div>
                    <div className="command-desc-col"><div>HarryA</div></div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="modal-section">
                <h3 className="modal-section-title">Slash Commands (/)</h3>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/bug</span></div>
                      <div className="command-desc-col"><div>File an issue. Usage: <code>/bug [title]</code></div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/chat</span></div>
                      <div className="command-desc-col"><div>History: <code>save</code>, <code>resume</code>, <code>list</code>, <code>delete</code>.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/clear</span></div>
                      <div className="command-desc-col"><div>Clear terminal screen.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/compress</span></div>
                      <div className="command-desc-col"><div>Summarize context to save tokens.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/copy</span></div>
                      <div className="command-desc-col"><div>Copies last output to clipboard.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/dir</span></div>
                      <div className="command-desc-col"><div>Manage workspace: <code>add</code>, <code>show</code>.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/init</span></div>
                      <div className="command-desc-col"><div>Generate GEMINI.md context file.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/mcp</span></div>
                      <div className="command-desc-col"><div>Manage MCP: <code>list</code>, <code>desc</code>, <code>refresh</code>.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/memory</span></div>
                      <div className="command-desc-col"><div>GEMINI.md: <code>add</code>, <code>show</code>, <code>list</code>.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/model</span></div>
                      <div className="command-desc-col"><div>Select Gemini model.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/restore</span></div>
                      <div className="command-desc-col"><div>Restore files before tool run.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/rewind</span></div>
                      <div className="command-desc-col"><div>Revert file changes. (Esc twice)</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/skills</span></div>
                      <div className="command-desc-col"><div>Workflows: <code>list</code>, <code>enable</code>, <code>disable</code>.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/stats</span></div>
                      <div className="command-desc-col"><div>Show session stats.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">/tools</span></div>
                      <div className="command-desc-col"><div>List tools: <code>/tools [desc]</code></div></div>
                    </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">Context & Shell</h3>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">@&lt;path&gt;</span></div>
                      <div className="command-desc-col"><div>Inject file/dir content into prompt.</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">!&lt;command&gt;</span></div>
                      <div className="command-desc-col"><div>Run shell command (bash/powershell).</div></div>
                    </div>
                </div>
              </section>

              <section className="modal-section">
                <h3 className="modal-section-title">PowerShell Interface (ISE) Shortcuts</h3>
                
                <h4 style={{fontSize: '14px', marginBottom: '10px', color: '#888'}}>Editing Text</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">F1</span></div>
                      <div className="command-desc-col"><div>Help</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+A</span></div>
                      <div className="command-desc-col"><div>Select All</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+C / X / V</span></div>
                      <div className="command-desc-col"><div>Copy / Cut / Paste</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+Z / Y</span></div>
                      <div className="command-desc-col"><div>Undo / Redo</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+F / H</span></div>
                      <div className="command-desc-col"><div>Find / Replace in Script</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">F3 / SHIFT+F3</span></div>
                      <div className="command-desc-col"><div>Find Next / Previous</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+Space</span></div>
                      <div className="command-desc-col"><div>Show Intellisense Help</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+U / SHIFT+U</span></div>
                      <div className="command-desc-col"><div>Make Lowercase / Uppercase</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+M</span></div>
                      <div className="command-desc-col"><div>Expand or Collapse Outlining</div></div>
                    </div>
                </div>

                <h4 style={{fontSize: '14px', margin: '20px 0 10px', color: '#888'}}>Running Scripts</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">F5</span></div>
                      <div className="command-desc-col"><div>Run Script</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">F8</span></div>
                      <div className="command-desc-col"><div>Run Selection</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+BREAK</span></div>
                      <div className="command-desc-col"><div>Stop Execution</div></div>
                    </div>
                </div>

                <h4 style={{fontSize: '14px', margin: '20px 0 10px', color: '#888'}}>Debugging</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">F9 / F10 / F11</span></div>
                      <div className="command-desc-col"><div>Breakpoint / Step Over / Step Into</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">SHIFT+F11</span></div>
                      <div className="command-desc-col"><div>Step Out</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+SHIFT+D</span></div>
                      <div className="command-desc-col"><div>Display Call Stack</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+SHIFT+F9</span></div>
                      <div className="command-desc-col"><div>Remove All Breakpoints</div></div>
                    </div>
                </div>

                <h4 style={{fontSize: '14px', margin: '20px 0 10px', color: '#888'}}>Customizing View</h4>
                <div className="command-grid">
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+D / I</span></div>
                      <div className="command-desc-col"><div>Go to Console / Script Pane</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+R</span></div>
                      <div className="command-desc-col"><div>Toggle Script Pane</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL+1 / 2 / 3</span></div>
                      <div className="command-desc-col"><div>Move Script Pane Up/Right/Maximize</div></div>
                    </div>
                    <div className="command-item">
                      <div className="command-name-col"><span className="command-pill">CTRL++ / -</span></div>
                      <div className="command-desc-col"><div>Zoom In / Out</div></div>
                    </div>
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
