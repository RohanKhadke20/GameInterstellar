import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../utils/audioEngine';

/**
 * Commercial Technological Progression Nodes (Tiers I-III)
 */
const UPGRADE_PATHS = [
  {
    id: 'drill_yield',
    name: 'Extraction Focus',
    icon: '⚡',
    description: 'Increases drill harmonic oscillation to amplify ore extraction rates.',
    bonusText: '+25% Base Extraction Yield per Tier',
    maxTier: 3,
    costResourceId: 'res_isotopes',
    costResourceName: 'Isotope-238',
    baseResourceCost: 20,
    baseCreditsCost: 250,
    accentGlow: 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    badgeStyle: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    progressColor: 'bg-cyan-400',
  },
  {
    id: 'transit_speed',
    name: 'Sub-Light Engines',
    icon: '🚀',
    description: 'Upgrades ion manifold conduits, reducing sub-light travel transit duration.',
    bonusText: '-30% Sector Transit Travel Duration',
    maxTier: 3,
    costResourceId: 'res_titanium',
    costResourceName: 'Titanium',
    baseResourceCost: 30,
    baseCreditsCost: 200,
    accentGlow: 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    progressColor: 'bg-emerald-400',
  },
  {
    id: 'scanner_array',
    name: 'Scanner Array',
    icon: '📡',
    description: 'Long-range hyperspectral sensors reveal anomaly details and hazardous flare predictions.',
    bonusText: 'Unlocks Deep Sector Telemetry & Anomaly Intel',
    maxTier: 3,
    costResourceId: 'res_xenon',
    costResourceName: 'Xenon Gas',
    baseResourceCost: 25,
    baseCreditsCost: 300,
    accentGlow: 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    badgeStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    progressColor: 'bg-purple-400',
  },
  {
    id: 'silo_capacity',
    name: 'Cargo Bay Expansion',
    icon: '📦',
    description: 'Reinforces magnetic container walls to expand vessel and station stockpile limits.',
    bonusText: '+50% Maximum Resource Hold Capacity',
    maxTier: 3,
    costResourceId: 'res_silicates',
    costResourceName: 'Silicates',
    baseResourceCost: 40,
    baseCreditsCost: 150,
    accentGlow: 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    progressColor: 'bg-amber-400',
  },
];

export function TechTree() {
  const inventory = useStore((state) => state.inventory) || [];
  const currentUser = useStore((state) => state.currentUser);
  const techTiers = useStore((state) => state.techTiers) || {};
  const upgradeTech = useStore((state) => state.upgradeTech);

  const [activeUpgradeId, setActiveUpgradeId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const credits = currentUser?.credits ?? 0;

  const getResourceQuantity = (resourceId) => {
    const item = inventory.find((i) => i.resource_id === resourceId);
    return item ? item.quantity : 0;
  };

  const handlePurchase = async (upgrade) => {
    audioEngine.playButtonClick();
    const currentTier = techTiers[upgrade.id] || 1;
    if (currentTier >= upgrade.maxTier) return;

    const resourceCost = upgrade.baseResourceCost * currentTier;
    const creditsCost = upgrade.baseCreditsCost * currentTier;
    const availableResource = getResourceQuantity(upgrade.costResourceId);

    if (availableResource < resourceCost || credits < creditsCost) {
      setFeedback({
        type: 'error',
        message: `Insufficient resources to upgrade ${upgrade.name}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setActiveUpgradeId(upgrade.id);
    const res = await upgradeTech({
      upgradeId: upgrade.id,
      nextTier: currentTier + 1,
      costCredits: creditsCost,
      costResId: upgrade.costResourceId,
      costResAmount: resourceCost,
    });
    setActiveUpgradeId(null);

    if (res.success) {
      audioEngine.playTechUpgrade();
      setFeedback({
        type: 'success',
        message: `Upgraded ${upgrade.name} to Tier ${currentTier + 1}!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to complete research upgrade.',
      });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <section className="flex flex-col gap-5 w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-lg">
              🧬
            </span>
            Technological Progression Matrix
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Invest extracted materials and energy credits to enhance fleet capabilities
          </p>
        </div>

        {feedback && (
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Upgrade Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {UPGRADE_PATHS.map((upgrade) => {
          const currentTier = techTiers[upgrade.id] || 1;
          const isMaxTier = currentTier >= upgrade.maxTier;
          const nextTier = currentTier + 1;

          const requiredResource = upgrade.baseResourceCost * currentTier;
          const requiredCredits = upgrade.baseCreditsCost * currentTier;
          const availableResource = getResourceQuantity(upgrade.costResourceId);

          const hasEnoughRes = availableResource >= requiredResource;
          const hasEnoughCredits = credits >= requiredCredits;
          const canAfford = hasEnoughRes && hasEnoughCredits && !isMaxTier;
          const isProcessing = activeUpgradeId === upgrade.id;

          return (
            <div
              key={upgrade.id}
              className={`flex flex-col justify-between p-4 rounded-xl border bg-slate-950/80 transition-all ${
                isMaxTier
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : upgrade.accentGlow
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border text-sm ${upgrade.badgeStyle}`}>
                      {upgrade.icon}
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-100">{upgrade.name}</h3>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {isMaxTier ? 'TIER III (MAX)' : `TIER ${currentTier} / III`}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 my-2 leading-relaxed">
                  {upgrade.description}
                </p>

                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-3 border border-zinc-800">
                  <div
                    className={`h-full transition-all duration-500 ${upgrade.progressColor}`}
                    style={{ width: `${(currentTier / upgrade.maxTier) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                {!isMaxTier ? (
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={hasEnoughCredits ? 'text-zinc-300' : 'text-rose-400 font-bold'}>
                      💰 {requiredCredits} CR
                    </span>
                    <span className={hasEnoughRes ? 'text-zinc-300' : 'text-rose-400 font-bold'}>
                      {upgrade.costResourceName}: {requiredResource}
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-1 text-[11px] font-mono text-emerald-400 font-medium">
                    ✓ Maximum Tier Researched
                  </div>
                )}

                {!isMaxTier && (
                  <button
                    type="button"
                    disabled={!canAfford || isProcessing}
                    onClick={() => handlePurchase(upgrade)}
                    className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-sm ${
                      canAfford
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-[0.98]'
                        : 'bg-zinc-800/80 text-rose-300/60 border border-rose-900/40 cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? 'RESEARCHING...' : canAfford ? `UPGRADE TIER ${nextTier}` : 'INSUFFICIENT FUNDS'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default TechTree;
