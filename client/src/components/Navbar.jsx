import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function Navbar() {
  const wsConnected = useStore((state) => state.wsConnected);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span>✨ ASTROLITH</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Home (3D Scene)
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard & API
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Stack & Specs
        </NavLink>
      </div>
      <div>
        <span className={`badge ${wsConnected ? 'badge-success' : ''}`} style={{
          background: wsConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: wsConnected ? '#4ade80' : '#f87171',
          border: wsConnected ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
        }}>
          {wsConnected ? '● WS Connected' : '○ WS Disconnected'}
        </span>
      </div>
    </nav>
  );
}
