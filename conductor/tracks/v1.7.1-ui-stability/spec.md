# Specification: UI Stability & Rubber Band Effect Fix

## Problem
The GUI exhibits a "rubber band effect" (jitter, bouncing, or layout jumps) when terminal output is large or when code updates are happening rapidly. This is caused by:
1. Unthrottled `fitTerminal` calls in `ResizeObserver`, leading to rapid IPC calls and layout thrashing.
2. Default Flexbox behavior allowing containers to expand to fit content, causing layout shifts.
3. Default browser overscroll behavior causing a "bounce" effect at scroll boundaries.

## Proposed Changes

### 1. Terminal Component (`src/components/Terminal.tsx`)
- Implement a debounced `fitTerminal` using `requestAnimationFrame`.
- Ensure `fitTerminal` is only called when the terminal is actually visible and active.
- Prevent redundant `fitTerminal` calls if the dimensions haven't changed significantly.

### 2. Global Styles (`src/index.css`)
- Add `overscroll-behavior: none` to `body`, `.main-content`, and `.terminal-container`.
- Add `min-height: 0` and `min-width: 0` to flex containers (`.main-content`, `.terminal-container`, `.workspace-layout`) to prevent expansion.
- Use `contain: strict` or `contain: size layout` on the terminal element to isolate its rendering performance.

### 3. Sidebar Stability
- Ensure the sidebar resizer doesn't trigger excessive re-renders during drag.

## Verification Plan
1. **Manual Testing:**
   - Run a command that outputs a large amount of text (e.g., `cat` a large file or `npm install`).
   - Observe if the UI jumps or bounces.
   - Resize the sidebar while a command is running.
   - Verify that the terminal fits correctly after resizing.
2. **Performance Check:**
   - Ensure the number of `terminal-resize` IPC calls is minimized during rapid resizing.
