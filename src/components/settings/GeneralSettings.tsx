import { TerminalTheme, TerminalRendererType } from '../../types';

interface Props {
  uiTheme: string | undefined;
  onUiThemeChange: ((theme: string) => void) | undefined;
  onYoloModeChange: ((enabled: boolean) => void) | undefined;
  isYoloModeEnabled: boolean;
  terminalTheme: string;
  onThemeChange: (theme: string) => void;
  customTheme: TerminalTheme | undefined;
  onCustomThemeChange: ((theme: TerminalTheme) => void) | undefined;
  terminalFontSize: number;
  onFontSizeChange: (size: number) => void;
  onScrollbackChange: ((size: number) => void) | undefined;
  terminalScrollback: number | undefined;
  onQuakeModeChange: ((enabled: boolean) => void) | undefined;
  isQuakeModeEnabled: boolean | undefined;
  onStayAwakeChange: ((enabled: boolean) => void) | undefined;
  isStayAwakeEnabled: boolean | undefined;
  onShowTopTabBarChange: ((show: boolean) => void) | undefined;
  showTopTabBar: boolean;
  onTerminalRendererTypeChange: ((renderer: TerminalRendererType) => void) | undefined;
  terminalRendererType: TerminalRendererType;
  onGPUAccelerationChange: ((enabled: boolean) => void) | undefined;
  isGPUAccelerationEnabled: boolean | undefined;
  onRefreshDisplay: (() => void) | undefined;
  onShellChange: ((shell: string) => void) | undefined;
  defaultShell: string | undefined;
  osPlatform: 'windows' | 'linux' | 'macos' | 'other';
}

export default function GeneralSettings({
  uiTheme,
  onUiThemeChange,
  onYoloModeChange,
  isYoloModeEnabled,
  terminalTheme,
  onThemeChange,
  customTheme,
  onCustomThemeChange,
  terminalFontSize,
  onFontSizeChange,
  onScrollbackChange,
  terminalScrollback,
  onQuakeModeChange,
  isQuakeModeEnabled,
  onStayAwakeChange,
  isStayAwakeEnabled,
  onShowTopTabBarChange,
  showTopTabBar,
  onTerminalRendererTypeChange,
  terminalRendererType,
  onGPUAccelerationChange,
  isGPUAccelerationEnabled,
  onRefreshDisplay,
  onShellChange,
  defaultShell,
  osPlatform,
}: Props) {
  return (
    <>
      <section className="modal-section">
        <h3 className="modal-section-title">Application UI Appearance</h3>
        <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>UI Theme</h4>
        <div className="theme-grid">
          {[
            { id: 'dark', name: 'VS Code Dark' },
            { id: 'light', name: 'Light' },
            { id: 'amoled', name: 'Amoled Black' },
            { id: 'nord', name: 'Nord Frost' },
            { id: 'tokyonight', name: 'Tokyo Night' },
            { id: 'cyberpunk', name: 'Cyberpunk' },
          ].map((theme) => (
            <div
              key={theme.id}
              className={`theme-option ${uiTheme === theme.id ? 'selected' : ''}`}
              onClick={() => onUiThemeChange && onUiThemeChange(theme.id)}
            >
              {theme.name}
            </div>
          ))}
        </div>
      </section>

      <section className="modal-section">
        <h3 className="modal-section-title">Automation & Behavior</h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '15px',
            padding: '10px 0',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: '500',
                color: '#e5e5e5',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⚡ YOLO Mode (Auto-Approve Confirmations)
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              Automatically auto-accept confirmation prompts ([y/N], proceed?, password prompts) in
              running terminal sessions.
            </div>
          </div>
          <button
            onClick={() => onYoloModeChange && onYoloModeChange(!isYoloModeEnabled)}
            style={{
              width: '46px',
              height: '24px',
              borderRadius: '12px',
              background: isYoloModeEnabled ? 'linear-gradient(135deg, #eab308, #ca8a04)' : '#444',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              padding: 0,
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '3px',
                left: isYoloModeEnabled ? '25px' : '3px',
                transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
          </button>
        </div>
      </section>

      <section className="modal-section">
        <h3 className="modal-section-title">Terminal Appearance & Engine</h3>

        <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>Theme</h4>
        <div className="theme-grid">
          {[
            { id: 'vscode', name: 'VS Code Dark' },
            { id: 'monokai', name: 'Monokai' },
            { id: 'solarized-dark', name: 'Solarized Dark' },
            { id: 'one-dark', name: 'One Dark' },
            { id: 'custom', name: 'Custom' },
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

        {terminalTheme === 'custom' && customTheme && onCustomThemeChange && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#2d2d2d',
              borderRadius: '4px',
            }}
          >
            <h4
              style={{
                fontSize: '12px',
                marginBottom: '15px',
                color: '#aaa',
                textTransform: 'uppercase',
              }}
            >
              Custom Theme Editor
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              {Object.entries(customTheme).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => onCustomThemeChange({ ...customTheme, [key]: e.target.value })}
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: '0',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#ccc' }}>{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {onScrollbackChange && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>
              Scrollback Limit ({terminalScrollback} lines)
            </h4>
            <input
              type="number"
              min="100"
              max="50000"
              step="100"
              value={terminalScrollback}
              onChange={(e) => onScrollbackChange(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                background: '#3c3c3c',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {onQuakeModeChange && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="quake-mode-toggle"
              checked={isQuakeModeEnabled}
              onChange={(e) => onQuakeModeChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="quake-mode-toggle"
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ccc',
                marginLeft: '10px',
              }}
            >
              Enable Quake Mode (Alt + Space)
            </label>
          </div>
        )}

        {onStayAwakeChange && (
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="stay-awake-toggle"
              checked={isStayAwakeEnabled}
              onChange={(e) => onStayAwakeChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="stay-awake-toggle"
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ccc',
                marginLeft: '10px',
              }}
            >
              Stay Awake (Prevent system lock/sleep)
            </label>
          </div>
        )}

        {onShowTopTabBarChange && (
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="show-top-tab-bar-toggle"
              checked={showTopTabBar}
              onChange={(e) => onShowTopTabBarChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="show-top-tab-bar-toggle"
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ccc',
                marginLeft: '10px',
              }}
            >
              Show Top Tab Bar (Fast horizontal tabs)
            </label>
          </div>
        )}

        {/* Graphics & Rendering Settings */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', color: '#ccc' }}>
            🖥️ Graphics & Display
          </h4>

          {onTerminalRendererTypeChange && (
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="terminal-renderer-select"
                style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}
              >
                Terminal Rendering Engine
              </label>
              <select
                id="terminal-renderer-select"
                value={terminalRendererType}
                onChange={(e) =>
                  onTerminalRendererTypeChange(e.target.value as TerminalRendererType)
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#3c3c3c',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  outline: 'none',
                  fontSize: '13px',
                }}
              >
                <option value="canvas">Canvas 2D (Recommended - Avoids visual glitches)</option>
                <option value="webgl">WebGL (High Throughput GPU with Auto-Recovery)</option>
                <option value="dom">DOM (Safe Mode / Maximum Compatibility)</option>
              </select>
              <p style={{ fontSize: '11px', color: '#888', margin: '5px 0 0 0' }}>
                Canvas 2D provides smooth 60 FPS performance without WebGL glyph atlas corruption on
                Windows.
              </p>
            </div>
          )}

          {onGPUAccelerationChange && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="gpu-toggle"
                  checked={isGPUAccelerationEnabled}
                  onChange={(e) => onGPUAccelerationChange(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="gpu-toggle"
                  style={{
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#ccc',
                    marginLeft: '10px',
                  }}
                >
                  WebView2 Hardware Acceleration (Requires Restart)
                </label>
              </div>
              <p
                style={{
                  fontSize: '11px',
                  color: '#888',
                  marginLeft: '24px',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                {isGPUAccelerationEnabled
                  ? 'Chromium GPU rasterization active. Turn off if experiencing GPU driver artifacts or black boxes.'
                  : 'Software rendering mode enabled for WebView2 backend. Fixes GPU driver conflicts.'}
              </p>
            </div>
          )}

          {onRefreshDisplay && (
            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', color: '#ccc', fontWeight: 500 }}>
                  Visual Glitch Repair
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  Forces an immediate redraw of all terminals and window buffers (Shortcut:
                  Ctrl+Alt+R)
                </div>
              </div>
              <button
                type="button"
                onClick={onRefreshDisplay}
                style={{
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Refresh Display Now
              </button>
            </div>
          )}
        </div>

        {onShellChange && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#888' }}>Default Shell</h4>
            <select
              value={defaultShell || ''}
              onChange={(e) => onShellChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#3c3c3c',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              {osPlatform === 'linux' ? (
                <>
                  <option value="">System Default ($SHELL / Bash)</option>
                  <option value="bash">Bash (/bin/bash)</option>
                  <option value="zsh">Zsh (/bin/zsh)</option>
                  <option value="fish">Fish (/usr/bin/fish)</option>
                  <option value="sh">POSIX Shell (/bin/sh)</option>
                  <option value="pwsh">PowerShell Core (pwsh)</option>
                </>
              ) : osPlatform === 'macos' ? (
                <>
                  <option value="">System Default ($SHELL / Zsh)</option>
                  <option value="/bin/zsh">Zsh (/bin/zsh)</option>
                  <option value="/bin/bash">Bash (/bin/bash)</option>
                  <option value="fish">Fish</option>
                  <option value="pwsh">PowerShell Core (pwsh)</option>
                </>
              ) : (
                <>
                  <option value="">System Default (Windows PowerShell)</option>
                  <option value="powershell.exe">Windows PowerShell (5.1)</option>
                  <option value="pwsh.exe">PowerShell 7 Core (pwsh)</option>
                  <option value="cmd.exe">Command Prompt (cmd)</option>
                  <option value="git-bash">Git Bash</option>
                  <option value="wsl.exe">WSL (Linux Subsystem)</option>
                </>
              )}
              {defaultShell &&
                ![
                  '',
                  'powershell.exe',
                  'pwsh.exe',
                  'cmd.exe',
                  'git-bash',
                  'wsl.exe',
                  'bash',
                  '/bin/bash',
                  'zsh',
                  '/bin/zsh',
                  'fish',
                  '/usr/bin/fish',
                  'sh',
                  '/bin/sh',
                  'pwsh',
                ].includes(defaultShell) && (
                  <option value={defaultShell}>{defaultShell} (Custom)</option>
                )}
            </select>
          </div>
        )}
      </section>
    </>
  );
}
