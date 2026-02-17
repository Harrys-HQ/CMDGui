# Implementation Plan: v1.2.0 Upgrade

## Phase 1: Code Health & Cleanup (Done)
- [x] Fix 8 ESLint warnings (hook dependencies, terminal cleanup).
- [x] Refactor `useTabs` and `useProjects` with `useCallback`.
- [x] Fix TypeScript type safety in tests.

## Phase 2: Update System (Done)
- [x] Implement startup check in `main.js`.
- [x] Add update indicator to `StatusBar`.
- [x] Connect `App.tsx` to update status IPC.

## Phase 3: Main Process Refactor (Done)
- [x] Extract `projectService.js`.
- [x] Extract `terminalService.js`.
- [x] Extract `settingsService.js` (Window State Persistence).
- [x] Clean up `main.js`.

## Phase 4: Persistence Migration (Done)
- [x] Add settings IPC handlers to `preload.js`.
- [x] Refactor `usePersistence.ts` for async Electron-based storage.
- [x] Update `useTabs`, `useProjects`, `useSettings`, and `useSidebarResizer` hooks.
- [x] Fix test suite for asynchronous initialization.

## Phase 5: Release (Done)
- [x] Bump version to 1.2.0.
- [x] Update `release_notes.md`.
- [x] Build and tag release.
