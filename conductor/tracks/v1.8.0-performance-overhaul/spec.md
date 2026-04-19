# Specification: v1.8.0 Performance & Stability Overhaul

## 1. Tab Hibernation (Memory Management)
- **Concept:** When a tab is not active, its DOM elements and Xterm object instances are destroyed to free up memory. The underlying PTY process in the main process remains alive.
- **Restoration:** When a tab is re-activated, a new Xterm instance is created, and the terminal buffer is restored from `localStorage` (optimized in v1.7.4).
- **Threshold:** Apply hibernation if a tab has been inactive for > 5 minutes, or if total tab count exceeds 10.

## 2. WebGL/Canvas Rendering
- **Library:** `@xterm/addon-webgl` or `@xterm/addon-canvas`.
- **Benefit:** Reduces CPU usage for rendering text by shifting work to the GPU.
- **Fallback:** Detect GPU availability and fall back to the DOM renderer if necessary.

## 3. UI Virtualization
- **Target:** `FileExplorer.tsx` and `Sidebar.tsx` (Project lists).
- **Implementation:** Use `react-window` or a lightweight custom implementation to ensure only the currently visible items are rendered in the DOM.
- **Benefit:** Instant scrolling in projects with thousands of files or hundreds of folders.

## 4. Persistent Logging & Recovery
- **Logging:** Implement a `Logger` service in `electron/services/loggerService.js` that writes `stdout/stderr` to `%APPDATA%/CmdGUI/logs/main.log`.
- **Recovery:** Update `usePersistence.ts` to save the "Active Layout" (open tabs, their CWDs, and shell types) every 60 seconds. On startup, if the app closed unexpectedly, offer a "Restore Session" prompt.

## 5. Architectural Cleanliness
- **Throttling:** Extend the v1.7.4 IPC batching logic to handle status updates and notifications.
- **Code Splitting:** Use React `Suspense` and `lazy` loading for heavy components like the `SettingsModal`.

## Acceptance Criteria
- [ ] RAM usage stays below 500MB with 20 tabs open.
- [ ] Terminal scrolling remains 60fps even during "noisy" command output.
- [ ] Application logs are accessible in the local file system.
- [ ] Session persists across manual restarts.
