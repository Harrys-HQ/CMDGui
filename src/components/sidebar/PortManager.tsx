import React from 'react';
import { ActivePort } from '../../types';

import { ChevronRight } from 'lucide-react';

import type { ToastType } from '../../hooks/useToast';

interface Props {
  isRefreshingPorts: boolean;
  refreshPorts: () => Promise<void>;
  portSearchQuery: string;
  setPortSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  hideSystemPorts: boolean;
  setHideSystemPorts: React.Dispatch<React.SetStateAction<boolean>>;
  ports: ActivePort[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  setExpandedPorts: React.Dispatch<React.SetStateAction<{ user: boolean; system: boolean }>>;
  expandedPorts: { user: boolean; system: boolean };
}

export default function PortManager({
  isRefreshingPorts,
  refreshPorts,
  portSearchQuery,
  setPortSearchQuery,
  hideSystemPorts,
  setHideSystemPorts,
  ports,
  showToast,
  setExpandedPorts,
  expandedPorts,
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
        <span style={{ fontWeight: 'bold' }}>ACTIVE PORTS</span>
        <div
          className={`sidebar-action-btn ${isRefreshingPorts ? 'spinning' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            refreshPorts();
          }}
          title="Refresh Active Ports"
        >
          🔄
        </div>
      </div>

      <div
        style={{
          padding: '10px 15px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="sidebar-search-container" style={{ margin: '0 0 10px 0', padding: 0 }}>
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Filter ports/processes..."
            value={portSearchQuery}
            onChange={(e) => setPortSearchQuery(e.target.value)}
          />
        </div>

        {/* Safety toggle bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '6px 8px',
            background: hideSystemPorts ? 'rgba(35, 209, 139, 0.08)' : 'rgba(241, 76, 76, 0.08)',
            border: `1px solid ${hideSystemPorts ? 'rgba(35, 209, 139, 0.2)' : 'rgba(241, 76, 76, 0.2)'}`,
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{hideSystemPorts ? '🛡️ Safe Mode' : '⚠️ Unsafe Mode'}</span>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              color: 'var(--fg-secondary)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={hideSystemPorts}
              onChange={(e) => setHideSystemPorts(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Hide System Ports
          </label>
        </div>

        {ports.length > 0 ? (
          (() => {
            const systemProcesses = [
              'system',
              'svchost.exe',
              'lsass.exe',
              'services.exe',
              'spoolsv.exe',
              'wininit.exe',
              'winlogon.exe',
              'csrss.exe',
              'smss.exe',
              'alg.exe',
              'dashost.exe',
              'sihost.exe',
              'searchindexer.exe',
              'explorer.exe',
              'dwm.exe',
              'fontdrvhost.exe',
              'ctfmon.exe',
              'securityhealthservice.exe',
              'tcpsvcs.exe',
              'nissrv.exe',
              'msmpeng.exe',
              'conhost.exe',
              'runtimebroker.exe',
              'smartscreen.exe',
              'taskhostw.exe',
              'dllhost.exe',
              'shellexperiencehost.exe',
              'searchapp.exe',
              'startmenuexperiencehost.exe',
              'wuaudt.exe',
              'registry',
            ];

            const safePorts = Array.isArray(ports) ? ports : [];
            const filtered = safePorts.filter((p) => {
              const q = portSearchQuery.toLowerCase();
              return (
                p.port.toString().includes(q) ||
                p.processName.toLowerCase().includes(q) ||
                p.pid.toString().includes(q)
              );
            });

            const systemPorts = filtered.filter(
              (p) => systemProcesses.includes(p.processName.toLowerCase()) || p.pid <= 4
            );
            const appPorts = filtered.filter(
              (p) => !systemProcesses.includes(p.processName.toLowerCase()) && p.pid > 4
            );

            const renderPortItem = (p: ActivePort, isSystem: boolean = false) => (
              <div
                key={p.port}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        color: 'var(--accent-primary, #007acc)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      :{p.port}
                    </span>
                    <span style={{ color: '#888', fontSize: '10px' }}>PID: {p.pid}</span>
                  </div>
                  <span
                    style={{
                      color: '#d4d4d4',
                      fontSize: '11px',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={p.processName}
                  >
                    {p.processName}
                  </span>
                </div>
                {!isSystem ? (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.electron) return;
                      if (
                        window.confirm(
                          `Are you sure you want to terminate ${p.processName} (PID: ${p.pid}) on port ${p.port}?`
                        )
                      ) {
                        try {
                          const res = await window.electron.killProcessByPid(p.pid);
                          showToast(res, 'success');
                          refreshPorts();
                        } catch (err) {
                          showToast(`Failed to kill process: ${err}`, 'error');
                        }
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#3c1a1a',
                      border: '1px solid #6c2a2a',
                      borderRadius: '3px',
                      color: '#ff6b6b',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                    title="Kill Process"
                  >
                    🛑 Kill
                  </button>
                ) : (
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '3px',
                      color: '#666',
                      fontSize: '10px',
                      cursor: 'not-allowed',
                      userSelect: 'none',
                    }}
                    title="System processes cannot be terminated to protect stability"
                  >
                    🔒 System
                  </span>
                )}
              </div>
            );

            return (
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
                {/* Application Ports Group */}
                <div
                  onClick={() => setExpandedPorts((prev) => ({ ...prev, user: !prev.user }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#aaa',
                    marginTop: '4px',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      marginRight: '6px',
                      transform: expandedPorts.user ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={11} strokeWidth={2.2} />
                  </span>
                  <span>DEV & APP PORTS ({appPorts.length})</span>
                </div>
                {expandedPorts.user && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      paddingLeft: '4px',
                    }}
                  >
                    {appPorts.length > 0 ? (
                      appPorts.map((p) => renderPortItem(p, false))
                    ) : (
                      <div
                        style={{
                          color: '#555',
                          fontStyle: 'italic',
                          padding: '10px 0',
                          fontSize: '11px',
                          textAlign: 'center',
                        }}
                      >
                        No active dev or user application ports.
                      </div>
                    )}
                  </div>
                )}

                {/* System Ports Group (Hidden by default unless unchecked) */}
                {!hideSystemPorts && (
                  <>
                    <div
                      onClick={() =>
                        setExpandedPorts((prev) => ({ ...prev, system: !prev.system }))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: 'rgba(241, 76, 76, 0.08)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#ff6b6b',
                        marginTop: '8px',
                        userSelect: 'none',
                      }}
                    >
                      <span
                        style={{
                          marginRight: '6px',
                          transform: expandedPorts.system ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <ChevronRight size={11} strokeWidth={2.2} />
                      </span>
                      <span>SYSTEM SERVICES ({systemPorts.length})</span>
                    </div>
                    {expandedPorts.system && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          paddingLeft: '4px',
                        }}
                      >
                        {systemPorts.length > 0 ? (
                          systemPorts.map((p) => renderPortItem(p, true))
                        ) : (
                          <div
                            style={{
                              color: '#555',
                              fontStyle: 'italic',
                              padding: '10px 0',
                              fontSize: '11px',
                              textAlign: 'center',
                            }}
                          >
                            No active system ports.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()
        ) : (
          <div
            style={{
              color: '#666',
              fontStyle: 'italic',
              padding: '20px 0',
              textAlign: 'center',
              fontSize: '12px',
            }}
          >
            No active local ports detected.
          </div>
        )}
      </div>
    </div>
  );
}
