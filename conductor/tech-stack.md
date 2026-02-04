# Tech Stack

## Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** CSS (PostCSS/Modules implied)

## Backend / Desktop Shell
- **Runtime:** Electron
- **Environment:** Node.js
- **Terminal Emulation:**
  - `xterm.js` (Frontend display)
  - `node-pty` (Backend process management)
  - `xterm-addon-fit`, `xterm-addon-search`, `xterm-addon-web-links`

## Build & Distribution
- **Builder:** electron-builder
- **Target:** Windows (NSIS), Linux (AppImage), Mac (DMG)

## Testing
- **Framework:** Vitest
- **Library:** React Testing Library
