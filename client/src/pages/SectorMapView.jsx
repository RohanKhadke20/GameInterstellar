import React from 'react';
import MapGrid from '../components/MapGrid';

export default function SectorMapView() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              🗺️
            </span>
            Sector Navigation Map
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Axial survey coordinates [q, r] &bull; Environmental hazard indexing & fleet presence telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-zinc-800 text-xs font-mono">
          <span className="text-zinc-400 pr-1">Risk Rating:</span>
          <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-cyan-400">
            H1 Safe
          </span>
          <span className="px-2 py-0.5 rounded border border-teal-500/30 bg-teal-500/10 text-teal-400">
            H2 Low
          </span>
          <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            H3 Med
          </span>
          <span className="px-2 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">
            H4 High
          </span>
          <span className="px-2 py-0.5 rounded border border-rose-500/50 bg-rose-500/20 text-rose-400">
            H5 Critical
          </span>

          <div className="pl-3 border-l border-zinc-800 flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span>Stationed Fleet</span>
          </div>
        </div>
      </header>

      <section className="relative rounded-2xl border border-zinc-800 bg-slate-900/60 p-4 sm:p-8 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col items-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3341550c_1px,transparent_1px),linear-gradient(to_bottom,#3341550c_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative z-10 w-full">
          <MapGrid />
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800/80 w-full flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>SPATIAL ALGORITHM: AXIAL HEX/2D INTERSECTION</span>
          <span>SUB-SYSTEM: NAV-GATEWAY ONLINE</span>
        </div>
      </section>
    </div>
  );
}
