import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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

        {/* Content */}
        <div className="modal-content">
          
          <section className="modal-section">
            <h3 className="modal-section-title">Slash Commands (/)</h3>
            <div className="command-grid">
                
                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/bug</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Report Issue</div>
                    <div className="command-usage">File an issue about Gemini CLI. Usage: <code>/bug [title]</code></div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/chat</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Manage Chat History</div>
                    <div className="command-usage">Save/resume conversations. Sub-commands: <code>save</code>, <code>resume</code>, <code>list</code>, <code>delete</code>, <code>share</code>.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/clear</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Clear Screen</div>
                    <div>Clear terminal screen. (Ctrl+L)</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/compress</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Compress Context</div>
                    <div>Summarize chat context to save tokens.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/copy</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Copy Output</div>
                    <div>Copies the last output to clipboard.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/dir</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Directory Management</div>
                    <div className="command-usage">Manage workspace directories. Sub-commands: <code>add</code>, <code>show</code>.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/help</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Help</div>
                    <div>Display help information.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/init</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Initialize Project</div>
                    <div>Generates a tailored GEMINI.md context file.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/mcp</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Manage MCP</div>
                    <div className="command-usage">Manage Model Context Protocol servers. Sub-commands: <code>list</code>, <code>desc</code>, <code>auth</code>, <code>refresh</code>.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/memory</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Manage Memory</div>
                    <div className="command-usage">Manage instructional context (GEMINI.md). Sub-commands: <code>add</code>, <code>show</code>, <code>refresh</code>, <code>list</code>.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/model</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Select Model</div>
                    <div>Choose your Gemini model.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/restore</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Restore Files</div>
                    <div>Restores project files to state before a tool execution.</div>
                  </div>
                </div>
                
                 <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/rewind</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Rewind</div>
                    <div>Rewind conversation and revert file changes. (Esc twice)</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/settings</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Settings</div>
                    <div>Open settings editor.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/skills</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Agent Skills</div>
                    <div className="command-usage">Manage specialized workflows. Sub-commands: <code>list</code>, <code>enable</code>, <code>disable</code>.</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/stats</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Session Stats</div>
                    <div>Display session statistics (tokens, duration).</div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/tools</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">List Tools</div>
                    <div className="command-usage">Display available tools. Usage: <code>/tools [desc]</code></div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">/quit</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Exit</div>
                    <div>Exit Gemini CLI.</div>
                  </div>
                </div>

            </div>
          </section>

          <section className="modal-section">
            <h3 className="modal-section-title">At Commands (@)</h3>
            <div className="command-grid">
               <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">@&lt;path&gt;</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Inject Context</div>
                    <div className="command-usage">Inject content of a file or directory into the prompt. <br/>Example: <code>@src/main.ts Explain this</code></div>
                  </div>
                </div>
                
                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">@</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Direct Query</div>
                    <div>Pass query as-is to the model without context management.</div>
                  </div>
                </div>
            </div>
          </section>

          <section className="modal-section">
            <h3 className="modal-section-title">Shell Mode (!)</h3>
            <div className="command-grid">
                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">!&lt;command&gt;</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Execute Command</div>
                    <div className="command-usage">Run a shell command (bash/powershell). <br/>Example: <code>!git status</code></div>
                  </div>
                </div>

                <div className="command-item">
                  <div className="command-name-col">
                      <span className="command-pill">!</span>
                  </div>
                  <div className="command-desc-col">
                    <div className="command-title">Toggle Shell</div>
                    <div>Toggle persistent shell mode.</div>
                  </div>
                </div>
            </div>
          </section>

           <section className="modal-section">
            <h3 className="modal-section-title">Keyboard Shortcuts</h3>
             <ul style={{ paddingLeft: '20px', marginTop: '15px' }}>
                <li className="command-usage" style={{ marginBottom: '8px' }}><code>Ctrl + C</code> : Interrupt current command or cancel an operation.</li>
                <li className="command-usage" style={{ marginBottom: '8px' }}><code>Ctrl + L</code> : Clear the terminal screen (visual only, preserves history).</li>
                <li className="command-usage" style={{ marginBottom: '8px' }}><code>Up / Down</code> : Navigate through command history.</li>
                <li className="command-usage"><code>Esc (x2)</code> : Rewind conversation/revert changes.</li>
              </ul>
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
                <div className="command-name-col">
                  <span className="command-pill">Version</span>
                </div>
                <div className="command-desc-col">
                  <div>1.0.0</div>
                </div>
              </div>
              <div className="command-item">
                <div className="command-name-col">
                  <span className="command-pill">Author</span>
                </div>
                <div className="command-desc-col">
                  <div>HarryA</div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
