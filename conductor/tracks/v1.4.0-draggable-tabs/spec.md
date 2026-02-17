# Track Specification: v1.4.0 Draggable Tabs

## Overview
Allow users to reorder terminal tabs in the sidebar using drag-and-drop. This improves workspace organization, especially when many tasks are open.

## User Experience
- **Drag Start:** Visual indication that a tab is being picked up.
- **Drag Over:** Visual cue (e.g., a line or highlight) showing where the tab will be dropped.
- **Drop:** Tab moves to the new position.
- **Persistence:** The new order should be saved so it persists across sessions.

## Technical Requirements
- Use native HTML5 Drag and Drop API for zero-dependency implementation.
- Update `useTabs.ts` to include a `reorderTabs(startIndex, endIndex)` function.
- Update `Sidebar.tsx` and `TaskItem.tsx` with drag events (`onDragStart`, `onDragOver`, `onDrop`).
- Ensure persistence logic in `usePersistence.ts` handles the reordered array.
