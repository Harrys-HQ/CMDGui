# Plan: Fix Terminal Clear Functionality

The current terminal clearing logic only sends `\x0c` to the PTY, which is often insufficient to clear the `xterm.js` buffer and viewport reliably. This plan implements a robust clearing mechanism that handles the frontend, backend, and persistence.

## Objective
Ensure the "Clear Terminal" action (via shortcut, context menu, and command palette) completely clears the terminal viewport, scrollback buffer, and persisted state.

## Key Files & Context
- `src/components/Terminal.tsx`: Main terminal component where clearing logic is implemented.
- `src/hooks/useKeybindings.ts`: Defines the `clearTerminal` shortcut (default: `Ctrl+Shift+L`).

## Implementation Steps

### 1. Update `src/components/Terminal.tsx`

Modify the terminal clearing logic in three places to include:
1.  `xtermRef.current.clear()`: Clears the scrollback buffer.
2.  `xtermRef.current.write('\x1b[2J\x1b[H')`: Clears the visible viewport and moves cursor to home.
3.  `localStorage.removeItem(...)`: Clears the persisted buffer for the pane.
4.  `window.electron.writeTerminal(...)`: Keep sending `\x0c` to notify the PTY.

#### Locations to update:
-   **`attachCustomKeyEventHandler`**: For the keyboard shortcut (`Ctrl+Shift+L`).
-   **`onClear` callback**: For the command palette trigger (via `App.tsx`).
-   **`onTerminalContextAction`**: For the context menu "Clear Terminal" option.

## Verification & Testing
1.  **Manual Test (Shortcut)**: Press `Ctrl+Shift+L` and verify the terminal is completely empty.
2.  **Manual Test (Context Menu)**: Right-click the terminal, select "Clear Terminal", and verify it clears.
3.  **Manual Test (Command Palette)**: Open Command Palette (`Ctrl+Shift+P`), type "Clear Terminal", select it, and verify it clears.
4.  **Persistence Test**: Clear the terminal, then hibernate the tab (wait 5 mins or manually trigger if possible) or relaunch the app. Verify the cleared state persists and no old data reappears.
