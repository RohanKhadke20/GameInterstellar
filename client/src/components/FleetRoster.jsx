import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import VesselCard from './VesselCard';

export default function FleetRoster() {
  const fleets = useStore((state) => state.fleets);

  const stats = useMemo(() => {
    const list = Array.isArray(fleets) ? fleets : [];
    const miningCount = list.filter((f) => (f.status || '').toLowerCase() === 'mining').length;
    const transitCount = list.filter((f) => (f.status || '').toLowerCase() === 'transit').length;
    const idleCount = list.filter((f) => (f.status || '').toLowerCase() === 'idle').length;
    const totalRate = list
      .filter((f) => (f.status || '').toLowerCase() === 'mining')
      .reduce((sum, f) => sum + (Number(f.extraction_rate) || 0) * (Number(f.resource_yield_multiplier) || 1.0), 0);

    return {
      total: list.length,
      miningCount,
      transitCount,
      idleCount,
      totalRate: totalRate.toFixed(2),
    };
  }, [fleets]);

  const hasFleets = Array.isArray(fleets) && fleets.length > 0;

  return (
    <section className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-sm">
            🛸
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-100 tracking-wide flex items-center gap-2">
              Orbital Fleet Deployment Roster
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-zinc-700">
                {stats.total} REGISTERED
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Vessel operational status, sector telemetry, and autonomous extraction rates
            </p>
          </div>
        </div>

        {hasFleets && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              ● {stats.miningCount} Mining
            </span>
            <span className="px-2 py-1 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
              ● {stats.transitCount} Transit
            </span>
            <span className="px-2 py-1 rounded bg-slate-800 text-zinc-400 border border-zinc-700">
              ○ {stats.idleCount} Idle
            </span>
            <span className="pl-2 text-cyan-400 font-bold border-l border-zinc-800">
              +{stats.totalRate} u/s
            </span>
          </div>
        )}
      </div>

      {!hasFleets ? (
        <div className="relative rounded-2xl border border-dashed border-zinc-700/80 bg-slate-900/40 p-12 text-center backdrop-blur overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          <div className="relative z-10 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-zinc-700 flex items-center justify-center text-xl text-zinc-500">
              📡
            </div>
            <h3 className="text-sm font-semibold text-slate-200 font-mono tracking-wider uppercase">
              No Active Vessels Detected
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No mining rigs or exploration drones are currently registered to your operator ID.
              Deploy a new vessel via the command console to initiate extraction operations.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {fleets.map((vessel, index) => (
            <VesselCard key={vessel.id || index} vessel={vessel} />
          ))}
        </div>
      )}
    </section>
  );
}
