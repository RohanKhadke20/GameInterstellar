import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    name: 'Command Hub',
    path: '/',
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: 'Sector Map',
    path: '/sector-map',
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    name: 'Tactical View',
    path: '/tactical-view',
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function SidebarNav() {
  return (
    <aside className="w-[250px] flex-shrink-0 h-full bg-slate-900 border-r border-zinc-800 flex flex-col z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800 gap-3 max-w-[250px] flex-shrink-0">
        <div
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-base"
          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
        >
          ⚡
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wider uppercase text-slate-100 truncate">Astrolith</h1>
          <p className="text-[10px] text-cyan-400 font-mono">SYSTEM OS v2.4</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-w-0">
        <p className="px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-zinc-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex-shrink-0 flex items-center justify-center ${isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
                    style={{ width: '6px', height: '6px', minWidth: '6px', minHeight: '6px' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Online Status Footer */}
      <div className="p-4 border-t border-zinc-800 bg-slate-950/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 flex-shrink-0" style={{ width: '8px', height: '8px', minWidth: '8px', minHeight: '8px' }}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-zinc-400 font-mono truncate">ONLINE // SYNCED</span>
        </div>
      </div>
    </aside>
  );
}
