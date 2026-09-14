import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../utils/audioEngine';

const COMMODITY_CONFIGS = [
  {
    id: 'ore_ferrite',
    name: 'Ferrite Ore',
    code: 'FER-01',
    description: 'Raw unrefined iron-nickel asteroid deposits',
    maxCapacity: 50000,
    unitPrice: 10,
    theme: {
      accentText: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      barFill: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      hoverBorder: 'hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'res_silicates',
    name: 'Silicates',
    code: 'SIL-02',
    description: 'Raw crystalline glass & planetary silicon compounds',
    maxCapacity: 40000,
    unitPrice: 15,
    theme: {
      accentText: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10',
      badgeBorder: 'border-cyan-500/30',
      barFill: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]',
      hoverBorder: 'hover:border-cyan-500/50 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'res_titanium',
    name: 'Titanium',
    code: 'TIT-03',
    description: 'High-tensile lightweight asteroid core metals',
    maxCapacity: 25000,
    unitPrice: 35,
    theme: {
      accentText: 'text-blue-400',
      badgeBg: 'bg-blue-500/10',
      badgeBorder: 'border-blue-500/30',
      barFill: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.4)]',
      hoverBorder: 'hover:border-blue-500/50 hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'res_xenon',
    name: 'Xenon Gas',
    code: 'XEN-04',
    description: 'Pressurized noble gas used in ion propulsion drives',
    maxCapacity: 15000,
    unitPrice: 50,
    theme: {
      accentText: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10',
      badgeBorder: 'border-indigo-500/30',
      barFill: 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.4)]',
      hoverBorder: 'hover:border-indigo-500/50 hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'res_isotopes',
    name: 'Isotope-238',
    code: 'ISO-05',
    description: 'High-energy fissile elements & warp drive catalysts',
    maxCapacity: 10000,
    unitPrice: 120,
    theme: {
      accentText: 'text-purple-400',
      badgeBg: 'bg-purple-500/10',
      badgeBorder: 'border-purple-500/30',
      barFill: 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.4)]',
      hoverBorder: 'hover:border-purple-500/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'res_alloy_plating',
    name: 'Alloy Plating',
    code: 'REF-01',
    description: 'High-density composite armor for advanced starship hulls',
    maxCapacity: 5000,
    unitPrice: 280,
    theme: {
      accentText: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/30',
      barFill: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]',
      hoverBorder: 'hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    id: 'res_fuel_cells',
    name: 'Fuel Cells',
    code: 'REF-02',
    description: 'Stabilized warp propellant canisters for interstellar transit',
    maxCapacity: 5000,
    unitPrice: 320,
    theme: {
      accentText: 'text-amber-300',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      barFill: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]',
      hoverBorder: 'hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]',
    },
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const CommodityCard = React.memo(function CommodityCard({ config, quantity = 0, marketItem, onSell }) {
  const { name, code, maxCapacity, theme, icon, unitPrice, id } = config;
  const safeQty = Math.max(0, Number(quantity) || 0);
  const capacityPct = Math.min(100, Math.round((safeQty / maxCapacity) * 100));

  const effectivePrice = marketItem?.current_price !== undefined ? marketItem.current_price : unitPrice;
  const trend = marketItem?.trend !== undefined ? marketItem.trend : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md transition-all duration-200 group ${theme.hoverBorder}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center justify-center p-2 rounded-lg border ${theme.badgeBg} ${theme.badgeBorder} ${theme.accentText}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-100">{name}</h3>
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              {code}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="font-mono text-sm font-bold text-slate-100">
            {safeQty.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            / {maxCapacity.toLocaleString()} T
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
          <span>Capacity Usage</span>
          <span className={capacityPct >= 90 ? 'text-rose-400 font-bold' : ''}>
            {capacityPct}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-950 border border-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.barFill}`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      {/* Dynamic Market Pricing & Trend Indicators */}
      <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-slate-200">
            {effectivePrice.toFixed(1)} <span className="text-[9px] text-zinc-400">CR/T</span>
          </span>

          {/* Trend Indicator */}
          {trend > 0 ? (
            <span className="inline-flex items-center text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
              ▲ +{trend}%
            </span>
          ) : trend < 0 ? (
            <span className="inline-flex items-center text-[10px] font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
              ▼ {trend}%
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-mono text-zinc-500 bg-zinc-800/40 px-1 rounded">
              — 0.0%
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={safeQty < 10}
          onClick={() => onSell(id, Math.min(safeQty, 50), effectivePrice)}
          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
            safeQty >= 10
              ? 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 active:scale-95'
              : 'bg-slate-950 text-zinc-600 border border-zinc-900 cursor-not-allowed'
          }`}
        >
          SELL 50T
        </button>
      </div>
    </div>
  );
});

export function ResourceDashboard() {
  const inventory = useStore((state) => state.inventory);
  const market = useStore((state) => state.market) || [];
  const sellResource = useStore((state) => state.sellResource);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(inventory)) {
      inventory.forEach((item) => {
        if (item && item.resource_id) {
          map.set(item.resource_id, item.quantity);
        }
      });
    }
    return map;
  }, [inventory]);

  const marketMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(market)) {
      market.forEach((m) => {
        if (m && m.resource_id) {
          map.set(m.resource_id, m);
        }
      });
    }
    return map;
  }, [market]);

  const handleSell = async (resId, amount, unitPrice) => {
    audioEngine.playButtonClick();
    await sellResource({ resourceId: resId, amount, unitPrice });
  };

  return (
    <section className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          Dynamic Commodity Exchange & Stockpiles
        </h2>
        <span className="text-xs font-mono text-zinc-500">LIVE WEBSOCKET PRICING</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMMODITY_CONFIGS.map((config) => (
          <CommodityCard
            key={config.id}
            config={config}
            quantity={inventoryMap.get(config.id) || 0}
            marketItem={marketMap.get(config.id)}
            onSell={handleSell}
          />
        ))}
      </div>
    </section>
  );
}

export default ResourceDashboard;
