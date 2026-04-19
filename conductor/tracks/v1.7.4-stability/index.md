# Track: v1.7.4 Stability & Performance

## Overview
This track addresses issues where the CLI (application) quits unexpectedly during heavy processes. The primary suspects are IPC flooding, synchronous buffer serialization blocking the main thread, and lack of error handling in the main process.

## Objectives
- [ ] Implement IPC batching/throttling for terminal data.
- [ ] Optimize terminal buffer serialization and persistence.
- [ ] Add global error handlers to the main process for better crash reporting.
- [ ] Implement renderer-side throttling for terminal writes.

## Documents
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
