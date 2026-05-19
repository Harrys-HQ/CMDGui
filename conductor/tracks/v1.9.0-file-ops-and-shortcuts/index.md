# Track: v1.File Operations & Universal Shortcuts (v1.9.3)

## Status: Completed (2026-05-19)

## Overview
This track polishes the File Explorer with CRUD operations (Create, Rename, Delete) and ensures that application shortcuts do not conflict with standard CLI control codes. v1.9.3 adds robust terminal clearing functionality.

## Objectives
- [x] **File Explorer CRUD:**
    - Implement `createFile`, `createDirectory`, `renameItem`, and `deleteItem` in the main process.
    - Add context menu support to the `FileExplorer` component.
    - Implement a renaming UI (inline or modal).
- [x] **Universal Shortcut Compatibility:**
    - Audit all app shortcuts and migrate to non-conflicting modifiers (primarily `Ctrl + Shift`).
    - Resolve the `Ctrl + L` (Clear) and `Ctrl + F` (Find) conflicts.
    - Ensure standard shell control codes (e.g., `Ctrl+C`, `Ctrl+D`, `Ctrl+Z`, `Ctrl+R`) are always passed through to the terminal.
- [x] **Robust Terminal Clearing (v1.9.3):**
    - Implement comprehensive clearing of xterm.js buffer, viewport, and persisted state.
- [x] **Post-Release Stability:**
    - Resolve `TypeError` in Sidebar during folder interaction (v1.9.1/v1.9.2).
    - Implement codebase-wide safety checks for `tab.panes`.

## Documents
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Terminal Clear Fix Plan](./fix-terminal-clear.md)

