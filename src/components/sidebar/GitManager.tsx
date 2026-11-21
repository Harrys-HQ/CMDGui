import React from 'react';
import { Project } from '../../types';

import type { ToastType } from '../../hooks/useToast';

interface Props {
  onRefreshGitStatus: (() => void) | undefined;
  gitProjects: Project[];
  selectedGitPath: string | null;
  setSelectedGitPath: React.Dispatch<React.SetStateAction<string | null>>;
  isPending: boolean;
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  commitMessage: string;
  setCommitMessage: React.Dispatch<React.SetStateAction<string>>;
}

export default function GitManager({
  onRefreshGitStatus,
  gitProjects,
  selectedGitPath,
  setSelectedGitPath,
  isPending,
  setIsPending,
  showToast,
  commitMessage,
  setCommitMessage,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="sidebar-section-header"
        style={{
          cursor: 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 'bold' }}>SOURCE CONTROL</span>
        <div
          className="sidebar-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onRefreshGitStatus) onRefreshGitStatus();
          }}
          title="Refresh Git Status"
        >
          🔄
        </div>
      </div>

      {gitProjects.length > 0 ? (
        <div
          style={{
            padding: '10px 15px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          {gitProjects.length > 1 && (
            <select
              value={selectedGitPath || ''}
              onChange={(e) => setSelectedGitPath(e.target.value)}
              style={{
                width: '100%',
                background: '#2d2d2d',
                color: '#cccccc',
                border: '1px solid #444',
                padding: '6px',
                borderRadius: '4px',
                marginBottom: '10px',
                fontSize: '11px',
                outline: 'none',
              }}
            >
              {gitProjects.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {(() => {
            const activeProj = gitProjects.find((p) => p.path === selectedGitPath);
            if (!activeProj) return null;

            return (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  fontSize: '12px',
                }}
              >
                {/* Branch & Status Summary Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    padding: '10px 12px',
                    background: 'var(--bg-root)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>🌿</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{ fontWeight: 'bold', color: 'var(--fg-active)', fontSize: '13px' }}
                      >
                        {activeProj.gitBranch || 'main'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--fg-secondary)' }}>
                        Current Branch
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      background: activeProj.gitDirty
                        ? 'rgba(229, 192, 123, 0.15)'
                        : 'rgba(35, 209, 139, 0.15)',
                      color: activeProj.gitDirty ? '#e5c07b' : '#23d18b',
                      border: `1px solid ${activeProj.gitDirty ? 'rgba(229, 192, 123, 0.3)' : 'rgba(35, 209, 139, 0.3)'}`,
                    }}
                  >
                    {activeProj.gitDirty
                      ? `${activeProj.gitFiles?.length || 0} Uncommitted`
                      : 'Clean Tree'}
                  </span>
                </div>

                {/* Git Action Toolbar */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <button
                    disabled={isPending}
                    onClick={async () => {
                      if (!window.electron || !activeProj.path) return;
                      setIsPending(true);
                      try {
                        const res = await window.electron.gitPull(activeProj.path);
                        showToast('Pull: ' + res, 'success');
                        if (onRefreshGitStatus) onRefreshGitStatus();
                      } catch (e) {
                        showToast('Pull failed: ' + String(e), 'error');
                      } finally {
                        setIsPending(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      background: 'var(--bg-root)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--fg-primary)',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    title="Pull latest remote changes into local branch"
                  >
                    ⬇️ Pull
                  </button>
                  <button
                    disabled={isPending}
                    onClick={async () => {
                      if (!window.electron || !activeProj.path) return;
                      setIsPending(true);
                      try {
                        const res = await window.electron.gitPush(activeProj.path);
                        showToast('Push: ' + res, 'success');
                        if (onRefreshGitStatus) onRefreshGitStatus();
                      } catch (e) {
                        showToast('Push failed: ' + String(e), 'error');
                      } finally {
                        setIsPending(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      background: 'var(--bg-root)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--fg-primary)',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    title="Push local commits to remote origin"
                  >
                    ⬆️ Push
                  </button>
                  <button
                    disabled={isPending || !activeProj.gitDirty}
                    onClick={async () => {
                      if (!window.electron || !activeProj.path) return;
                      setIsPending(true);
                      try {
                        const res = await window.electron.gitStageAll(activeProj.path);
                        showToast(res, 'success');
                        if (onRefreshGitStatus) onRefreshGitStatus();
                      } catch (e) {
                        showToast('Staging failed: ' + String(e), 'error');
                      } finally {
                        setIsPending(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      background: activeProj.gitDirty ? 'rgba(0, 122, 204, 0.2)' : 'var(--bg-root)',
                      border: `1px solid ${activeProj.gitDirty ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      color: activeProj.gitDirty ? 'var(--fg-active)' : 'var(--fg-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: activeProj.gitDirty ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    title="Stage all modified and untracked files"
                  >
                    ➕ Stage All
                  </button>
                </div>

                {/* Commit Section */}
                {activeProj.gitDirty && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '16px',
                      padding: '12px',
                      background: 'var(--bg-root)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter commit message..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      disabled={isPending}
                      style={{
                        background: 'var(--bg-sidebar)',
                        color: 'var(--fg-active)',
                        border: '1px solid var(--border-color)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        outline: 'none',
                        fontFamily: 'var(--font-family-ui)',
                      }}
                    />
                    <button
                      disabled={isPending || !commitMessage.trim()}
                      onClick={async () => {
                        if (!window.electron || !activeProj.path) return;
                        setIsPending(true);
                        try {
                          const res = await window.electron.gitCommit(
                            activeProj.path,
                            commitMessage
                          );
                          showToast('Committed: ' + res, 'success');
                          setCommitMessage('');
                          if (onRefreshGitStatus) onRefreshGitStatus();
                        } catch (e) {
                          showToast('Commit failed: ' + String(e), 'error');
                        } finally {
                          setIsPending(false);
                        }
                      }}
                      className="primary-btn"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
                        opacity: commitMessage.trim() ? 1 : 0.5,
                      }}
                    >
                      ✓ Commit Changes
                    </button>
                  </div>
                )}

                <div
                  style={{
                    fontWeight: 'bold',
                    color: 'var(--fg-secondary)',
                    marginBottom: '8px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Changed Files</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>
                    {activeProj.gitFiles?.length || 0} items
                  </span>
                </div>

                {Array.isArray(activeProj.gitFiles) && activeProj.gitFiles.length > 0 ? (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      paddingRight: '4px',
                    }}
                  >
                    {activeProj.gitFiles.map((fileLine, idx) => {
                      const status = fileLine.substring(0, 2).trim();
                      const fileName = fileLine.substring(2).trim();

                      let color = '#e5c07b';
                      let bg = 'rgba(229, 192, 123, 0.1)';
                      let label = 'MODIFIED';
                      let icon = '📝';

                      if (status === 'M' || status.includes('M')) {
                        color = '#e5c07b';
                        bg = 'rgba(229, 192, 123, 0.1)';
                        label = 'MODIFIED';
                        icon = '✏️';
                      } else if (status === 'A' || status.includes('A')) {
                        color = '#98c379';
                        bg = 'rgba(152, 195, 121, 0.1)';
                        label = 'ADDED';
                        icon = '➕';
                      } else if (status === 'D' || status.includes('D')) {
                        color = '#e06c75';
                        bg = 'rgba(224, 108, 117, 0.1)';
                        label = 'DELETED';
                        icon = '🗑️';
                      } else if (status === '??') {
                        color = '#61afef';
                        bg = 'rgba(97, 175, 239, 0.1)';
                        label = 'UNTRACKED';
                        icon = '📄';
                      }

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            background: 'var(--bg-root)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              overflow: 'hidden',
                            }}
                          >
                            <span style={{ fontSize: '12px' }}>{icon}</span>
                            <span
                              style={{
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                color: 'var(--fg-active)',
                                fontSize: '12px',
                                maxWidth: '160px',
                              }}
                              title={fileName}
                            >
                              {fileName}
                            </span>
                          </div>
                          <span
                            style={{
                              color,
                              background: bg,
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      color: 'var(--fg-secondary)',
                      padding: '30px 10px',
                      textAlign: 'center',
                      fontSize: '12px',
                      background: 'var(--bg-root)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontWeight: 600, color: 'var(--fg-active)' }}>
                      Working tree clean!
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                      All changes have been committed.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🌿</div>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>No Git Repositories</div>
          <div style={{ fontSize: '11px' }}>
            Add a Git-tracked folder to the Project Manager to view details here.
          </div>
        </div>
      )}
    </div>
  );
}
