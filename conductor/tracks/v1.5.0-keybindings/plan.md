# Implementation Plan: v1.5.0 Configurable Keybindings

## Phase 1: Core Infrastructure
- [x] Define `Keybinding` type and default keymap.
- [x] Create `useKeybindings` hook for loading/saving bindings.
- [x] Implement a `checkKeybinding(event, actionId)` utility function.

## Phase 2: Refactoring
- [x] Refactor `App.tsx` to use the keybinding hook instead of hardcoded strings.
- [x] Refactor `Terminal.tsx` to respect customizable bindings (pass via props or context).
- [x] Refactor `useCommands.ts` to display dynamic shortcuts in the Command Palette.

## Phase 3: Settings UI
- [x] Add "Keybindings" tab to `SettingsModal.tsx`.
- [x] Create a `KeybindingRecorder` component to capture user input.
- [x] Implement reset to default functionality.

## Phase 4: Testing
- [x] Verify persistence works.
- [x] Verify new bindings trigger correct actions.
- [x] Verify conflicts/overlaps are handled gracefully (last one wins or simple overwrite).

## Phase 5: Advanced Tools
- [x] Implement **Workspace Management** (Save/Load/Delete layout states).
- [x] Implement **Command History** with bookmarking and re-run capability.
- [x] Implement **Inline File Explorer** for projects in the sidebar.
- [x] Implement **Pane Splitting** (Horizontal/Vertical) for multi-shell workflows.
- [x] Add dedicated tabs in Settings for History and Workspaces.