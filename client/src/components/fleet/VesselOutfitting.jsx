import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { audioEngine } from '../../utils/audioEngine';

export const COMPONENT_CATALOG = [
  {
    id: 'mod_extractor_mk1',
    name: 'Mining Laser Mk-I',
    category: 'Extractors',
    categoryType: 'extractor',
    power: 15,
    tonnage: 8,
    bonusExtraction: 1.5,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 400,
    icon: '⚡',
    theme: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    description: 'Focused optical cutter (+1.5 T/s base extraction rate).',
  },
  {
    id: 'mod_extractor_mk2',
    name: 'Sub-Surface Bore Mk-II',
    category: 'Extractors',
    categoryType: 'extractor',
    power: 30,
    tonnage: 15,
    bonusExtraction: 3.2,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 950,
    icon: '🌋',
    theme: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    description: 'Pneumatic rotary drill head (+3.2 T/s high-yield extraction).',
  },
  {
    id: 'mod_extractor_mk3',
    name: 'Plasma Siphon Mk-III',
    category: 'Extractors',
    categoryType: 'extractor',
    power: 50,
    tonnage: 22,
    bonusExtraction: 6.0,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 2200,
    icon: '☄️',
    theme: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    description: 'High-energy plasma ionization beam (+6.0 T/s extraction yield).',
  },
  {
    id: 'mod_cargo_small',
    name: 'Modular Silo Mk-I',
    category: 'Cargo Expanders',
    categoryType: 'cargo',
    power: 5,
    tonnage: 12,
    bonusExtraction: 0,
    bonusCargo: 3000,
    hazardReduction: 0,
    costCredits: 350,
    icon: '📦',
    theme: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    description: 'Expanded magnetic hold (+3,000 T resource hold capacity).',
  },
  {
    id: 'mod_cargo_medium',
    name: 'Expanded Hold Mk-II',
    category: 'Cargo Expanders',
    categoryType: 'cargo',
    power: 10,
    tonnage: 20,
    bonusExtraction: 0,
    bonusCargo: 8000,
    hazardReduction: 0,
    costCredits: 850,
    icon: '🏗️',
    theme: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    description: 'Reinforced pressurized silo (+8,000 T heavy resource hold).',
  },
  {
    id: 'mod_armor_titanium',
    name: 'Titanium Plating Mk-I',
    category: 'Plating',
    categoryType: 'plating',
    power: 0,
    tonnage: 10,
    bonusExtraction: 0,
    bonusCargo: 0,
    hazardReduction: 0.25,
    costCredits: 500,
    icon: '🛡️',
    theme: 'border-zinc-500/30 text-zinc-300 bg-zinc-500/10',
    description: 'Hardened composite plating (mitigates 25% of environmental hazard debuffs).',
  },
  {
    id: 'mod_shield_composite',
    name: 'Composite Shield Matrix',
    category: 'Plating',
    categoryType: 'plating',
    power: 25,
    tonnage: 6,
    bonusExtraction: 0,
    bonusCargo: 0,
    hazardReduction: 0.45,
    costCredits: 1200,
    icon: '🔮',
    theme: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    description: 'Electromagnetic deflector barrier (mitigates 45% of solar/storm debuffs).',
  },
];

export function VesselOutfitting() {
  const fleets = useStore((state) => state.fleets) || [];
  const outfitVessel = useStore((state) => state.outfitVessel);

  const [selectedVesselId, setSelectedVesselId] = useState(fleets[0]?.id || 1);
  const [activeTab, setActiveTab] = useState('All');
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedVessel = useMemo(() => {
    return fleets.find((v) => v.id === Number(selectedVesselId)) || fleets[0] || null;
  }, [fleets, selectedVesselId]);

  const maxSlots = 4;
  const maxPower = selectedVessel?.max_power || 100;
  const maxTonnage = selectedVessel?.max_tonnage || 50;

  // Parsed equipped modules array
  const equippedModuleIds = useMemo(() => {
    if (!selectedVessel || !selectedVessel.modules) return [];
    if (Array.isArray(selectedVessel.modules)) return selectedVessel.modules;
    try {
      return JSON.parse(selectedVessel.modules) || [];
    } catch {
      return [];
    }
  }, [selectedVessel]);

  // Calculate current power and tonnage load
  const { currentPower, currentTonnage, totalExtractionBonus, totalCargoBonus, totalHazardDefense } = useMemo(() => {
    let power = 0;
    let tonnage = 0;
    let extraction = 0;
    let cargo = 0;
    let defense = 0;

    for (const modId of equippedModuleIds) {
      const mod = COMPONENT_CATALOG.find((m) => m.id === modId);
      if (mod) {
        power += mod.power;
        tonnage += mod.tonnage;
        extraction += mod.bonusExtraction;
        cargo += mod.bonusCargo;
        defense += mod.hazardReduction;
      }
    }

    return {
      currentPower: power,
      currentTonnage: tonnage,
      totalExtractionBonus: extraction,
      totalCargoBonus: cargo,
      totalHazardDefense: Math.min(0.85, defense),
    };
  }, [equippedModuleIds]);

  const powerPercent = Math.min(100, Math.round((currentPower / maxPower) * 100));
  const tonnagePercent = Math.min(100, Math.round((currentTonnage / maxTonnage) * 100));

  const filteredCatalog = useMemo(() => {
    if (activeTab === 'All') return COMPONENT_CATALOG;
    return COMPONENT_CATALOG.filter((item) => item.category === activeTab);
  }, [activeTab]);

  const handleInstall = async (mod) => {
    audioEngine.playButtonClick();
    if (!selectedVessel) return;

    if (equippedModuleIds.length >= maxSlots) {
      setFeedback({ type: 'error', message: 'All hardpoint module slots are filled.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    if (currentPower + mod.power > maxPower) {
      setFeedback({
        type: 'error',
        message: `Power grid overload! Required: ${currentPower + mod.power} MW, Max: ${maxPower} MW`,
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    if (currentTonnage + mod.tonnage > maxTonnage) {
      setFeedback({
        type: 'error',
        message: `Tonnage capacity exceeded! Required: ${currentTonnage + mod.tonnage} T, Max: ${maxTonnage} T`,
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const updatedModules = [...equippedModuleIds, mod.id];
    setIsSaving(true);
    const res = await outfitVessel({ vesselId: selectedVessel.id, modules: updatedModules });
    setIsSaving(false);

    if (res.success) {
      audioEngine.playTechUpgrade();
      setFeedback({ type: 'success', message: `Equipped ${mod.name} on ${selectedVessel.name || 'Vessel'}.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to equip module.' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUninstall = async (index) => {
    audioEngine.playButtonClick();
    if (!selectedVessel) return;

    const updatedModules = equippedModuleIds.filter((_, idx) => idx !== index);
    setIsSaving(true);
    const res = await outfitVessel({ vesselId: selectedVessel.id, modules: updatedModules });
    setIsSaving(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Component removed from hardpoint.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to remove module.' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <section className="flex flex-col gap-6 w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Header & Vessel Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-lg">
              🛠️
            </span>
            Modular Vessel Outfitting Bay
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure industrial extractors, cargo silos, and defensive plating within power & tonnage limits
          </p>
        </div>

        {/* Vessel Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">VESSEL:</span>
          <select
            value={selectedVessel?.id || ''}
            onChange={(e) => {
              audioEngine.playButtonClick();
              setSelectedVesselId(Number(e.target.value));
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-zinc-700 text-xs font-mono text-cyan-300 outline-none cursor-pointer focus:border-cyan-500"
          >
            {fleets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name || `Vessel #${v.id}`} [{v.hull_class || 'Mining Rig'}]
              </option>
            ))}
          </select>
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

      {selectedVessel ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Vessel Specs & Power/Tonnage Gauges */}
          <div className="lg:col-span-5 flex flex-col gap-4 p-5 rounded-xl border border-zinc-800 bg-slate-950/80">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedVessel.name || `Vessel #${selectedVessel.id}`}</h3>
                <span className="text-[11px] font-mono text-zinc-400 uppercase">{selectedVessel.hull_class || 'Class-II Mining Rig'}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                ● STATUS: {selectedVessel.status?.toUpperCase() || 'IDLE'}
              </span>
            </div>

            {/* Capacity Gauges */}
            <div className="flex flex-col gap-3.5 pt-2 border-t border-zinc-800/80">
              {/* Power Grid Gauge */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span>⚡</span> Power Grid Allocation
                  </span>
                  <span className={powerPercent >= 90 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {currentPower} / {maxPower} MW ({powerPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 border border-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      powerPercent >= 90
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : powerPercent >= 75
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    }`}
                    style={{ width: `${powerPercent}%` }}
                  />
                </div>
              </div>

              {/* Tonnage Capacity Gauge */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span>⚖️</span> Mass & Tonnage Load
                  </span>
                  <span className={tonnagePercent >= 90 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {currentTonnage} / {maxTonnage} T ({tonnagePercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 border border-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      tonnagePercent >= 90
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : tonnagePercent >= 75
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
                    }`}
                    style={{ width: `${tonnagePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Calculated Vessel Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/80 text-center">
              <div className="p-2 rounded-lg bg-slate-900 border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-400 block">EXTRACTION</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {(selectedVessel.base_extraction_rate || 2.0) + totalExtractionBonus} T/s
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-400 block">CARGO HOLD</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {((selectedVessel.cargo_capacity || 10000) + totalCargoBonus).toLocaleString()} T
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-400 block">HAZARD DEF</span>
                <span className="text-xs font-mono font-bold text-purple-400">
                  {Math.round(totalHazardDefense * 100)}%
                </span>
              </div>
            </div>

            {/* Installed Module Slots */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Installed Hardpoints ({equippedModuleIds.length}/{maxSlots})
              </span>
              <div className="flex flex-col gap-2">
                {Array.from({ length: maxSlots }).map((_, index) => {
                  const modId = equippedModuleIds[index];
                  const mod = COMPONENT_CATALOG.find((m) => m.id === modId);

                  if (mod) {
                    return (
                      <div
                        key={`${mod.id}-${index}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-slate-900/90 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-slate-800 border border-zinc-700">{mod.icon}</span>
                          <div>
                            <span className="font-semibold text-slate-200 block">{mod.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              ⚡ {mod.power}MW &bull; ⚖️ {mod.tonnage}T
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleUninstall(index)}
                          className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold transition-all"
                        >
                          UNINSTALL
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center justify-center p-3 rounded-lg border border-dashed border-zinc-800 bg-slate-900/30 text-[11px] font-mono text-zinc-500"
                    >
                      [ AVAILABLE HARDPOINT SLOT #{index + 1} ]
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Available Modules Inventory / Catalog */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
              {['All', 'Extractors', 'Cargo Expanders', 'Plating'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    audioEngine.playButtonClick();
                    setActiveTab(tab);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                      : 'bg-slate-950 text-zinc-400 border border-zinc-800 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredCatalog.map((mod) => {
                const canFitPower = currentPower + mod.power <= maxPower;
                const canFitTonnage = currentTonnage + mod.tonnage <= maxTonnage;
                const hasSlot = equippedModuleIds.length < maxSlots;
                const canInstall = canFitPower && canFitTonnage && hasSlot;

                return (
                  <div
                    key={mod.id}
                    className="flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-slate-950/80 hover:border-zinc-700 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border text-base ${mod.theme}`}>
                            {mod.icon}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-slate-100">{mod.name}</h4>
                            <span className="text-[10px] font-mono text-zinc-400">{mod.category}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 my-2 leading-relaxed">{mod.description}</p>

                      {/* Specs */}
                      <div className="flex items-center justify-between text-[10px] font-mono p-2 rounded-lg bg-slate-900 border border-zinc-800/80 my-2">
                        <span className={canFitPower ? 'text-zinc-300' : 'text-rose-400 font-bold'}>
                          ⚡ {mod.power} MW
                        </span>
                        <span className={canFitTonnage ? 'text-zinc-300' : 'text-rose-400 font-bold'}>
                          ⚖️ {mod.tonnage} T
                        </span>
                        <span className="text-amber-400">
                          ₵ {mod.costCredits} CR
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canInstall || isSaving}
                      onClick={() => handleInstall(mod)}
                      className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-sm ${
                        canInstall
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-98'
                          : 'bg-zinc-800/80 text-rose-300/60 border border-rose-900/40 cursor-not-allowed'
                      }`}
                    >
                      {isSaving
                        ? 'INSTALLING...'
                        : !hasSlot
                        ? 'SLOTS FULL'
                        : !canFitPower
                        ? 'POWER OVERLOAD'
                        : !canFitTonnage
                        ? 'TONNAGE EXCEEDED'
                        : 'INSTALL MODULE'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-xs font-mono text-zinc-500">
          No fleet vessels registered for outfitting.
        </div>
      )}
    </section>
  );
}

export default VesselOutfitting;
