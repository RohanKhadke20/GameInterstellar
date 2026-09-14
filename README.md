# 🌌 Astrolith Monorepo

Astrolith is a full-stack monorepo featuring a high-performance **Node.js / Express** backend and a **Vite + React** frontend with **Three.js**, **Zustand**, **React Router**, **SQLite3**, and **WebSockets**.

---

## 📁 Repository Structure

```text
astrolith/
├── package.json               # Root workspace package.json & concurrent scripts
├── .gitignore
├── README.md
├── server/                    # Backend Node.js / Express service
│   ├── package.json           # Dependencies: express, sqlite3, ws, cors, dotenv
│   ├── .env                   # Server environment variables
│   ├── .env.example
│   └── src/
│       ├── index.js           # Express + WebSocket server entry point
│       └── db.js              # SQLite database configuration and initialization
└── client/                    # Frontend React + Vite application
    ├── package.json           # Dependencies: react, react-router-dom, three, zustand
    ├── vite.config.js         # Vite configuration with API/WS proxies
    ├── index.html
    └── src/
        ├── App.jsx            # Router and base layout
        ├── main.jsx           # React DOM root
        ├── store/
        │   └── useStore.js    # Zustand store & WebSocket manager
        ├── components/
        │   ├── Navbar.jsx     # Navigation bar with live connection indicators
        │   └── ThreeCanvas.jsx# Interactive 3D Three.js canvas
        └── pages/
            ├── Home.jsx       # 3D scene controls & WS actions
            ├── Dashboard.jsx  # SQLite CRUD test & live telemetry feed
            └── About.jsx      # Architecture details
```

---

## 🚀 Quick Start

### 1. Install Dependencies
Run the installation command from the root directory:

```bash
npm run install:all
```
*(or run `npm install` in root, `/server`, and `/client`)*

### 2. Start Development Environment
Run both server and client concurrently with one command:

```bash
npm run dev
```

- **Client App**: [http://localhost:3000](http://localhost:3000)
- **Express Server**: [http://localhost:5000](http://localhost:5000)
- **WebSocket Gateway**: `ws://localhost:5000`

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both server and client concurrently in development mode |
| `npm run dev:server` | Starts the Express server with Node's native file watch mode |
| `npm run dev:client` | Starts Vite development server for the React app |
| `npm run build` | Builds the client application for production |
| `npm run start` | Concurrently runs the Express server and Vite preview server |

---

## 📦 Tech Stack & Dependencies

### Server (`/server`)
- **Express**: Fast, un-opinionated web framework
- **sqlite3**: SQLite3 database driver
- **ws**: WebSocket server implementation
- **cors**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable configuration

### Client (`/client`)
- **Vite & React**: Modern, lightning-fast frontend tooling
- **Three.js**: Interactive 3D graphics rendering
- **Zustand**: Fast, lightweight state management
- **React Router DOM**: Declarative client-side routing

### Root Tooling
- **Concurrently**: Multi-process task runner for concurrent execution
