import React, { useState, useEffect } from 'react';

const HAZARD_THEMES = {
  1: {
    name: 'Minimal',
    bg: 'bg-slate-900/90',
    border: 'border-slate-700/70 hover:border-cyan-400',
    badge: 'bg-slate-800 text-cyan-400 border-slate-700',
    glow: 'group-hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]',
    text: 'text-cyan-400',
  },
  2: {
    name: 'Low',
    bg: 'bg-teal-950/40',
    border: 'border-teal-800/60 hover:border-teal-400',
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    glow: 'group-hover:shadow-[0_0_15px_rgba(45,212,191,0.25)]',
    text: 'text-teal-400',
  },
  3: {
    name: 'Moderate',
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/60 hover:border-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    glow: 'group-hover:shadow-[0_0_15px_rgba(251,191,36,0.25)]',
    text: 'text-amber-400',
  },
  4: {
    name: 'High',
    bg: 'bg-orange-950/50',
    border: 'border-orange-700/70 hover:border-orange-400',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    glow: 'group-hover:shadow-[0_0_18px_rgba(249,115,22,0.3)]',
    text: 'text-orange-400',
  },
  5: {
    name: 'Extreme',
    bg: 'bg-rose-950/60',
    border: 'border-rose-600 hover:border-rose-400',
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
    glow: 'group-hover:shadow-[0_0_22px_rgba(244,63,94,0.45)]',
    text: 'text-rose-400',
  },
};

const normalizeHazard = (lvl) => {
  if (lvl > 0 && lvl <= 1) return Math.min(5, Math.max(1, Math.ceil(lvl * 5)));
  return Math.min(5, Math.max(1, Math.round(lvl || 1)));
};

// Axial Hexagonal Distance Math
export const getHexDistance = (q1, r1, q2 = 0, r2 = 0) => {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
};

export const SectorNode = React.memo(function SectorNode({
  sectorId,
  coordinate_q,
  coordinate_r,
  name = 'Sector',
  hazard_level = 1,
  resource_yield_multiplier = 1.0,
  is_temporary = 0,
  expires_at = null,
  hasFleet = false,
  activeHazard = null,
  activeIncursion = null,
  style = {},
}) {
  const hazardKey = normalizeHazard(hazard_level);
  const theme = HAZARD_THEMES[hazardKey];
  const yieldFormatted = Number(resource_yield_multiplier || 1.0).toFixed(2);
  const hexDistance = getHexDistance(coordinate_q, coordinate_r, 0, 0);

  // Live countdown timer for temporary probe sectors
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!expires_at) return null;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expires_at - now);
  });

  useEffect(() => {
    if (!expires_at) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, expires_at - now);
      setSecondsRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expires_at]);

  const hazardIcon = activeHazard?.type === 'SOLAR_FLARE'
    ? '☀️'
    : activeHazard?.type === 'MICROMETEOROID_SHOWER'
    ? '☄️'
    : activeHazard?.type === 'GRAVITATIONAL_ANOMALY'
    ? '🌌'
    : null;

  return (
    <div
      style={style}
      className={`group relative w-[72px] h-[80px] select-none cursor-pointer flex flex-col items-center justify-between p-1.5 transition-all duration-200 transform-gpu hover:z-30 hover:scale-105 ${
        is_temporary
          ? 'bg-purple-950/80 border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] animate-pulse'
          : activeIncursion
          ? 'bg-rose-950/80 border-2 border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse'
          : activeHazard
          ? 'bg-amber-950/50 border border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
          : `${theme.bg} ${theme.border} ${theme.glow} border`
      } rounded-xl backdrop-blur-sm`}
    >
      {/* Top Header: Coordinates or TTL Countdown */}
      <div className="w-full flex items-center justify-between px-0.5 pt-0.5">
        <span className="text-[8px] font-mono text-zinc-400 leading-none">
          {coordinate_q},{coordinate_r}
        </span>

        {is_temporary && secondsRemaining !== null ? (
          <span
            className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold leading-none ${
              secondsRemaining < 20
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500 animate-bounce'
                : 'bg-amber-500/30 text-amber-300 border border-amber-500'
            }`}
          >
            ⏳{secondsRemaining}s
          </span>
        ) : activeIncursion ? (
          <span
            className="text-[9px] font-mono px-1 rounded bg-rose-500/30 text-rose-300 border border-rose-500/60 font-bold leading-none animate-bounce"
            title={`COMBAT: ${activeIncursion.factionName}`}
          >
            ⚔️
          </span>
        ) : hazardIcon ? (
          <span className="text-[10px] leading-none" title={activeHazard.name}>
            {hazardIcon}
          </span>
        ) : (
          <span className={`text-[7px] font-mono px-0.5 rounded border leading-none font-bold ${theme.badge}`}>
            H{hazardKey}
          </span>
        )}
      </div>

      {/* Center Fleet Indicator / Anomalous Core */}
      <div className="flex items-center justify-center my-auto">
        {hasFleet ? (
          <div className="relative flex items-center justify-center">
            <span
              className={`animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-75 ${
                activeIncursion || (is_temporary && secondsRemaining < 25)
                  ? 'bg-rose-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 border border-white ${
                activeIncursion || (is_temporary && secondsRemaining < 25)
                  ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                  : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
              }`}
            />
          </div>
        ) : is_temporary ? (
          <span className="text-xs animate-spin">🌀</span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700/60 group-hover:bg-cyan-400 transition-colors" />
        )}
      </div>

      {/* Bottom Yield Multiplier */}
      <div className="text-[9px] font-mono text-zinc-300 text-center leading-none group-hover:text-cyan-300">
        {yieldFormatted}x
      </div>

      {/* Inspection Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-lg bg-slate-950/95 border border-zinc-700 shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 z-50">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-xs font-semibold text-slate-100">
          <span>{name}</span>
          <span className={`text-[10px] font-mono ${theme.text}`}>{theme.name}</span>
        </div>

        {/* Temporary Collapse Warning */}
        {is_temporary && (
          <div className="my-1.5 p-1.5 rounded bg-purple-950/50 border border-amber-500/60 text-[10px] font-mono text-amber-300">
            <span className="font-bold block">⏳ ANOMALOUS COLLAPSE IN:</span>
            <span className="text-amber-200 font-bold text-xs">{secondsRemaining}s remaining</span>
            {hasFleet && (
              <span className="block text-rose-400 font-bold mt-1 animate-pulse">
                ⚠️ EVACUATE FLEET BEFORE TTL OR SUFFER TOTAL HULL LOSS!
              </span>
            )}
          </div>
        )}

        {/* Incursion Warning */}
        {activeIncursion && (
          <div className="my-1.5 p-1.5 rounded bg-rose-950/50 border border-rose-500/60 text-[10px] font-mono text-rose-300">
            <span className="font-bold block">⚔️ HOSTILE INCURSION:</span>
            <span>{activeIncursion.factionName}</span>
            <span className="block text-rose-400 font-semibold mt-0.5">
              -40% Yield Penalty &bull; {activeIncursion.attackDps} DPS
            </span>
          </div>
        )}

        <div className="mt-1.5 space-y-1 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-400">Yield Multiplier:</span>
            <span className="text-cyan-400 font-bold">x{yieldFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Hex Distance:</span>
            <span className="text-zinc-300">{hexDistance} Ly</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Coordinates:</span>
            <span className="text-zinc-300">({coordinate_q}, {coordinate_r})</span>
          </div>
          {hasFleet && (
            <div className="mt-1 pt-1 border-t border-zinc-800 flex items-center justify-between text-cyan-400 font-semibold">
              <span>Stationed Fleet:</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SectorNode;
