# Specification: Graphical Stability Fix

## Problem
1. **Initial Rendering Flicker:** When the app is opened, a momentary flicker or "snap" occurs before the terminal is correctly sized and themed.
2. **Persistent Graphical Glitches:** Artifacts (gray/black horizontal bars), flickering, or black areas may appear after the app has been running for some time, often due to GPU acceleration and rasterization issues in Electron 40 on Windows.

## Proposed Changes

### 1. Main Process (`electron/main.js`)
- Use `show: false` in `BrowserWindow` options.
- Implement the `ready-to-show` event to display the window only when it's visually ready.
- Support disabling hardware acceleration via a command-line flag or setting.
- **Add `app.commandLine.appendSwitch('disable-gpu-rasterization')`** to fix the horizontal bar artifacts.

### 2. Settings & Persistence
- Add `isGPUAccelerationEnabled` to `useSettings.ts` (default: true).
- Provide a toggle in `SettingsModal.tsx` under a new "Advanced" or "System" section.
- Since hardware acceleration requires a restart, show a message notifying the user.

### 3. Terminal Initial Size
- Ensure the initial PTY creation uses dimensions closer to the actual container if possible, or ensure `fitTerminal` runs as early as possible.

### 4. Terminal Rendering Tweaks (`src/components/Terminal.tsx`)
- Set an explicit `lineHeight` (e.g., `1.2`) to avoid sub-pixel gaps and rendering artifacts on Windows.
- Ensure `fitTerminal` uses `Math.floor` or similar stable dimensions.
- **Change `contain: size layout` to `contain: paint`** on the terminal element to isolate rendering without the size-related artifacts.

## Verification Plan
1. **Manual Testing:**
   - Launch the app and verify the startup sequence is smooth without a "white flash".
   - Toggle Hardware Acceleration and verify the app requires a restart to apply the change.
   - Verify that the terminal fits its container correctly on first render.
   - Verify that the horizontal gray bars (as seen in the user screenshot) are resolved.
