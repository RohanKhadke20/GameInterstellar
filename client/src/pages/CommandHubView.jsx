import React from 'react';
import ResourceDashboard from '../components/ResourceDashboard';
import RefineryModule from '../components/RefineryModule';
import FleetRoster from '../components/FleetRoster';
import VesselOutfitting from '../components/fleet/VesselOutfitting';
import AllianceHub from '../components/alliance/AllianceHub';
import TechTree from '../components/TechTree';

export default function CommandHubView() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              ⚡
            </span>
            Command Hub Console
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative operations terminal for Astrolith deep-space mining systems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-zinc-800 font-mono text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>CORE TICK: 1000ms</span>
          </div>
        </div>
      </header>

      <ResourceDashboard />

      <RefineryModule />

      <FleetRoster />

      <VesselOutfitting />

      <AllianceHub />

      <TechTree />
    </div>
  );
}
