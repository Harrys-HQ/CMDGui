# Track: v1.9.0 File Operations & Universal Shortcuts

## Overview
This track polishes the File Explorer with CRUD operations (Create, Rename, Delete) and ensures that application shortcuts do not conflict with standard CLI control codes across various shells and tools.

## Objectives
- [ ] **File Explorer CRUD:**
    - Implement `createFile`, `createDirectory`, `renameItem`, and `deleteItem` in the main process.
    - Add context menu support to the `FileExplorer` component.
    - Implement a renaming UI (inline or modal).
- [ ] **Universal Shortcut Compatibility:**
    - Audit all app shortcuts and migrate to non-conflicting modifiers (primarily `Ctrl + Shift`).
    - Resolve the `Ctrl + L` (Clear) and `Ctrl + F` (Find) conflicts.
    - Ensure standard shell control codes (e.g., `Ctrl+C`, `Ctrl+D`, `Ctrl+Z`, `Ctrl+R`) are always passed through to the terminal.

## Documents
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
