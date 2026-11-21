import type { SettingsModalProps } from './settings/types';
import { useAppUpdates } from './settings/useAppUpdates';
import AboutSettings from './settings/AboutSettings';
import HistorySettings from './settings/HistorySettings';
import WorkspacesSettings from './settings/WorkspacesSettings';
import CliSettings from './settings/CliSettings';
import KeybindingsSettings from './settings/KeybindingsSettings';
import GeneralSettings from './settings/GeneralSettings';
import React, { useState, useEffect } from 'react';
import { tauriBridge } from '../tauriBridge';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  terminalTheme,
  onThemeChange,
  customTheme,
  onCustomThemeChange,
  uiTheme,
  onUiThemeChange,
  terminalFontSize,
  onFontSizeChange,
  terminalScrollback,
  onScrollbackChange,
  isQuakeModeEnabled,
  onQuakeModeChange,
  isStayAwakeEnabled,
  onStayAwakeChange,
  isGPUAccelerationEnabled,
  onGPUAccelerationChange,
  terminalRendererType = 'canvas',
  onTerminalRendererTypeChange,
  onRefreshDisplay,
  workspaces,
  onDeleteWorkspace,
  history,
  onToggleBookmark,
  onClearHistory,
  onRunCommand,
  defaultShell,
  onShellChange,
  keymap,
  onUpdateKeybinding,
  onResetKeybindings,
  showTopTabBar = true,
  onShowTopTabBarChange,
  isYoloModeEnabled = false,
  onYoloModeChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'general'
    | 'keybindings'
    | 'workspaces'
    | 'about'
    | 'project'
    | 'appearance'
    | 'cli'
    | 'history'
  >('general');
  const [osPlatform, setOsPlatform] = useState<'windows' | 'linux' | 'macos' | 'other'>('windows');

  useEffect(() => {
    tauriBridge.getPlatform().then(setOsPlatform);
  }, []);

  const {
    appVersion,
    updateState,
    updateInfo,
    downloadProgress,
    errorMessage,
    handleCheckUpdate,
    handleDownload,
    handleQuitAndInstall,
  } = useAppUpdates(isOpen);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">CmdGUI Settings</h2>
          <button onClick={onClose} className="modal-close-btn">
            ×
          </button>
        </div>

        <div className="modal-tabs">
          <div
            className={`modal-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            🎨 Appearance & UI
          </div>
          <div
            className={`modal-tab ${activeTab === 'keybindings' ? 'active' : ''}`}
            onClick={() => setActiveTab('keybindings')}
          >
            ⌨️ Shortcuts
          </div>
          <div
            className={`modal-tab ${activeTab === 'workspaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspaces')}
          >
            📁 Workspaces
          </div>
          <div
            className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 History
          </div>
          <div
            className={`modal-tab ${activeTab === 'cli' ? 'active' : ''}`}
            onClick={() => setActiveTab('cli')}
          >
            ✨ AI & Commands
          </div>
          <div
            className={`modal-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ About & Updates
          </div>
        </div>

        <div className="modal-content">
          {activeTab === 'general' && (
            <GeneralSettings
              uiTheme={uiTheme}
              onUiThemeChange={onUiThemeChange}
              onYoloModeChange={onYoloModeChange}
              isYoloModeEnabled={isYoloModeEnabled}
              terminalTheme={terminalTheme}
              onThemeChange={onThemeChange}
              customTheme={customTheme}
              onCustomThemeChange={onCustomThemeChange}
              terminalFontSize={terminalFontSize}
              onFontSizeChange={onFontSizeChange}
              onScrollbackChange={onScrollbackChange}
              terminalScrollback={terminalScrollback}
              onQuakeModeChange={onQuakeModeChange}
              isQuakeModeEnabled={isQuakeModeEnabled}
              onStayAwakeChange={onStayAwakeChange}
              isStayAwakeEnabled={isStayAwakeEnabled}
              onShowTopTabBarChange={onShowTopTabBarChange}
              showTopTabBar={showTopTabBar}
              onTerminalRendererTypeChange={onTerminalRendererTypeChange}
              terminalRendererType={terminalRendererType}
              onGPUAccelerationChange={onGPUAccelerationChange}
              isGPUAccelerationEnabled={isGPUAccelerationEnabled}
              onRefreshDisplay={onRefreshDisplay}
              onShellChange={onShellChange}
              defaultShell={defaultShell}
              osPlatform={osPlatform}
            />
          )}

          {activeTab === 'keybindings' && keymap && onUpdateKeybinding && (
            <KeybindingsSettings
              onResetKeybindings={onResetKeybindings}
              keymap={keymap}
              onUpdateKeybinding={onUpdateKeybinding}
            />
          )}

          {activeTab === 'cli' && <CliSettings />}

          {activeTab === 'workspaces' && (
            <WorkspacesSettings workspaces={workspaces} onDeleteWorkspace={onDeleteWorkspace} />
          )}

          {activeTab === 'history' && (
            <HistorySettings
              onClearHistory={onClearHistory}
              history={history}
              onRunCommand={onRunCommand}
              onToggleBookmark={onToggleBookmark}
            />
          )}

          {activeTab === 'about' && (
            <AboutSettings
              portableConfig={{
                terminalTheme,
                uiTheme,
                terminalFontSize,
                terminalScrollback,
                isQuakeModeEnabled,
                isStayAwakeEnabled,
                isYoloModeEnabled,
                isGPUAccelerationEnabled,
                defaultShell,
                showTopTabBar,
                customTheme,
                keymap,
              }}
              appVersion={appVersion}
              updateState={updateState}
              handleCheckUpdate={handleCheckUpdate}
              updateInfo={updateInfo}
              handleDownload={handleDownload}
              downloadProgress={downloadProgress}
              handleQuitAndInstall={handleQuitAndInstall}
              errorMessage={errorMessage}
              onThemeChange={onThemeChange}
              onUiThemeChange={onUiThemeChange}
              onFontSizeChange={onFontSizeChange}
              onScrollbackChange={onScrollbackChange}
              onCustomThemeChange={onCustomThemeChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
