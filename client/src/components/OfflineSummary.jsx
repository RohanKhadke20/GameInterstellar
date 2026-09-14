import React from 'react';
import { useStore } from '../store/useStore';

/**
 * OfflineSummary - Autonomous Mining Catch-Up Modal
 * 
 * Technical Directives:
 * 1. Screen-Centering Modal: Positioned with backdrop-blur-sm and bg-black/70 overlay.
 * 2. Trigger Condition: Renders only if offlineGains is defined and total / minedQuantity > 0.
 * 3. Resource Breakdown: Displays exact yields for Silicates, Transition Metals, and Rare Isotopes.
 * 4. Dismissal: Invokes clearOfflineGains() to unmount and transition player into the Command Hub.
 */
export function OfflineSummary() {
  const offlineGains = useStore((state) => state.offlineGains || state.offlineNotification);
  const clearOfflineGains = useStore(
    (state) => state.clearOfflineGains || state.dismissOfflineNotification
  );

  // Trigger Logic: Render only if valid offline gains were calculated
  if (!offlineGains || (offlineGains.total <= 0 && offlineGains.minedQuantity <= 0 && offlineGains.elapsedSeconds <= 0)) {
    return null;
  }

  const elapsedSeconds = offlineGains.elapsedSeconds || 0;
  const totalMined = offlineGains.total || offlineGains.minedQuantity || 0;

  // Breakdown of mined resources (proportional estimates or explicit values)
  const silicatesMined = offlineGains.silicates ?? +(totalMined * 0.50).toFixed(2);
  const metalsMined = offlineGains.metals ?? +(totalMined * 0.35).toFixed(2);
  const isotopesMined = offlineGains.isotopes ?? +(totalMined * 0.15).toFixed(2);

  // Time formatter
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-950/50 flex flex-col gap-6">
        {/* Glowing Top Border Accent */}
        <div className="absolute -top-[1px] inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* 1. Header & Welcome Greeting */}
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-2xl animate-pulse">
            🛰️
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Welcome back, Commander
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Autonomous mining drones remained operational during your absence ({formatTime(elapsedSeconds)}).
            </p>
          </div>
        </div>

        {/* 2. Total Accumulated Yield Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-zinc-800">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Total Offline Yield
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">
              +{parseFloat(totalMined.toFixed(2)).toLocaleString()} T
            </span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Duration Logged
            </span>
            <span className="text-sm font-mono font-semibold text-cyan-300 mt-0.5">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* 3. Detailed Resource Breakdown Grid */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Harvested Stockpile Breakdown:
          </span>

          <div className="grid grid-cols-3 gap-3">
            {/* Silicates Card */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-cyan-500/30 flex flex-col">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                <span>🪨</span>
                <span>Silicates</span>
              </div>
              <span className="text-base font-mono font-bold text-slate-100 mt-2">
                +{silicatesMined.toLocaleString()} T
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">50% Stockpile</span>
            </div>

            {/* Transition Metals Card */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 flex flex-col">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                <span>⚙️</span>
                <span>Metals</span>
              </div>
              <span className="text-base font-mono font-bold text-slate-100 mt-2">
                +{metalsMined.toLocaleString()} T
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">35% Stockpile</span>
            </div>

            {/* Rare Isotopes Card */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-500/30 flex flex-col">
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
                <span>⚡</span>
                <span>Isotopes</span>
              </div>
              <span className="text-base font-mono font-bold text-slate-100 mt-2">
                +{isotopesMined.toLocaleString()} T
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">15% Stockpile</span>
            </div>
          </div>
        </div>

        {/* 4. Operational Status Tag */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/40 border border-zinc-800/80 text-[11px] font-mono text-zinc-400">
          <span>ALGORITHM: O(1) TIME-DELTA CATCH-UP</span>
          <span className="text-emerald-400 font-semibold">✓ SYNC AUTHORITATIVE</span>
        </div>

        {/* 5. Acknowledge Action Button */}
        <button
          type="button"
          onClick={() => clearOfflineGains && clearOfflineGains()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98]"
        >
          ACKNOWLEDGE & ENTER COMMAND HUB
        </button>
      </div>
    </div>
  );
}

export default OfflineSummary;
