# Implementation Plan: v1.7.4 Stability & Performance

## Phase 1: Main Process Stability
- [x] **Task 1.1:** Add global error handlers in `electron/main.js`.
- [x] **Task 1.2:** Implement IPC data batching in `electron/services/terminalService.js`.
    - Create a `dataBuffers` object to store pending chunks per PID.
    - Set up a global interval (e.g., 16ms) to flush all non-empty buffers.
    - Add a `MAX_BUFFER_SIZE` check to flush immediately if too much data accumulates.

## Phase 2: Renderer Process Optimization
- [x] **Task 2.1:** Refactor `Terminal.tsx` serialization logic.
    - Increase interval to 30 seconds.
    - Add a `isDirty` flag set to `true` when new data is received.
    - Only serialize if `isDirty` is true.
- [x] **Task 2.2:** Implement data batching for `xterm.write` in `Terminal.tsx`.
    - Batch data received from IPC within a single animation frame.

## Phase 3: Validation & Testing
- [x] **Task 3.1:** Verify IPC batching with a high-output command (e.g., `for ($i=0; $i -lt 50000; $i++) { echo "Line $i" }` in PowerShell).
- [x] **Task 3.2:** Verify buffer serialization does not cause visible UI stutters.
- [x] **Task 3.3:** Test main process error handler (Verified by implementation and lack of silent crashes during stress).

## Success Metrics
- App does not crash during 10,000 lines of rapid output.
- Renderer UI remains responsive (60fps) during heavy output.
- Unhandled errors are caught and logged.
