import { create } from 'zustand';

/**
 * Astrolith Pure Zustand Global Store
 * State management for player identity, game arrays (inventory, fleets, sectors, logs),
 * and 3D scene parameters. All real-time WebSocket transport is managed by useGameState.js.
 */
export const useStore = create((set) => ({
  // Authentication & Player State
  currentUserId: 1,
  currentUser: null,
  inventory: [],
  fleets: [],
  sectors: [],
  hazards: [],
  incursions: [],
  market: [],
  allianceData: null,
  offlineGains: null,
  offlineNotification: null,
  techTiers: {
    drill_yield: 1,
    transit_speed: 1,
    silo_capacity: 1,
    hazard_shielding: 1,
  },

  // Live Telemetry Indicators & System Logs
  wsConnected: false,
  messages: [],
  lastTickTimestamp: null,
  totalOreMinedRate: 0,

  // 3D Scene Controls
  rotationSpeed: 0.008,
  particleCount: 1500,
  meshColor: '#38bdf8',
  laserActive: true,

  // State Setters & Mutators
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setWsConnected: (status) => set({ wsConnected: status }),
  setRotationSpeed: (speed) => set({ rotationSpeed: speed }),
  setParticleCount: (count) => set({ particleCount: count }),
  setMeshColor: (color) => set({ meshColor: color }),
  setLaserActive: (active) => set({ laserActive: active }),
  setHazards: (hazards) => set({ hazards }),
  setIncursions: (incursions) => set({ incursions }),
  setMarket: (market) => set({ market }),
  setAllianceData: (data) => set({ allianceData: data }),
  clearOfflineGains: () => set({ offlineGains: null, offlineNotification: null }),
  dismissOfflineNotification: () => set({ offlineGains: null, offlineNotification: null }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages.slice(-49),
        { ...msg, receivedAt: msg.receivedAt || new Date().toLocaleTimeString() }
      ]
    })),

  // API Data Actions
  fetchAllianceData: async () => {
    try {
      const res = await fetch('/api/game/alliance/projects');
      if (res.ok) {
        const data = await res.json();
        set({ allianceData: data });
      }
    } catch (err) {
      console.error('[useStore] Failed to fetch alliance projects:', err);
    }
  },

  fetchMarket: async () => {
    try {
      const res = await fetch('/api/game/market');
      if (res.ok) {
        const data = await res.json();
        set({ market: data.market || [] });
      }
    } catch (err) {
      console.error('[useStore] Failed to fetch market:', err);
    }
  },

  fetchSectors: async () => {
    try {
      const res = await fetch('/api/game/sectors');
      if (res.ok) {
        const data = await res.json();
        set({ sectors: data.sectors || [] });
      }
    } catch (err) {
      console.error('[useStore] Failed to fetch sectors:', err);
    }
  },

  fetchHazards: async () => {
    try {
      const res = await fetch('/api/game/hazards');
      if (res.ok) {
        const data = await res.json();
        set({ hazards: data.hazards || [] });
      }
    } catch (err) {
      console.error('[useStore] Failed to fetch hazards:', err);
    }
  },

  deployProbe: async () => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/probe/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        set((state) => {
          const exists = state.sectors.some((s) => s.id === data.sector.id);
          const updatedSectors = exists ? state.sectors : [...state.sectors, data.sector];
          const updatedUser = state.currentUser
            ? { ...state.currentUser, credits: data.creditsRemaining }
            : null;
          return { sectors: updatedSectors, currentUser: updatedUser };
        });
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Probe deployment failed' };
      }
    } catch (err) {
      console.error('[useStore] Deploy probe error:', err);
      return { success: false, error: err.message };
    }
  },

  upgradeTech: async ({ upgradeId, nextTier, costCredits, costResId, costResAmount }) => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          upgrade_id: upgradeId,
          tier: nextTier,
          cost_credits: costCredits,
          cost_resource_id: costResId,
          cost_resource_amount: costResAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          techTiers: {
            ...state.techTiers,
            [upgradeId]: nextTier
          },
          currentUser: data.user || state.currentUser,
          inventory: data.inventory || state.inventory
        }));
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Upgrade failed' };
      }
    } catch (error) {
      console.error('[useStore] Upgrade error:', error);
      return { success: false, error: error.message };
    }
  },

  purchaseUpgrade: async (upgradeId) => {
    const state = useStore.getState();
    const currentTier = state.techTiers[upgradeId] || 1;
    const nextTier = currentTier + 1;
    return state.upgradeTech({
      upgradeId,
      nextTier,
      costCredits: 100 * currentTier,
      costResId: upgradeId === 'extraction_laser_focus' ? 'res_isotopes' : 'res_metals',
      costResAmount: 25 * currentTier
    });
  },

  refineResource: async ({ recipeId, batches = 1 }) => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          recipe_id: recipeId,
          batches
        })
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Refining failed' };
      }
    } catch (err) {
      console.error('[useStore] Refine error:', err);
      return { success: false, error: err.message };
    }
  },

  sellResource: async ({ resourceId, amount, unitPrice }) => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          resource_id: resourceId,
          amount,
          unit_price: unitPrice
        })
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Sale failed' };
      }
    } catch (err) {
      console.error('[useStore] Sell error:', err);
      return { success: false, error: err.message };
    }
  },

  outfitVessel: async ({ vesselId, modules }) => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/fleet/outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          vessel_id: vesselId,
          modules
        })
      });

      if (res.ok) {
        const data = await res.json();
        set((state) => {
          const updatedFleets = state.fleets.map((v) =>
            v.id === vesselId
              ? {
                  ...v,
                  modules,
                  extraction_rate: data.stats?.effectiveExtractionRate ?? v.extraction_rate,
                  cargo_capacity: data.stats?.effectiveCargo ?? v.cargo_capacity,
                  power_used: data.stats?.totalPowerUsed,
                  tonnage_used: data.stats?.totalTonnageUsed,
                  hazard_defense: data.stats?.effectiveHazardDefense
                }
              : v
          );
          return { fleets: updatedFleets };
        });
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Outfitting failed' };
      }
    } catch (err) {
      console.error('[useStore] Outfit error:', err);
      return { success: false, error: err.message };
    }
  },

  contributeToMegastructure: async ({ projectId, resourceId, amount }) => {
    try {
      const currentUserId = useStore.getState().currentUserId;
      const res = await fetch('/api/game/alliance/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          project_id: projectId,
          resource_id: resourceId,
          amount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local allianceData
        set((state) => {
          if (!state.allianceData) return {};
          const currentProject = state.allianceData.project;
          if (!currentProject || currentProject.id !== projectId) return {};

          const updatedProject = {
            ...currentProject,
            ...data.project,
          };
          return {
            allianceData: {
              ...state.allianceData,
              project: updatedProject,
            },
          };
        });
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Contribution failed' };
      }
    } catch (err) {
      console.error('[useStore] Megastructure contribution error:', err);
      return { success: false, error: err.message };
    }
  },

  authenticate: (userId) => set({ currentUserId: userId })
}));

export default useStore;
