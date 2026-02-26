# Track Specification: v1.5.0 Configurable Keybindings

## Overview
Enable users to customize keyboard shortcuts for application actions. Currently, shortcuts are hardcoded in `App.tsx` and `Terminal.tsx`. This feature will centralize keybinding management and provide a UI for customization.

## User Experience
- **Settings UI:** A new "Keybindings" tab in the Settings modal.
- **Customization:** Users can click a command to record a new key combination.
- **Persistence:** Custom keybindings are saved and persist across sessions.
- **Conflict Detection:** (Optional for v1) Warn if a keybinding is already in use.

## Technical Requirements
- **Centralized Registry:** Create a `KeybindingService` or `useKeybindings` hook to manage the map of `Action ID -> Key Combination`.
- **Storage:** Persist keybindings in `settings.json` via `usePersistence` or `settingsService`.
- **Advanced Tools:**
  - **Workspaces:** Allow users to capture the current state of all open tabs and panes into a named "Workspace" for later restoration.
  - **Command History:** Log all executed commands in a persistent list, allowing users to bookmark favorites or re-run them directly from Settings.
  - **Pane Splitting:** Support dividing a single tab into multiple terminal panes (recursive layout).
  - **File Explorer:** Add an interactive directory tree for each project in the sidebar to browse files without leaving the app.
- **Refactoring:** Replace hardcoded checks in `App.tsx` and `Terminal.tsx` with lookups against the registry.
- **Default Keybindings:**
  - `commandPalette`: `Ctrl+Shift+P`
  - `newTab`: `Ctrl+Shift+N`
  - `closeTab`: `Ctrl+Shift+W`
  - `nextTab`: `Ctrl+Tab`
  - `prevTab`: `Ctrl+Shift+Tab`
  - `clearTerminal`: `Ctrl+L` (Terminal context)
  - `copy`: `Ctrl+Shift+C` (Terminal context)
  - `paste`: `Ctrl+Shift+V` (Terminal context)
