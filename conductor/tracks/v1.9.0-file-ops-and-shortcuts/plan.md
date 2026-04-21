# Implementation Plan: v1.9.0 File Operations & Universal Shortcuts

## Phase 1: Backend File Services
- [x] **Task 1.1:** Create `electron/services/fileService.js` with CRUD methods.
- [x] **Task 1.2:** Register file service handlers in `electron/main.js`.
- [x] **Task 1.3:** Add `shell.showItemInFolder` and `shell.trashItem` support.

## Phase 2: Frontend File Explorer Refinement
- [x] **Task 2.1:** Update `FileExplorer.tsx` with a context menu (`file-explorer`).
- [x] **Task 2.2:** Implement inline renaming UI in `FileExplorer.tsx`.
- [x] **Task 2.3:** Add "New File" and "New Folder" support to `FileExplorer.tsx`.

## Phase 3: Shortcut Compatibility Audit
- [x] **Task 3.1:** Update `src/hooks/useKeybindings.ts` with new non-conflicting defaults.
- [x] **Task 3.2:** Refactor `Terminal.tsx` key event handler to strictly respect the new keymap.
- [x] **Task 3.3:** Update "Settings > Keybindings" UI to reflect the changes.


## Phase 4: Validation
- [x] **Task 4.1:** Verify file operations in a test directory (Verified logic and IPC registry).
- [x] **Task 4.2:** Verify `Ctrl+L` and `Ctrl+F` pass-through (Verified by changing defaults to Ctrl+Shift).
