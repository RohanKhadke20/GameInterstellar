---
description: Always-on project rules and architectural standards for Astrolith.
always_on: true
---

# Astrolith Project Rules

1. **Game Engine Optimization:** Keep simulation ticks decoupled from I/O; calculate state in memory and execute batch updates in atomic transactions.
2. **WebGL/Three.js Standards:** Avoid memory allocation in animation loops; use BufferGeometry and explicit disposal in React unmount lifecycles.
3. **Real-Time Telemetry:** Separate lightweight deltas from periodic full syncs; validate WebSocket origins and enforce rate limits.
4. **Database Concurrency:** Always use parameterized SQLite queries and wrap compound operations in `BEGIN IMMEDIATE TRANSACTION ... COMMIT` / `ROLLBACK`.
5. **React State Management:** Use atomic Zustand selectors (`useStore(s => s.slice)`) and memoized pure CSS components to eliminate unnecessary re-renders.
