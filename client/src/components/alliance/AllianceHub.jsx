import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { audioEngine } from '../../utils/audioEngine';

export function AllianceHub() {
  const allianceData = useStore((state) => state.allianceData);
  const fetchAllianceData = useStore((state) => state.fetchAllianceData);
  const inventory = useStore((state) => state.inventory) || [];
  const contributeToMegastructure = useStore((state) => state.contributeToMegastructure);

  const [selectedMaterial, setSelectedMaterial] = useState('res_alloy_plating');
  const [amount, setAmount] = useState(25);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllianceData();
  }, [fetchAllianceData]);

  const alliance = allianceData?.alliance || {
    name: 'Vanguard Industrial Coalition',
    tag: 'VIC',
    level: 1,
    description: 'Deep-space coalition pioneering galactic hyperlane conduits.',
  };

  const project = allianceData?.project || {
    id: 1,
    name: 'Stellar Hyperlane Gateway [Nexus-01]',
    tier: 1,
    description: 'Orbital megastructure bending spacetime to expedite galactic transit and stabilize sector mining yields.',
    required_alloys: 1000,
    contributed_alloys: 240,
    required_fuel: 500,
    contributed_fuel: 110,
    perk_description: '+25% Base Extraction Yield & -30% Sector Transit Duration',
    status: 'in_progress',
  };

  const leaderboard = allianceData?.leaderboard || [];

  // Local inventory lookups
  const getInventoryQty = (resId) => {
    const item = inventory.find((i) => i.resource_id === resId);
    return item ? Math.floor(item.quantity) : 0;
  };

  const alloyStock = getInventoryQty('res_alloy_plating');
  const fuelStock = getInventoryQty('res_fuel_cells');

  const selectedStock = selectedMaterial === 'res_alloy_plating' ? alloyStock : fuelStock;
  const maxContributable = Math.max(1, selectedStock);

  // Progress metrics
  const alloyPct = Math.min(100, Math.round((project.contributed_alloys / project.required_alloys) * 100));
  const fuelPct = Math.min(100, Math.round((project.contributed_fuel / project.required_fuel) * 100));
  const overallPct = Math.min(
    100,
    Math.round(
      ((project.contributed_alloys + project.contributed_fuel) /
        (project.required_alloys + project.required_fuel)) *
        100
    )
  );

  const isCompleted = project.status === 'completed' || (alloyPct >= 100 && fuelPct >= 100);

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setAmount(val);
  };

  const handlePreset = (qty) => {
    audioEngine.playButtonClick();
    setAmount(Math.min(qty, selectedStock));
  };

  const handleContribute = async () => {
    audioEngine.playButtonClick();

    if (amount <= 0 || amount > selectedStock) {
      setFeedback({
        type: 'error',
        message: `Insufficient inventory. You possess ${selectedStock} units.`,
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setIsSubmitting(true);
    const res = await contributeToMegastructure({
      projectId: project.id,
      resourceId: selectedMaterial,
      amount,
    });
    setIsSubmitting(false);

    if (res.success) {
      audioEngine.playRefineryStart();
      setFeedback({
        type: 'success',
        message: `Contributed ${amount}x ${
          selectedMaterial === 'res_alloy_plating' ? 'Alloy Plating' : 'Fuel Cells'
        } to ${project.name}!`,
      });
      setAmount(Math.min(25, Math.max(0, selectedStock - amount)));
      fetchAllianceData();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to submit contribution.',
      });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <section className="flex flex-col gap-6 w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Alliance Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-lg font-mono font-bold">
              [{alliance.tag || 'VIC'}]
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                {alliance.name}
              </h2>
              <span className="text-[11px] font-mono text-emerald-400">
                ALLIANCE LEVEL {alliance.level} &bull; MEGASTRUCTURE SYNDICATE
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">{alliance.description}</p>
        </div>

        {/* Global Construction Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              GLOBAL PROGRESS
            </span>
            <span className="text-base font-mono font-bold text-cyan-300">
              {overallPct}% CONSTRUCTED
            </span>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              isCompleted ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]'
            }`}
          />
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

      {/* Main Project Overview & Contribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Schematics & Dual Material Progress */}
        <div className="lg:col-span-7 flex flex-col justify-between p-5 rounded-xl border border-zinc-800 bg-slate-950/80 shadow-lg">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-lg">🌌</span>
                  {project.name}
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  TIER {project.tier} MEGASTRUCTURE &bull; STATUS:{' '}
                  <span className={isCompleted ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {project.status?.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 my-2 leading-relaxed">{project.description}</p>

            {/* Faction Perk Banner */}
            <div className="p-3 my-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2.5 text-xs font-mono text-emerald-300">
              <span className="text-base">✨</span>
              <div>
                <span className="font-bold block">ACTIVE FACTION PERK UPON COMPLETION:</span>
                <span className="text-[11px] text-emerald-400/90">{project.perk_description}</span>
              </div>
            </div>

            {/* Dual Material Progress Bars */}
            <div className="flex flex-col gap-4 mt-4 pt-3 border-t border-zinc-800/80">
              {/* Refined Alloy Plating Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <span>🛡️</span> Refined Alloy Plating
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {project.contributed_alloys.toLocaleString()} / {project.required_alloys.toLocaleString()} T ({alloyPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-500"
                    style={{ width: `${alloyPct}%` }}
                  />
                </div>
              </div>

              {/* Stabilized Fuel Cells Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <span>🔋</span> Stabilized Fuel Cells
                  </span>
                  <span className="text-purple-400 font-bold">
                    {project.contributed_fuel.toLocaleString()} / {project.required_fuel.toLocaleString()} Cells ({fuelPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)] transition-all duration-500"
                    style={{ width: `${fuelPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex justify-between">
            <span>NETWORK: ASTROLITH HYPERLANE GRID</span>
            <span>SYNC: AUTHORITATIVE WAL TRANSACTIONS</span>
          </div>
        </div>

        {/* Right Column: Material Contribution Transfer Terminal */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl border border-cyan-500/30 bg-slate-950/90 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  🏗️
                </span>
                Material Transfer Terminal
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">PLAYER STOCKPILE</span>
            </div>

            {/* Material Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playButtonClick();
                  setSelectedMaterial('res_alloy_plating');
                  setAmount(Math.min(25, alloyStock));
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                  selectedMaterial === 'res_alloy_plating'
                    ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 shadow-sm shadow-cyan-500/20'
                    : 'border-zinc-800 bg-slate-900/60 text-zinc-400 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">🛡️</span>
                <div>
                  <span className="text-xs font-semibold block">Alloy Plating</span>
                  <span className="text-[10px] font-mono text-zinc-400">Stock: {alloyStock} T</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playButtonClick();
                  setSelectedMaterial('res_fuel_cells');
                  setAmount(Math.min(25, fuelStock));
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                  selectedMaterial === 'res_fuel_cells'
                    ? 'border-purple-400 bg-purple-950/20 text-purple-300 shadow-sm shadow-purple-500/20'
                    : 'border-zinc-800 bg-slate-900/60 text-zinc-400 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">🔋</span>
                <div>
                  <span className="text-xs font-semibold block">Fuel Cells</span>
                  <span className="text-[10px] font-mono text-zinc-400">Stock: {fuelStock} Cells</span>
                </div>
              </button>
            </div>

            {/* Contribution Amount Slider */}
            <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-slate-900/90 border border-zinc-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Transfer Volume:</span>
                <span className="text-sm font-bold text-cyan-400">{amount} Units</span>
              </div>

              <input
                type="range"
                min="1"
                max={Math.max(1, selectedStock)}
                value={amount}
                disabled={selectedStock === 0 || isCompleted}
                onChange={handleSliderChange}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1.5 mt-1">
                {[10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={selectedStock < preset || isCompleted}
                    onClick={() => handlePreset(preset)}
                    className="flex-1 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-zinc-800 text-[10px] font-mono text-zinc-300 disabled:opacity-40"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={selectedStock === 0 || isCompleted}
                  onClick={() => handlePreset(selectedStock)}
                  className="flex-1 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 disabled:opacity-40"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedStock === 0 || amount <= 0 || isSubmitting || isCompleted}
            onClick={handleContribute}
            className={`w-full mt-4 py-3 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                : selectedStock > 0 && amount > 0
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-[0.98]'
                : 'bg-zinc-800/80 text-rose-300/60 border border-rose-900/40 cursor-not-allowed'
            }`}
          >
            {isSubmitting
              ? 'COMMITTING TRANSFER TRANSACTION...'
              : isCompleted
              ? '✓ MEGASTRUCTURE FULLY CONSTRUCTED'
              : selectedStock > 0
              ? `TRANSFER ${amount}x ${
                  selectedMaterial === 'res_alloy_plating' ? 'ALLOY PLATES' : 'FUEL CELLS'
                } TO PROJECT`
              : 'INSUFFICIENT REFINED STOCKPILE'}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboard.length > 0 && (
        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Alliance Contribution Ledger & Recognition
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {leaderboard.map((item, idx) => (
              <div
                key={`${item.user_id}-${item.resource_id}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-slate-950/60 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="text-slate-200 block font-semibold">Commander #{item.user_id}</span>
                    <span className="text-[10px] text-zinc-400">
                      {item.resource_id === 'res_alloy_plating' ? '🛡️ Alloy Plating' : '🔋 Fuel Cells'}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-cyan-400">+{Number(item.total_contributed).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default AllianceHub;
