# Workflow

## Development

### Prerequisites

- Node.js (v16+)
- npm

### Commands

- **Install Dependencies:** `npm install`
- **Run Development:** `npm run dev` (Runs React dev server + Electron)
  - `npm run dev:react`: Run Vite only.
  - `npm run dev:electron`: Run Electron only (waits for Vite).
- **Build Production:** `npm run dist` (Builds executable)
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Test:** `npm run test`

## Versioning & Releases

### Version Update Protocol

When updating the version, synchronize these files:

1. `package.json` (`version` field)
2. `src/components/SettingsModal.tsx` (UI version display)
3. `release_notes.md` (Add new release header)

After updating, run `npm run dist` to ensure the build matches.

## Project Structure

- `electron/`: Main process code.
  - `services/`: Core logic extracted from main.js.
    - `projectService.js`: Logic for detecting project types.
    - `terminalService.js`: Management of `node-pty` processes.
    - `settingsService.js`: Robust file-based persistence for settings and window state.
- `src/`: Renderer process code.

## Persistence

The application uses a dual persistence strategy:

- **Main Process Persistence:** `settingsService.js` stores data in the user's app data directory (`settings.json`). This includes window size, position, and maximization state.
- **Renderer Hooks:** `useTabs`, `useProjects`, and `useSettings` hooks interact with the Main process asynchronously via `usePersistence.ts` to save and load application state.
