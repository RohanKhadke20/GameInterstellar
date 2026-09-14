import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../components/SceneManager';
import { audioEngine } from '../utils/audioEngine';

/**
 * TacticalView - High-Performance WebGL Canvas Mount & Industrial Sci-Fi HUD
 */
export default function TacticalView() {
  const canvasRef = useRef(null);
  const [isMuted, setIsMuted] = useState(audioEngine.isMuted);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sceneManager = new SceneManager(canvas);

    return () => {
      sceneManager.cleanup();
    };
  }, []);

  const handleToggleAudio = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) audioEngine.playButtonClick();
  };

  return (
    <div className="relative w-full h-full min-h-[550px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Three.js Tactical WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block bg-slate-950 outline-none select-none cursor-grab active:cursor-grabbing"
      />

      {/* Glassmorphism Tactical HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
        <div className="px-3.5 py-2 rounded-lg bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-lg shadow-cyan-950/30 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>SECTOR [q:0, r:0] // TACTICAL ORBITAL GRID</span>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-slate-900/75 backdrop-blur-md border border-zinc-800 text-[11px] font-mono text-zinc-400">
          🎯 CLICK ASTEROID TO ENGAGE MINING LASER
        </div>
      </div>

      {/* Top-Right Controls & Audio Toggle */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleAudio}
          className="px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-zinc-800 hover:border-cyan-500/40 text-xs font-mono text-zinc-300 hover:text-cyan-300 transition-all shadow-md"
        >
          {isMuted ? '🔇 AUDIO MUTED' : '🔊 AUDIO SYNTH ON'}
        </button>
      </div>

      {/* Bottom-Right Navigation Legend */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none px-3.5 py-2 rounded-lg bg-slate-900/85 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center gap-3">
        <span>🖱️ ROTATE: LEFT-DRAG</span>
        <span>☩ PAN: RIGHT-DRAG</span>
        <span>🔍 ZOOM: SCROLL</span>
      </div>
    </div>
  );
}
