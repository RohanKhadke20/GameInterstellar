import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../utils/audioEngine';

const REFINERY_RECIPES = [
  {
    id: 'refine_alloy',
    name: 'Refined Alloy Plating',
    icon: '🛡️',
    description: 'High-tensile structural armor forged from Ferrite and Titanium.',
    outputQty: 10,
    outputUnit: 'Plates',
    inputs: [
      { id: 'ore_ferrite', name: 'Ferrite Ore', qty: 50, icon: '⛏️' },
      { id: 'res_titanium', name: 'Titanium', qty: 25, icon: '💎' },
    ],
    theme: {
      border: 'border-cyan-500/40 hover:border-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      btn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25',
    },
  },
  {
    id: 'refine_fuel',
    name: 'Stabilized Fuel Cells',
    icon: '🔋',
    description: 'Compressed plasma canisters combining Xenon Gas and Isotope-238.',
    outputQty: 10,
    outputUnit: 'Cells',
    inputs: [
      { id: 'res_xenon', name: 'Xenon Gas', qty: 40, icon: '💨' },
      { id: 'res_isotopes', name: 'Isotope-238', qty: 15, icon: '⚡' },
    ],
    theme: {
      border: 'border-purple-500/40 hover:border-purple-400',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      btn: 'bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-purple-500/25',
    },
  },
];

export function RefineryModule() {
  const inventory = useStore((state) => state.inventory) || [];
  const refineResource = useStore((state) => state.refineResource);

  const [activeRecipeId, setActiveRecipeId] = useState(null);
  const [batches, setBatches] = useState(1);
  const [feedback, setFeedback] = useState(null);

  const getQty = (resId) => {
    const item = inventory.find((i) => i.resource_id === resId);
    return item ? item.quantity : 0;
  };

  const handleRefine = async (recipe) => {
    audioEngine.playButtonClick();
    const canAfford = recipe.inputs.every(
      (inp) => getQty(inp.id) >= inp.qty * batches
    );

    if (!canAfford) {
      setFeedback({ type: 'error', message: 'Insufficient raw materials for refining.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setActiveRecipeId(recipe.id);
    const res = await refineResource({ recipeId: recipe.id, batches });
    setActiveRecipeId(null);

    if (res.success) {
      audioEngine.playRefineryStart();
      setFeedback({
        type: 'success',
        message: `Successfully refined ${recipe.outputQty * batches}x ${recipe.name}!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Refining cycle failed.',
      });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <section className="flex flex-col gap-5 w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-lg">
              🏭
            </span>
            Industrial Smelting & Refining Complex
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Convert extracted raw ores into advanced structural alloys and high-density warp fuel
          </p>
        </div>

        {/* Dynamic Batch Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">BATCH:</span>
          {[1, 5, 10].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                audioEngine.playButtonClick();
                setBatches(b);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                batches === b
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-950 text-zinc-400 border border-zinc-800 hover:text-slate-200'
              }`}
            >
              {b}x
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REFINERY_RECIPES.map((recipe) => {
          const totalOutput = recipe.outputQty * batches;
          const canAfford = recipe.inputs.every(
            (inp) => getQty(inp.id) >= inp.qty * batches
          );
          const isProcessing = activeRecipeId === recipe.id;

          return (
            <div
              key={recipe.id}
              className={`flex flex-col justify-between p-5 rounded-xl border bg-slate-950/80 transition-all ${recipe.theme.border}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-lg border text-base ${recipe.theme.badge}`}>
                      {recipe.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{recipe.name}</h3>
                      <p className="text-[11px] font-mono text-cyan-400/90">
                        Yield: +{totalOutput} {recipe.outputUnit}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 my-2 leading-relaxed">{recipe.description}</p>

                {/* Input Requirements */}
                <div className="flex flex-col gap-1.5 my-3 p-3 rounded-lg bg-slate-900/90 border border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    Required Feedstock:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {recipe.inputs.map((inp) => {
                      const needed = inp.qty * batches;
                      const hasEnough = getQty(inp.id) >= needed;
                      return (
                        <div
                          key={inp.id}
                          className="flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-zinc-400 flex items-center gap-1">
                            <span>{inp.icon}</span>
                            <span>{inp.name}</span>
                          </span>
                          <span className={hasEnough ? 'text-slate-200' : 'text-rose-400 font-bold'}>
                            {getQty(inp.id).toFixed(0)}/{needed}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!canAfford || isProcessing}
                onClick={() => handleRefine(recipe)}
                className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm ${
                  canAfford
                    ? `${recipe.theme.btn} active:scale-[0.98]`
                    : 'bg-zinc-800/80 text-rose-300/60 border border-rose-900/40 cursor-not-allowed'
                }`}
              >
                {isProcessing ? 'REFINING FEEDSTOCK...' : canAfford ? `EXECUTE REFINERY CYCLE (${batches}x)` : 'INSUFFICIENT FEEDSTOCK'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RefineryModule;
