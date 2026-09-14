import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import SectorNode from './SectorNode';
import { audioEngine } from '../utils/audioEngine';

export function MapGrid() {
  const sectors = useStore((state) => state.sectors);
  const fleets = useStore((state) => state.fleets);
  const hazards = useStore((state) => state.hazards) || [];
  const incursions = useStore((state) => state.incursions) || [];
  const currentUser = useStore((state) => state.currentUser);
  const deployProbe = useStore((state) => state.deployProbe);

  const [isDeploying, setIsDeploying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const incursionMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(incursions)) {
      incursions.forEach((inc) => {
        if (inc && inc.sectorId !== undefined) {
          map.set(inc.sectorId, inc);
        }
      });
    }
    return map;
  }, [incursions]);

  const hazardMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(hazards)) {
      hazards.forEach((h) => {
        if (h && h.sectorId !== undefined) {
          map.set(h.sectorId, h);
        }
      });
    }
    return map;
  }, [hazards]);

  const fleetCoordinateSet = useMemo(() => {
    const set = new Set();
    if (Array.isArray(fleets)) {
      for (const vessel of fleets) {
        if (vessel.coordinate_q !== undefined && vessel.coordinate_r !== undefined) {
          set.add(`${vessel.coordinate_q}:${vessel.coordinate_r}`);
        } else if (vessel.sector_id !== undefined) {
          set.add(`id:${vessel.sector_id}`);
        }
      }
    }
    return set;
  }, [fleets]);

  const effectiveSectors = useMemo(() => {
    if (Array.isArray(sectors) && sectors.length > 0) {
      return sectors;
    }
    const procedural = [];
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        procedural.push({
          id: (q + 3) * 10 + (r + 3),
          name: `Sector [${q},${r}]`,
          coordinate_q: q,
          coordinate_r: r,
          hazard_level: ((Math.abs(q) + Math.abs(r)) % 5) + 1,
          resource_yield_multiplier: 1.0 + ((Math.abs(q) * 3 + Math.abs(r) * 7) % 25) / 10,
          is_temporary: 0,
        });
      }
    }
    return procedural;
  }, [sectors]);

  // Bounding box for staggered hex calculations
  const { minQ, maxQ, minR, maxR } = useMemo(() => {
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;

    for (const s of effectiveSectors) {
      if (s.coordinate_q < minQ) minQ = s.coordinate_q;
      if (s.coordinate_q > maxQ) maxQ = s.coordinate_q;
      if (s.coordinate_r < minR) minR = s.coordinate_r;
      if (s.coordinate_r > maxR) maxR = s.coordinate_r;
    }

    return {
      minQ: minQ === Infinity ? -2 : minQ,
      maxQ: maxQ === -Infinity ? 2 : maxQ,
      minR: minR === Infinity ? -2 : minR,
      maxR: maxR === -Infinity ? 2 : maxR,
    };
  }, [effectiveSectors]);

  const HEX_WIDTH = 76;
  const HEX_HEIGHT = 86;
  const colCount = Math.max(1, maxQ - minQ + 1);
  const rowCount = Math.max(1, maxR - minR + 1);

  const containerWidth = colCount * HEX_WIDTH + 80;
  const containerHeight = rowCount * HEX_HEIGHT + 100;

  const temporaryCount = effectiveSectors.filter((s) => s.is_temporary).length;

  const handleDeployProbe = async () => {
    audioEngine.playButtonClick();
    setIsDeploying(true);
    const res = await deployProbe();
    setIsDeploying(false);

    if (res.success) {
      audioEngine.playLaserFire();
      setFeedback({
        type: 'success',
        message: `Probe launched! Discovered high-yield anomalous sector ${res.data.sector.name} (${res.data.ttl}s TTL)!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to deploy exploration probe.',
      });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="flex flex-col gap-4 w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 p-5 shadow-2xl backdrop-blur-md">
      {/* Exploration Header & Probe Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-lg">
              🪐
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Isometric Hexagonal Navigation Grid
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Axial coordinates & multi-directional distance calculations across deep-space mining sectors
          </p>
        </div>

        <div className="flex items-center gap-3">
          {temporaryCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 border border-amber-400 text-amber-300 text-xs font-mono animate-pulse">
              <span>🌀</span>
              <span>{temporaryCount} ANOMALOUS SECTOR(S)</span>
            </div>
          )}

          <button
            type="button"
            disabled={isDeploying || (currentUser && currentUser.credits < 250)}
            onClick={handleDeployProbe}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📡</span>
            <span>{isDeploying ? 'SCANNING SECTOR...' : 'LAUNCH RECON PROBE (₵250)'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Staggered Hexagonal Canvas Viewport */}
      <div className="w-full overflow-x-auto overflow-y-auto p-4 flex justify-center bg-slate-950/70 rounded-xl border border-zinc-800/80 min-h-[380px]">
        <div
          className="relative select-none"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
          }}
        >
          {effectiveSectors.map((sector) => {
            const keyByCoord = `${sector.coordinate_q}:${sector.coordinate_r}`;
            const keyById = `id:${sector.id}`;
            const hasFleet = fleetCoordinateSet.has(keyByCoord) || fleetCoordinateSet.has(keyById);

            // Staggered Isometric Hex Positioning Math
            const colIndex = sector.coordinate_q - minQ;
            const rowIndex = sector.coordinate_r - minR;

            const posX = colIndex * HEX_WIDTH + 20;
            const posY = rowIndex * HEX_HEIGHT + (colIndex % 2 !== 0 ? HEX_HEIGHT * 0.5 : 0) + 20;

            return (
              <SectorNode
                key={sector.id || keyByCoord}
                sectorId={sector.id}
                coordinate_q={sector.coordinate_q}
                coordinate_r={sector.coordinate_r}
                name={sector.name || `Sector [${sector.coordinate_q},${sector.coordinate_r}]`}
                hazard_level={sector.hazard_level}
                resource_yield_multiplier={sector.resource_yield_multiplier}
                is_temporary={sector.is_temporary}
                expires_at={sector.expires_at}
                hasFleet={hasFleet}
                activeHazard={hazardMap.get(sector.id)}
                activeIncursion={incursionMap.get(sector.id)}
                style={{
                  position: 'absolute',
                  left: `${posX}px`,
                  top: `${posY}px`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MapGrid;
