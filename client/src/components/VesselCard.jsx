import React from 'react';

const STATUS_THEMES = {
  mining: {
    label: 'Mining',
    borderAccent: 'border-l-emerald-500',
    cardBorder: 'border-zinc-700/80 hover:border-emerald-500/40',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    pingColor: 'bg-emerald-400',
    rateAccent: 'text-emerald-400 font-bold',
    glowHover: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    icon: '⛏️',
  },
  transit: {
    label: 'In Transit',
    borderAccent: 'border-l-amber-500',
    cardBorder: 'border-zinc-700/80 hover:border-amber-500/40',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    pingColor: 'bg-amber-400',
    rateAccent: 'text-amber-300/80',
    glowHover: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]',
    icon: '🚀',
  },
  idle: {
    label: 'Idle / Standby',
    borderAccent: 'border-l-slate-600',
    cardBorder: 'border-zinc-800 hover:border-zinc-700',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    pingColor: 'bg-slate-500',
    rateAccent: 'text-zinc-500',
    glowHover: 'group-hover:shadow-none',
    icon: '⏸️',
  },
};

export const VesselCard = React.memo(function VesselCard({ vessel }) {
  const {
    id = 'N/A',
    name,
    status = 'idle',
    extraction_rate = 0,
    sector_id,
    coordinate_q,
    coordinate_r,
    hull_class = 'Class-II Mining Rig',
  } = vessel || {};

  const normalizedStatus = (status || 'idle').toLowerCase();
  const theme = STATUS_THEMES[normalizedStatus] || STATUS_THEMES.idle;
  const displayName = name || `Vessel #${id}`;
  const formattedRate = Number(extraction_rate || 0).toFixed(2);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-slate-900 border ${theme.cardBorder} border-l-4 ${theme.borderAccent} p-5 shadow-lg backdrop-blur-md transition-all duration-300 ${theme.glowHover}`}
    >
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
        <div className="absolute top-0 right-0 border-t-2 border-r-2 border-zinc-700 w-2.5 h-2.5 group-hover:border-cyan-400 transition-colors" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{theme.icon}</span>
            <h3 className="text-base font-semibold tracking-wide text-slate-100 group-hover:text-cyan-300 transition-colors">
              {displayName}
            </h3>
          </div>
          <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            {hull_class} &bull; ID: [VSL-{id}]
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${theme.badgeClass}`}
        >
          <span className="relative flex h-2 w-2">
            {normalizedStatus === 'mining' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pingColor}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.pingColor}`} />
          </span>
          <span>{theme.label}</span>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-xs font-mono">
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase">Assigned Sector</span>
          <span className="text-zinc-300">
            {sector_id ? `Sector #${sector_id}` : 'Unassigned'}
            {coordinate_q !== undefined && coordinate_r !== undefined && (
              <span className="text-zinc-500 ml-1">({coordinate_q},{coordinate_r})</span>
            )}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[10px] uppercase">Hardpoints</span>
          <span className="text-cyan-400">
            {Array.isArray(vessel?.modules) ? vessel.modules.length : 0}/4 Slots
          </span>
        </div>

        <div className="text-right">
          <span className="text-zinc-500 block text-[10px] uppercase">Extraction</span>
          <span className={`text-sm ${theme.rateAccent}`}>
            {formattedRate} <span className="text-[10px] font-normal text-zinc-400">T/s</span>
          </span>
        </div>
      </div>

      <div className="mt-3.5 w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            normalizedStatus === 'mining'
              ? 'w-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
              : normalizedStatus === 'transit'
              ? 'w-2/3 bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              : 'w-0 bg-slate-700'
          }`}
        />
      </div>
    </div>
  );
});

export default VesselCard;
