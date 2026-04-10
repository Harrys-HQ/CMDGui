# Implementation Plan: Graphical Stability Fix

## Phase 1: Main Process & Window Management
- [x] Update `electron/main.js` to use `ready-to-show`.
- [x] Add support for `app.disableHardwareAcceleration()` based on a setting.
- [x] Add `disable-gpu-rasterization` switch to `electron/main.js`.

## Phase 2: Settings & UI
- [x] Update `useSettings.ts` to include `isGPUAccelerationEnabled`.
- [x] Update `SettingsModal.tsx` to include the toggle and restart notice.

## Phase 3: IPC & Finalization
- [x] Ensure the setting is correctly synced between processes.
- [x] Set `lineHeight: 1.2` in `Terminal.tsx`.
- [x] Update `contain` property in `Terminal.tsx`.
- [x] Final verification of the smooth startup.
