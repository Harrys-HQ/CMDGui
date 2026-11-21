import React, { useState, useEffect } from 'react';

import { Keymap, KeybindingAction, Keybinding, formatKeybinding } from '../../hooks/useKeybindings';

const ACTION_LABELS: Record<KeybindingAction, string> = {
  commandPalette: 'Open Command Palette',
  newTab: 'New Terminal Tab',
  newAdminTab: 'New Terminal Tab (Admin)',
  closeTab: 'Close Active Tab',
  nextTab: 'Switch to Next Tab',
  prevTab: 'Switch to Previous Tab',
  clearTerminal: 'Clear Terminal',
  copy: 'Copy Selection',
  paste: 'Paste',
  find: 'Find in Terminal',
  newLine: 'Insert New Line (Terminal)',
  splitHorizontal: 'Split Pane Horizontally',
  splitVertical: 'Split Pane Vertically',
  closePane: 'Close Active Pane',
  toggleSidebar: 'Toggle Sidebar / Activity Bar View',
  refreshDisplay: 'Repair / Refresh Display (Fix Visual Glitches)',
};

const KeybindingRecorder: React.FC<{
  action: KeybindingAction;
  onSave: (binding: Keybinding) => void;
  onCancel: () => void;
}> = ({ action, onSave, onCancel }) => {
  const [recording, setRecording] = useState<Keybinding | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const newBinding: Keybinding = {
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      };

      setRecording(newBinding);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="keybinding-recorder-overlay">
      <div className="keybinding-recorder-modal">
        <h3>Record Keybinding for &quot;{ACTION_LABELS[action]}&quot;</h3>
        <div className="recording-display">
          {recording ? formatKeybinding(recording) : 'Press desired key combination...'}
        </div>
        <div className="recorder-actions">
          <button
            onClick={() => recording && onSave(recording)}
            disabled={!recording}
            className="primary-btn"
          >
            Save
          </button>
          <button onClick={onCancel} className="secondary-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

interface Props {
  onResetKeybindings: (() => void) | undefined;
  keymap: Keymap;
  onUpdateKeybinding: (action: KeybindingAction, binding: Keybinding) => void;
}

export default function KeybindingsSettings({
  onResetKeybindings,
  keymap,
  onUpdateKeybinding,
}: Props) {
  const [recordingAction, setRecordingAction] = useState<KeybindingAction | null>(null);
  return (
    <>
      <section className="modal-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="modal-section-title">Customize Keybindings</h3>
          <button
            onClick={onResetKeybindings}
            className="secondary-btn"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Reset to Default
          </button>
        </div>

        <div className="command-grid">
          {Object.entries(keymap).map(([action, binding]) => (
            <div
              key={action}
              className="command-item"
              onClick={() => setRecordingAction(action as KeybindingAction)}
              style={{ cursor: 'pointer' }}
              title="Click to record new keybinding"
            >
              <div className="command-name-col">
                <span className="command-pill">{formatKeybinding(binding)}</span>
              </div>
              <div className="command-desc-col">
                <div>{ACTION_LABELS[action as KeybindingAction]}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {recordingAction && (
        <KeybindingRecorder
          action={recordingAction}
          onSave={(newBinding) => {
            onUpdateKeybinding(recordingAction, newBinding);
            setRecordingAction(null);
          }}
          onCancel={() => setRecordingAction(null)}
        />
      )}
    </>
  );
}
