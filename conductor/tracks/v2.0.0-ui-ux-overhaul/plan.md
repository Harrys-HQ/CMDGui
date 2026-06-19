# Implementation Plan: v2.0.0 UI/UX Master Overhaul

## Phase 1: Core Layout & Activity Bar
- [x] **Task 1.1:** Create `ActivityBar.tsx` component.
- [x] **Task 1.2:** Update `App.tsx` and `index.css` to accommodate the new vertical bar on the far left.
- [x] **Task 1.3:** Implement logic to toggle Sidebar views (Explorer vs Settings) from the Activity Bar.

## Phase 2: Navigation (Top Tabs & Breadcrumbs)
- [x] **Task 2.1:** Create `TopTabBar.tsx`.
- [x] **Task 2.2:** Integrate `TopTabBar` into the main content area and sync with `useTabs`.
- [x] **Task 2.3:** Implement `Breadcrumbs.tsx` showing the current working directory of the active terminal.

## Phase 3: Visual Feedback (Toasts & Highlighting)
- [x] **Task 3.1:** Create a `useToast` hook and `ToastContainer.tsx`.
- [x] **Task 3.2:** Replace generic `alert()` calls with Toast notifications.
- [x] **Task 3.3:** Add "Active Pane" visual highlighting in `Terminal.tsx` and split layouts.

## Phase 4: Empty State & Polish
- [x] **Task 4.1:** Create `WelcomeDashboard.tsx` for the zero-tab state.
- [x] **Task 4.2:** Standardize all Context Menus with icons and better grouping.
- [x] **Task 4.3:** Make Status Bar items interactive (click to trigger relevant modals/actions).

## Phase 5: Personalization & Themes
- [x] **Task 5.1:** Implement Global UI Themes (Dark, Light, Amoled).
- [x] **Task 5.2:** Enhance the Command Palette (Ctrl+P) with "Action Commands" (prefixed with `>`).

## Phase 6: Validation & Release
- [x] **Task 6.1:** Comprehensive UI/UX audit across all screen sizes.
- [x] **Task 6.2:** Final build and version bump to v2.0.0.
