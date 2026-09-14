import React from 'react';

export default function About() {
  const stackItems = [
    { name: 'Node.js & Express', desc: 'Backend HTTP & WebSocket REST API service.' },
    { name: 'SQLite3', desc: 'Lightweight, embedded relational database for local persistence.' },
    { name: 'ws', desc: 'Realtime bi-directional WebSocket communication engine.' },
    { name: 'React (Vite)', desc: 'Fast, modern single-page application framework.' },
    { name: 'Three.js', desc: 'WebGL 3D graphics rendering engine.' },
    { name: 'Zustand', desc: 'Fast, lightweight and un-opinionated state management.' },
    { name: 'React Router', desc: 'Client-side declarative routing.' },
    { name: 'Concurrently', desc: 'Simultaneous multi-process development orchestration.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Astrolith Architecture</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Modular monorepo structure designed for high-performance interactive web applications.
        </p>
      </header>

      <div className="grid-2">
        {stackItems.map((item, idx) => (
          <div key={idx} className="card">
            <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>{item.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
