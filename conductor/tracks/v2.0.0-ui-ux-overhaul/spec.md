# Technical Specification: UI/UX Master Overhaul

## 1. Architectural Changes
- **Layout Restructure:** The `app-root-layout` will be updated to include an `ActivityBar` on the far left.
- **State Management:** 
  - New state for `activeSidebarView` ('explorer', 'git', 'settings').
  - New state for `notifications` (array of toast objects).
  - New state for `uiTheme` (separate from `terminalTheme`).

## 2. Component Specifications

### 2.1 ActivityBar (New)
- **Position:** Far left, vertical.
- **Icons:** Explorer (folder), Git (branch), Settings (gear), Account/Info (bottom).
- **Behavior:** Clicking an icon toggles the sidebar or switches its view.

### 2.2 TopTabBar (New)
- **Position:** Above the terminal area.
- **Features:**
  - Close button on tabs.
  - Active indicator.
  - Context menu (Close Others, Close to the Right).
  - Reordering support (DND).

### 2.3 WelcomeDashboard (New)
- **Condition:** Rendered when `tabs.length === 0`.
- **UI:** Grid/List layout with icons and shortcut hints.

### 2.4 Toast System (New)
- **Position:** Bottom-right overlay.
- **Types:** Success, Info, Warning, Error.
- **Auto-dismiss:** 5-10 seconds.

## 3. Styling Logic
- Standardize CSS variables further in `index.css`.
- Implement a `ThemeProvider` or class-based toggle on `<body>` for UI-wide themes.

## 4. Performance Considerations
- Use `React.memo` for the TabBar and ActivityBar to prevent unnecessary re-renders during terminal activity.
- Ensure Toast animations don't cause layout thrashing.
