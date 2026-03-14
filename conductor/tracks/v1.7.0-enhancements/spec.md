# Specification: v1.7.0 Enhancements

## 1. Terminal Persistence
- Use `xterm-addon-serialize`.
- Save terminal buffers to a local cache on app close or periodically.
- Restore buffers when the app or tab is reopened.

## 2. Actionable Project Scripts
- Extract scripts from `package.json` (already detected).
- Show a sub-menu or panel in the sidebar for each project.
- Clicking a script runs it in a new terminal tab (or a dedicated task runner tab).

## 3. Git Status Badges
- Call `git status` for each project directory.
- Display branch name and a color-coded indicator (clean/dirty).
- Refresh on sidebar focus or periodically.

## 4. Split Panes
- Allow dragging a tab to the side to split.
- Use a layout manager (like `react-reflex` or custom) to handle terminal resizing in splits.

## 5. Enhanced Smart Detection
- Detect `go.mod`, `Cargo.toml`, `Dockerfile`, `docker-compose.yml`, `Makefile`.
- Assign specific icons and default scripts for these types.

## 6. Terminal Search UI
- A small, non-intrusive floating bar at the top right of the terminal.
- Support "Next", "Previous", and "Case Sensitive" options.
