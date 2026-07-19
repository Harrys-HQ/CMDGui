# Workflow

## Development

### Prerequisites

- Node.js (v18+)
- npm
- Rust toolchain (cargo, rustc)

### Commands

- **Install Dependencies:** `npm install`
- **Run Development:** `npm run dev` (Runs `tauri dev` which boots the Vite dev server and the Rust app)
- **Build Production:** `npm run dist` (Runs `tauri build` to package the app)
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

- `src-tauri/`: Rust backend code.
  - `src/`: Rust source files.
    - `main.rs` & `lib.rs`: Tauri entry points and command registration.
    - `terminal.rs`: Management of PTY processes.
    - `project.rs`: Logic for detecting project types.
    - `settings.rs`: Robust file-based persistence for settings and window state.
    - `file_op.rs`: Custom file explorer operations.
- `src/`: React frontend process code.

## Persistence

The application uses a dual persistence strategy:

- **Backend Persistence:** `settings.rs` stores data in the user's app data directory (`settings.json`). This includes window size, position, maximization state, settings, and workspace state.
- **Frontend Hooks:** `useTabs`, `useProjects`, and `useSettings` hooks interact with the Rust backend command handlers asynchronously via `usePersistence.ts` to save and load application state.
