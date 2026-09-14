---
name: react-state-management
description: Strict render-cycle mitigation techniques utilizing Zustand partial state selectors and shallow diffing.
---

# React State Management Skill

## Guidelines
1. Always subscribe with atomic slice selectors (useStore(s => s.inventory)).
2. Perform shallow equality comparisons before committing incoming WebSocket frames.
3. Leverage pure CSS transitions (group-hover) for high-density grids to eliminate JS hover re-renders.
