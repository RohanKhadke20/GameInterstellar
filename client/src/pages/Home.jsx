import React from 'react';
import ThreeCanvas from '../components/ThreeCanvas';
import { useStore } from '../store/useStore';

export default function Home() {
  const {
    currentUserId,
    currentUser,
    inventory,
    fleets,
    totalOreMinedRate,
    rotationSpeed,
    setRotationSpeed,
    particleCount,
    setParticleCount,
    meshColor,
    setMeshColor,
    laserActive,
    setLaserActive,
    offlineNotification,
    dismissOfflineNotification,
    sendMessage
  } = useStore();

  const ferriteOre = inventory.find((i) => i.resource_id === 'ore_ferrite');
  const activeFleetsCount = fleets.filter((f) => f.status === 'mining').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Offline Catch-up Alert Banner */}
      {offlineNotification && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.25))',
            border: '1px solid var(--accent-magenta)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.4s ease'
          }}
        >
          <div>
            <h4 style={{ color: 'var(--accent-magenta)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
              🛸 Offline Progression Computed!
            </h4>
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
              While you were away for <strong>{offlineNotification.elapsedSeconds}s</strong>, your active mining
              fleets extracted <strong>+{offlineNotification.minedQuantity.toFixed(2)} Ferrite Ore</strong> into your
              inventory stockpile.
            </p>
          </div>
          <button className="btn btn-primary" onClick={dismissOfflineNotification}>
            Claim & Dismiss
          </button>
        </div>
      )}

      {/* Main Stats Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Miner Identity
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
            Commander #{currentUserId}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Credits: {currentUser ? currentUser.credits.toLocaleString() : '---'} ₢
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Ferrite Ore Stockpile
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
            {ferriteOre ? ferriteOre.quantity.toFixed(1) : '0.0'} <span style={{ fontSize: '0.9rem' }}>units</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Live SQLite Synchronized
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Global Extraction Velocity
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-magenta)', marginTop: '0.25rem' }}>
            +{totalOreMinedRate.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>ore/s</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {activeFleetsCount} Mining Vessel{activeFleetsCount !== 1 ? 's' : ''} Active
          </div>
        </div>
      </div>

      {/* 3D Cosmic Viewport */}
      <ThreeCanvas />

      {/* Interactive Controls Grid */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-cyan)' }}>
            🎛️ Simulation & Visual Controls
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span>Asteroid Core Spin</span>
                <span style={{ color: 'var(--text-muted)' }}>{rotationSpeed.toFixed(3)} rad/f</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.03"
                step="0.001"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span>Cosmic Starfield Density</span>
                <span style={{ color: 'var(--text-muted)' }}>{particleCount} particles</span>
              </div>
              <input
                type="range"
                min="500"
                max="3500"
                step="250"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Extraction Mining Lasers</span>
              <button
                className="btn"
                onClick={() => setLaserActive(!laserActive)}
                style={{
                  background: laserActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: laserActive ? '#38bdf8' : 'var(--text-muted)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem'
                }}
              >
                {laserActive ? 'Active (ON)' : 'Disabled (OFF)'}
              </button>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Mineral Core Alloy Tone:
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['#38bdf8', '#818cf8', '#ec4899', '#34d399', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setMeshColor(color)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: meshColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-magenta)' }}>
            🛰️ Realtime Fleet Telemetry
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Authoritative tick events are streamed every 1000ms over WebSockets and written to SQLite in batch transactions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fleets.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No vessels deployed yet.</p>
            ) : (
              fleets.map((fleet) => (
                <div
                  key={fleet.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${fleet.status === 'mining' ? '#4ade80' : '#94a3b8'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Mining Cruiser #{fleet.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Sector ({fleet.coordinate_q ?? '?'}, {fleet.coordinate_r ?? '?'}) | Yield: x{fleet.resource_yield_multiplier ?? 1.0}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="badge"
                      style={{
                        background: fleet.status === 'mining' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: fleet.status === 'mining' ? '#4ade80' : '#94a3b8'
                      }}
                    >
                      {fleet.status.toUpperCase()}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {fleet.extraction_rate} ore/t
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
