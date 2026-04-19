# Implementation Plan: v1.8.0 Performance & Stability Overhaul

## Phase 1: High-Speed Rendering
- [x] **Task 1.1:** Install `@xterm/addon-webgl` and `@xterm/addon-canvas`.
- [x] **Task 1.2:** Update `Terminal.tsx` to detect and load the WebGL addon, falling back to Canvas or DOM.

## Phase 2: Memory Management (Hibernation)
- [x] **Task 2.1:** Refactor `App.tsx` and `Terminal.tsx` to support unmounting.
    - Ensure `Terminal` preserves its `pid` and buffer state even when unmounted.
    - Implement a "lazy loading" strategy where `Terminal` only initializes `xterm` when `isActive` is true.
- [x] **Task 2.2:** Verify that background PTY data is still buffered in the Main process and flushed correctly upon "waking up".

## Phase 3: Infrastructure (Logging & Recovery)
- [x] **Task 3.1:** Create `electron/services/loggerService.js`.
- [x] **Task 3.2:** Implement session persistence for tab layouts in `useTabs.ts` and `usePersistence.ts`.

## Phase 4: UI Smoothness (Virtualization)
- [x] **Task 4.1:** Virtualize `FileExplorer.tsx` to handle directories with hundreds of files.
- [x] **Task 4.2:** Virtualize `Sidebar.tsx` project list (Decided to skip as item count is low and layout is complex).

## Phase 5: Final Polish
- [x] **Task 5.1:** Audit `package.json` for unused dependencies.
- [x] **Task 5.2:** Final stress test with 50+ tabs (Verified performance and stability).
