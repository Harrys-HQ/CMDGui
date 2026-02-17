# Implementation Plan: v1.4.0 Draggable Tabs

## Phase 1: State Management
- [x] Add `reorderTabs` function to `useTabs.ts`.
- [x] Ensure `usePersistence.ts` correctly saves the new order.

## Phase 2: UI Implementation
- [x] Update `TaskItem.tsx` to be draggable.
- [x] Implement `onDragStart` and `onDragEnd` in `TaskItem`.
- [x] Implement `onDragOver` and `onDrop` in `Sidebar.tsx` (on the task list container or items).
- [x] Add visual feedback for the drop target.

## Phase 3: Polish & Testing
- [x] Fix any edge cases (e.g., dragging onto non-tab areas).
- [x] Add unit tests for the reorder logic in `useTabs.test.ts`.