import React, { useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import SidebarNav from './components/SidebarNav';
import TopBar from './components/TopBar';
import OfflineSummary from './components/OfflineSummary';
import CommandHubView from './pages/CommandHubView';
import SectorMapView from './pages/SectorMapView';
import TacticalView from './pages/TacticalView';
import { useGameState } from './hooks/useGameState';
import { useStore } from './store/useStore';

function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Fixed Left Sidebar Navigation (250px) */}
      <SidebarNav />

      {/* Fluid Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        
        {/* Dynamic Routed View Area */}
        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Offline Catch-Up Telemetry Modal */}
      <OfflineSummary />
    </div>
  );
}

export default function App() {
  const currentUserId = useStore((state) => state.currentUserId);
  const fetchSectors = useStore((state) => state.fetchSectors);
  const fetchHazards = useStore((state) => state.fetchHazards);

  // Initialize authoritative game state WebSocket connection & automatic 5000ms telemetry sync
  useGameState(currentUserId);

  useEffect(() => {
    fetchSectors();
    if (fetchHazards) fetchHazards();
  }, [fetchSectors, fetchHazards]);

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<CommandHubView />} />
        <Route path="/sector-map" element={<SectorMapView />} />
        <Route path="/tactical-view" element={<TacticalView />} />
        <Route path="*" element={<CommandHubView />} />
      </Route>
    </Routes>
  );
}
