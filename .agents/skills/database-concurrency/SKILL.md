---
name: database-concurrency
description: Strict SQLite transaction management, WAL mode concurrency, and atomic batch-operation optimization.
---

# Database Concurrency Skill

## Guidelines
1. Enforce WAL mode (PRAGMA journal_mode = WAL).
2. Wrap all read-then-write operations in BEGIN IMMEDIATE TRANSACTION ... COMMIT with ROLLBACK.
3. Multi-row upsert statements with ON CONFLICT DO UPDATE.
