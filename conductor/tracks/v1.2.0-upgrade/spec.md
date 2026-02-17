# Specification: v1.2.0 Upgrade

## Objective
Improve code maintainability, data integrity, and user awareness of application updates.

## Scope
- **Architectural Refactor:** Separate concerns in the Electron main process.
- **Persistence Upgrade:** Move from `localStorage` to a reliable file-based store (`settings.json`).
- **Update System:** Implement proactive notifications for new versions.
- **Code Quality:** Resolve all linting warnings and stabilize hooks.

## Technical Details
- **Services:** `terminalService.js`, `projectService.js`, `settingsService.js`.
- **IPC:** New `settings-get` and `settings-set` channels.
- **UI:** Update indicator in `StatusBar.tsx`.
- **Persistence:** Asynchronous `loadState`/`saveState` using Electron IPC.
