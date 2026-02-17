# Track Specification: v1.3.0 Command Palette

## Overview
Transform the existing "Quick Switcher" into a fully functional Command Palette. It should support two modes:
1.  **Search Mode (Default):** Search and switch between active tabs and projects (current behavior).
2.  **Command Mode (Prefix with `>`):** Execute application commands (e.g., "New Tab", "Clear Terminal", "Toggle Theme").

## User Experience
- **Trigger:** `Ctrl + Shift + P`.
- **Navigation:** Arrow keys and Enter to select.
- **Dynamic Content:** Commands should be filtered based on the query.
- **Action Feedback:** Executing a command should close the palette and provide immediate feedback (e.g., a new tab opens).

## Commands to Implement
- `> New Terminal`
- `> New Terminal (Admin)`
- `> Clear Terminal`
- `> Rename Current Task`
- `> Close Current Task`
- `> Toggle Theme`
- `> Settings`
- `> Check for Updates`

## Technical Requirements
- Extend `QuickSwitcher.tsx` to handle the `>` prefix logic.
- Centralize command definitions in a new hook or utility.
- Ensure commands have access to application state (e.g., `addTab`, `activeTabId`).
