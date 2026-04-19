# Specification: v1.7.4 Stability & Performance

## Problem Statement
The application unexpectedly quits during processes that generate high volumes of terminal output. This behavior points to several architectural bottlenecks:
1. **IPC Flooding:** Every data chunk from `node-pty` is sent as a separate IPC message. High-frequency output can saturate the message queue.
2. **Synchronous Serialization:** The `SerializeAddon` is used every 10 seconds to save the entire buffer to `localStorage`. This blocks the renderer's main thread, potentially causing hangs or crashes.
3. **Implicit Error Handling:** The main process lacks global handlers for uncaught exceptions, causing silent failures.

## Proposed Solutions

### 1. IPC Data Batching
- **Service:** `electron/services/terminalService.js`
- **Mechanism:** For each terminal, maintain a buffer of incoming data.
- **Throttling:** Use an interval (e.g., 16ms) to send the accumulated buffer to the renderer.
- **Flush Condition:** Flush if the buffer exceeds a certain size (e.g., 64KB) or the interval elapsed.

### 2. Optimized Buffer Persistence
- **Component:** `src/components/Terminal.tsx`
- **Frequency:** Increase interval to 30s.
- **Dirty Check:** Only serialize if new data has been received since the last save.
- **Scheduling:** Use `requestIdleCallback` (or a fallback) to perform serialization during idle periods.

### 3. Global Error Handlers
- **Entry Point:** `electron/main.js`
- **Implementation:** Add `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)`.
- **Reporting:** Log errors to `console.error` and potentially a local log file.

### 4. Renderer Throttling
- **Component:** `src/components/Terminal.tsx`
- **Mechanism:** Batch writes to `xterm.js` if many data chunks arrive in a single frame.

## Acceptance Criteria
- [ ] Large file output (e.g. `cat large_file.txt`) does not freeze the UI or crash the app.
- [ ] Application remains responsive during rapid output.
- [ ] Main process logs any unhandled errors before exiting.
- [ ] CPU spikes from buffer serialization are minimized.
