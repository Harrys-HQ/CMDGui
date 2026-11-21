import { Workspace } from '../../types';

interface Props {
  workspaces: Workspace[] | undefined;
  onDeleteWorkspace: ((id: string) => void) | undefined;
}

export default function WorkspacesSettings({ workspaces, onDeleteWorkspace }: Props) {
  return (
    <>
      <section className="modal-section">
        <h3 className="modal-section-title">Saved Workspaces</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
          Manage your saved tab layouts and project configurations.
        </p>
        <div className="command-grid">
          {Array.isArray(workspaces) && workspaces.length > 0 ? (
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
                  <div style={{ fontSize: '11px', color: '#888' }}>{w.tabs.length} Tab(s)</div>
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
  );
}
