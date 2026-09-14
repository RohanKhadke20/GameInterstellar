import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const {
    currentUserId,
    currentUser,
    inventory,
    fleets,
    sectors,
    fetchSectors,
    authenticate,
    messages
  } = useStore();

  const [inputUserId, setInputUserId] = useState(currentUserId || 1);
  
  // New Sector form state
  const [newSectorQ, setNewSectorQ] = useState(3);
  const [newSectorR, setNewSectorR] = useState(-2);
  const [newSectorMultiplier, setNewSectorMultiplier] = useState(1.8);
  const [newSectorHazard, setNewSectorHazard] = useState(0.15);

  // New Fleet vessel form state
  const [deploySectorId, setDeploySectorId] = useState(1);
  const [deployRate, setDeployRate] = useState(3.0);

  // Trade state
  const [sellAmount, setSellAmount] = useState(25);
  const [tradeMessage, setTradeMessage] = useState('');

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  const handleSwitchUser = (e) => {
    e.preventDefault();
    const id = parseInt(inputUserId, 10);
    if (id > 0) {
      authenticate(id);
    }
  };

  const handleCreateSector = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/game/sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinate_q: parseInt(newSectorQ, 10),
          coordinate_r: parseInt(newSectorR, 10),
          resource_yield_multiplier: parseFloat(newSectorMultiplier),
          hazard_level: parseFloat(newSectorHazard)
        })
      });
      if (res.ok) {
        fetchSectors();
      }
    } catch (err) {
      console.error('Error creating sector:', err);
    }
  };

  const handleDeployFleet = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/game/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          sector_id: parseInt(deploySectorId, 10) || 1,
          extraction_rate: parseFloat(deployRate),
          status: 'mining'
        })
      });
    } catch (err) {
      console.error('Failed to deploy fleet vessel:', err);
    }
  };

  const handleUpdateFleetStatus = async (fleetId, newStatus) => {
    try {
      await fetch(`/api/game/fleet/${fleetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update fleet status:', err);
    }
  };

  const handleSellOre = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/game/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          resource_id: 'ore_ferrite',
          amount: parseFloat(sellAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTradeMessage(`Sold ${data.soldAmount} ore for +${data.creditsEarned} Credits!`);
        setTimeout(() => setTradeMessage(''), 4000);
      } else {
        setTradeMessage(data.error || 'Transaction failed');
        setTimeout(() => setTradeMessage(''), 4000);
      }
    } catch (err) {
      console.error('Trade error:', err);
    }
  };

  const ferriteOre = inventory.find((i) => i.resource_id === 'ore_ferrite');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 800 }}>
          Astrolith Command Center
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage SQLite-backed player identity, deploy orbital fleet vessels, trade resources, and chart deep space sectors.
        </p>
      </header>

      {/* Commander Identity & Account Switcher */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 27, 75, 0.9))'
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Current Operator
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            Commander #{currentUserId} — {currentUser?.credits?.toLocaleString() ?? 0} Credits ₢
          </div>
        </div>

        <form onSubmit={handleSwitchUser} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Simulate User ID:</span>
          <input
            type="number"
            min="1"
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              width: '80px',
              fontFamily: 'inherit'
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Switch & Sync
          </button>
        </form>
      </div>

      <div className="grid-2">
        {/* Fleet Command Center */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
            🚀 Orbital Fleet Command
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '280px', overflowY: 'auto' }}>
            {fleets.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No vessels deployed yet.</p>
            ) : (
              fleets.map((fleet) => (
                <div
                  key={fleet.id}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Vessel #{fleet.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Base Rate: {fleet.extraction_rate} ore/s | Sector #{fleet.sector_id || 1}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn"
                      onClick={() => handleUpdateFleetStatus(fleet.id, fleet.status === 'mining' ? 'idle' : 'mining')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        background: fleet.status === 'mining' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: fleet.status === 'mining' ? '#4ade80' : '#94a3b8',
                        border: '1px solid currentColor'
                      }}
                    >
                      {fleet.status === 'mining' ? 'Set Idle' : 'Set Mining'}
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleUpdateFleetStatus(fleet.id, 'transit')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        background: fleet.status === 'transit' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: fleet.status === 'transit' ? '#facc15' : 'var(--text-muted)',
                        border: '1px solid currentColor'
                      }}
                    >
                      Transit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleDeployFleet} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={deploySectorId}
              onChange={(e) => setDeploySectorId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: '1px solid var(--border-color)'
              }}
            >
              {sectors.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#111827' }}>
                  Sector #{s.id} (x{s.resource_yield_multiplier} Yield)
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0.5"
              max="20"
              step="0.5"
              value={deployRate}
              onChange={(e) => setDeployRate(e.target.value)}
              placeholder="Rate"
              style={{
                width: '70px',
                padding: '0.5rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: '1px solid var(--border-color)'
              }}
            />

            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              + Deploy Vessel
            </button>
          </form>
        </div>

        {/* Space Minerals Stockpile & Market */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-magenta)' }}>
            💎 Mineral Commodity Market
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Ferrite Ore Stockpile
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>
              {ferriteOre ? ferriteOre.quantity.toFixed(2) : '0.00'} <span style={{ fontSize: '1rem' }}>units</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Current Market Price: 15 Credits ₢ per unit
            </div>
          </div>

          <form onSubmit={handleSellOre} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              min="1"
              max={ferriteOre?.quantity || 1000}
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white'
              }}
            />
            <button
              type="submit"
              className="btn"
              disabled={!ferriteOre || ferriteOre.quantity < parseFloat(sellAmount)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                padding: '0.65rem 1.25rem'
              }}
            >
              Sell for {(parseFloat(sellAmount || 0) * 15).toLocaleString()} ₢
            </button>
          </form>

          {tradeMessage && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 500 }}>
              {tradeMessage}
            </div>
          )}
        </div>
      </div>

      {/* Charted Sectors & Exploration */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
          🌌 Charted Deep-Space Sectors (Hex Axial Coordinates)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {sectors.map((sec) => (
            <div
              key={sec.id}
              style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700 }}>Sector #{sec.id}</span>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                  x{sec.resource_yield_multiplier.toFixed(1)} Yield
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Coordinates: (Q: {sec.coordinate_q}, R: {sec.coordinate_r})
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Hazard Index: {(sec.hazard_level * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateSector} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chart New Sector:</span>
          <input
            type="number"
            placeholder="Q"
            value={newSectorQ}
            onChange={(e) => setNewSectorQ(e.target.value)}
            style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border-color)' }}
          />
          <input
            type="number"
            placeholder="R"
            value={newSectorR}
            onChange={(e) => setNewSectorR(e.target.value)}
            style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border-color)' }}
          />
          <input
            type="number"
            step="0.1"
            placeholder="Multiplier"
            value={newSectorMultiplier}
            onChange={(e) => setNewSectorMultiplier(e.target.value)}
            style={{ width: '90px', padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border-color)' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
            + Chart Sector
          </button>
        </form>
      </div>

      {/* Authoritative WebSocket Telemetry Stream */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-magenta)' }}>
          📡 5000ms Authoritative Telemetry Stream & System Logs
        </h2>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.65)',
            borderRadius: '8px',
            padding: '1rem',
            height: '200px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          {messages.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Listening for live WebSocket events...</span>
          ) : (
            messages.map((msg, index) => (
              <div key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>[{msg.receivedAt || 'Sync'}]</span>{' '}
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>{msg.type}</span>:{' '}
                <span style={{ color: '#fef08a' }}>{JSON.stringify(msg.payload || msg)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
