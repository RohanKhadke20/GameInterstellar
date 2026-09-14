---
name: webgl-threejs-architecture
description: Performance standards for Three.js Canvas rendering, buffer geometry reuse, and procedural generation.
---

# WebGL / Three.js Architecture Skill

## Guidelines
1. Reuse geometries and materials across render loops.
2. Minimize draw calls using InstancedMesh or Points buffer attributes.
3. Deterministic procedural hash-based coordinate algorithms.
4. Clean lifecycle disposal in useEffect hooks.
