# Tech Stack

## Frontend

- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** CSS

## Backend / Desktop Shell

- **Framework:** Tauri v2
- **Language:** Rust
- **Terminal Emulation:**
  - `xterm.js` (Frontend display)
  - Custom Rust PTY/process management (implemented in `src-tauri/src/terminal.rs`)
  - `xterm-addon-fit`, `xterm-addon-search`, `xterm-addon-web-links`

## Build & Distribution

- **Builder:** Tauri CLI (`tauri build`)
- **Target:** Windows (MSI, NSIS exe), Linux (AppImage/deb), Mac (DMG/app)

## Testing

- **Framework:** Vitest
- **Library:** React Testing Library
