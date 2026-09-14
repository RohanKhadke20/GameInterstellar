---
name: realtime-telemetry
description: WebSocket pipeline efficiency, payload compression, CSWSH verification, and connection lifecycle management.
---

# Real-Time Telemetry Skill

## Guidelines
1. Differentiate lightweight 1000ms delta events (TICK_UPDATE) from 5000ms authoritative state frames (TELEMETRY_SYNC).
2. Enforce verifyClient origin checks and frame rate limiting (10 frames/sec).
3. Implement exponential backoff with jitter on reconnects.
