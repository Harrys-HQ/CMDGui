import { HistoryItem } from '../../hooks/useCommandHistory';

interface Props {
  onClearHistory: (() => void) | undefined;
  history: HistoryItem[] | undefined;
  onRunCommand: ((command: string) => void) | undefined;
  onToggleBookmark: ((id: string) => void) | undefined;
}

export default function HistorySettings({
  onClearHistory,
  history,
  onRunCommand,
  onToggleBookmark,
}: Props) {
  return (
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
          {Array.isArray(history) && history.length > 0 ? (
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
  );
}
