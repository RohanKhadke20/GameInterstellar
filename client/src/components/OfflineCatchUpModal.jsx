import React from 'react';
import { useStore } from '../store/useStore';

export function OfflineCatchUpModal() {
  const offlineNotification = useStore((state) => state.offlineNotification);
  const dismissOfflineNotification = useStore((state) => state.dismissOfflineNotification);
  const fleets = useStore((state) => state.fleets) || [];

  if (!offlineNotification || (!offlineNotification.elapsedSeconds && !offlineNotification.minedQuantity)) {
    return null;
  }

  const { elapsedSeconds = 0, minedQuantity = 0 } = offlineNotification;

  // Format elapsed time duration
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ${secs}s`;
  };

  const activeMinersCount = fleets.filter((f) => (f.status || '').toLowerCase() === 'mining').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-950/50 flex flex-col gap-5">
        {/* Glow Accent Line at Top */}
        <div className="absolute -top-[1px] inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-2xl animate-pulse">
            🛰️
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Autonomous Catch-Up Telemetry
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sub-space telemetry logged during your terminal disconnection
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Duration Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-zinc-800 flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Offline Duration
            </span>
            <span className="text-xl font-mono font-bold text-cyan-300 mt-1">
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
              {elapsedSeconds.toLocaleString()} delta seconds
            </span>
          </div>

          {/* Mined Ore Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-zinc-800 flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Accumulated Ore
            </span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-1">
              +{parseFloat(minedQuantity.toFixed(2)).toLocaleString()} T
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Deposited to Ferrite Silo
            </span>
          </div>
        </div>

        {/* Operational Telemetry Summary */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-zinc-800/80 text-xs font-mono text-zinc-300 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Active Mining Vessels:</span>
            <span className="text-slate-200">{activeMinersCount} Units</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Database Transaction:</span>
            <span className="text-emerald-400">ATOMIC WAL COMMIT (O(1))</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Containment Silo Integrity:</span>
            <span className="text-cyan-400">OPTIMAL (100%)</span>
          </div>
        </div>

        {/* Modal Action Button */}
        <button
          type="button"
          onClick={dismissOfflineNotification}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98]"
        >
          CLAIM & SYNC TO SILO
        </button>
      </div>
    </div>
  );
}

export default OfflineCatchUpModal;
