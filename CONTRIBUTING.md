# Contributing to Astrolith (GameInterstellar)

Thank you for contributing to Astrolith! Whether you are building new WebGL shaders, optimizing Three.js geometries, or adding WebSocket simulation events, your pull requests are appreciated.

---

## 🛠️ Monorepo Setup

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/RohanKhadke20/GameInterstellar.git
   cd GameInterstellar
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm run install:all
   ```

3. **Start Concurrently**:
   ```bash
   npm run dev
   ```
   - Client runs on `http://localhost:3000` (Vite)
   - Express & WebSockets run on `http://localhost:5000`

---

## 🎨 Three.js Performance Guidelines

- Maintain 60 FPS target across standard desktop GPUs.
- Utilize instanced meshes (`InstancedMesh`) for large celestial fields.
- Dispose geometries, materials, and textures when scenes unmount to prevent WebGL memory leaks.
