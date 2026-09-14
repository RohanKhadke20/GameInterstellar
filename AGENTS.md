# Astrolith System Orchestration & Specialized Engineering Protocols

This document defines the persistent architectural, performance, and security directives for all operations in the **Astrolith** workspace.

---

## 1. Game Engine Optimization
* **High-Frequency Tick Heuristics:**
  - Decouple simulation math from I/O and frame rates. Tick loops (e.g. 1000ms server ticks) must process in memory first before executing batched I/O.
  - Asynchronous state calculation protocols: Compute time-deltas (`elapsedSeconds = now - lastTick`) and rate multipliers (`extraction_rate * multiplier * delta`) using floating-point aggregation with bounded rounding.
  - Offline Catch-Up Algorithm: Handle long disconnection intervals in single-pass arithmetic computations (O(1)) rather than iterative simulation loops (O(N)) to avoid CPU spikes during reconnection.

## 2. WebGL & Three.js Architecture
* **Canvas Rendering Performance Standards:**
  - Geometry & Material Reuse: Instantiate shared geometries and materials outside animation loops. Avoid creating new `THREE.Vector3` or `THREE.Mesh` objects inside `requestAnimationFrame` to prevent GC pauses.
  - Draw Call Minimization: Use `THREE.InstancedMesh` or `THREE.Points` (particle buffers) for repetitive celestial bodies, mineral clouds, and fleet vessels.
  - Procedural Generation: Use seeded hash-based coordinate calculations for deterministic procedural sector generation.
  - Resource Cleanup: Ensure strict cleanup in React `useEffect` lifecycles: call `geometry.dispose()`, `material.dispose()`, and `renderer.dispose()` when components unmount.

## 3. Real-Time Telemetry & WebSocket Pipelines
* **Pipeline Efficiency & Compression:**
  - State Payload Delta Compression: Distinguish between lightweight delta events (`TICK_UPDATE`) and authoritative sync frames (`TELEMETRY_SYNC`). Avoid streaming complete duplicate state arrays on high-frequency ticks.
  - Connection Lifecycle & Backoff: Implement exponential backoff with randomized jitter on client reconnects to eliminate thundering-herd issues on server restarts.
  - Security & Traffic Control: Enforce strict origin validation (`verifyClient`) against CSWSH, limit maximum frame payloads (`maxPayload: 64KB`), and rate-limit client messages per socket window (e.g., max 10 frames/sec).

## 4. Database Concurrency & SQLite Engine
* **Strict Transaction Protocols:**
  - Concurrency Mode: Keep SQLite configured in WAL mode (`PRAGMA journal_mode = WAL;`) with `NORMAL` synchronous settings.
  - Atomic Mutation Blocks: Any multi-step operation involving read-then-write (such as resource sales, ship deployments, or user catch-up) must be wrapped in `BEGIN IMMEDIATE TRANSACTION ... COMMIT` with automatic `ROLLBACK` on errors to eliminate TOCTOU race conditions.
  - Batching: Utilize multi-row `INSERT ... ON CONFLICT(user_id, resource_id) DO UPDATE SET quantity = quantity + excluded.quantity` to update inventories in bulk.

## 5. React State Management & Render-Cycle Mitigation
* **Zustand Partial State Selectors:**
  - Selective Subscriptions: Never subscribe to whole store objects (`const store = useStore()`). Always use atomic slice selectors: `const inventory = useStore((state) => state.inventory);`.
  - Structural Equality Verification: Use shallow list/object diffing before committing store updates (`useStore.setState(...)`) on incoming WebSocket payloads to prevent unneeded component tree re-renders.
  - Zero-JS CSS Optimization: Favor CSS-driven hover and focus states (e.g. Tailwind `group-hover:opacity-100`) over React-managed mouseover states for grid arrays with >100 dynamic nodes.
