export default function CliSettings() {
  return (
    <>
      <section className="modal-section">
        <h3 className="modal-section-title">Antigravity & AI CLI Slash Commands</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
          Use these powerful slash commands inside your AI coding assistant shell.
        </p>
        <div className="command-grid">
          <div className="command-item">
            <div className="command-name-col">
              <span className="command-pill">/goal</span>
            </div>
            <div className="command-desc-col">
              <div>Run long-running autonomous tasks (e.g. overnight builds/tests) thoroughly.</div>
            </div>
          </div>
          <div className="command-item">
            <div className="command-name-col">
              <span className="command-pill">/schedule</span>
            </div>
            <div className="command-desc-col">
              <div>
                Schedule a recurring cron job or set a one-shot timer for background notifications.
              </div>
            </div>
          </div>
          <div className="command-item">
            <div className="command-name-col">
              <span className="command-pill">/grill-me</span>
            </div>
            <div className="command-desc-col">
              <div>
                Start an interactive multi-choice interview to align on design decisions and plans.
              </div>
            </div>
          </div>
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
              <div>Generate a GEMINI.md / ANTIGRAVITY.md context file.</div>
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
  );
}
