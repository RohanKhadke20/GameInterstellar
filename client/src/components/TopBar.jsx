import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../utils/audioEngine';

export default function TopBar({ credits }) {
  const storeUser = useStore((state) => state.currentUser);
  const hazards = useStore((state) => state.hazards) || [];
  const [isMuted, setIsMuted] = useState(audioEngine.isMuted);

  const effectiveCredits = credits !== undefined ? credits : storeUser?.credits ?? 5000;
  const formattedCredits = Number(effectiveCredits).toLocaleString();

  const handleToggleAudio = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) audioEngine.playButtonClick();
  };

  return (
    <header className="sticky top-0 z-20 h-16 w-full bg-slate-900/80 backdrop-blur-md border-b border-zinc-800 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          FLEET CONSOLE
        </span>

        {/* Active System Hazards Pill */}
        {hazards.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{hazards.length} ACTIVE SYSTEM HAZARD{hazards.length > 1 ? 'S' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Audio Mute/Unmute Toggle */}
        <button
          type="button"
          onClick={handleToggleAudio}
          className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-cyan-300 transition-all"
        >
          {isMuted ? '🔇 MUTED' : '🔊 AUDIO'}
        </button>

        {/* Credits Pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div
            className="w-5 h-5 flex-shrink-0 rounded-full bg-amber-400/20 flex items-center justify-center text-xs font-bold text-amber-300"
            style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
          >
            ₵
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-mono font-bold tracking-wide">
              {formattedCredits}
            </span>
            <span className="text-[10px] font-semibold text-amber-400/70">
              CR
            </span>
          </div>
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
          <div
            className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-slate-200"
            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
          >
            CM
          </div>
        </div>
      </div>
    </header>
  );
}
