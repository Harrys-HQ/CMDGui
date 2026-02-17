# Implementation Plan: v1.3.0 Command Palette

## Phase 1: Infrastructure
- [x] Create `src/hooks/useCommands.ts` to define the command registry and execution logic.
- [x] Update `App.tsx` to provide necessary actions to the command hook.

## Phase 2: UI Enhancement
- [x] Refactor `QuickSwitcher.tsx` to detect the `>` prefix.
- [x] Update item rendering to show command icons and descriptions.
- [x] Implement fuzzy filtering for commands.

## Phase 3: Command Implementation
- [x] Connect "New Terminal" actions.
- [x] Connect "Terminal Management" actions (Clear, Rename, Close).
- [x] Connect "Application" actions (Settings, Updates, Themes).

## Phase 4: Polish & Testing
- [x] Add keyboard shortcuts display next to commands in the palette.
- [x] Verify keyboard navigation remains smooth.
- [x] Add unit tests for command filtering logic.