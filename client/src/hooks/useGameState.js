import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../utils/audioEngine';

/**
 * Utility: Performs shallow structural comparison on lists/objects
 * to avoid unnecessary Zustand updates and React re-renders.
 */
function areListsShallowEqual(listA, listB) {
  if (!listA || !listB) return listA === listB;
  if (listA.length !== listB.length) return false;

  for (let i = 0; i < listA.length; i++) {
    const a = listA[i];
    const b = listB[i];
    if (a === b) continue;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (a[key] !== b[key]) return false;
    }
  }
  return true;
}

/**
 * Custom React Hook: useGameState
 * 
 * - Establishes and manages the authoritative WebSocket connection.
 * - Implements exponential backoff with jitter on disconnects.
 * - Updates the Zustand store selectively to prevent unnecessary React re-renders.
 * 
 * @param {number} userId - The active user's ID
 * @param {Object} options - Configuration options (endpoint, autoReconnect, etc.)
 */
export function useGameState(userId = 1, options = {}) {
  const {
    url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000`,
    baseBackoffMs = 1000,
    maxBackoffMs = 16000,
    maxRetries = 10,
    autoConnect = true
  } = options;

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  // References for socket and reconnection timers
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  // Zustand Store Selectors & Actions
  const setWsConnected = useStore((state) => state.setWsConnected);
  const addMessage = useStore((state) => state.addMessage);

  /**
   * Selectively updates the Zustand store with incoming telemetry payloads.
   * Compares incoming data with current store references to prevent re-render spikes.
   */
  const updateStoreTelemetry = useCallback((payload) => {
    const { inventory: incomingInventory, fleet: incomingFleet, timestamp } = payload;
    const currentState = useStore.getState();

    const updates = {};
    let hasChanges = false;

    // 1. Selective Inventory Update
    if (incomingInventory && !areListsShallowEqual(currentState.inventory, incomingInventory)) {
      updates.inventory = incomingInventory;
      hasChanges = true;
    }

    // 2. Selective Fleet Update
    if (incomingFleet && !areListsShallowEqual(currentState.fleets, incomingFleet)) {
      updates.fleets = incomingFleet;

      // Recalculate mining velocity only when fleets change
      const totalRate = incomingFleet
        .filter((f) => f.status === 'mining')
        .reduce((sum, f) => sum + f.extraction_rate * (f.resource_yield_multiplier || 1.0), 0);

      updates.totalOreMinedRate = totalRate;
      hasChanges = true;
    }

    // 3. Selective Market Update
    if (payload.market && !areListsShallowEqual(currentState.market, payload.market)) {
      updates.market = payload.market;
      hasChanges = true;
    }

    if (timestamp) {
      updates.lastTickTimestamp = timestamp;
      setLastSyncTimestamp(timestamp);
      hasChanges = true;
    }

    // Apply batched changes to Zustand if any slice mutated
    if (hasChanges) {
      useStore.setState(updates);
    }
  }, []);

  /**
   * Connects to the WebSocket gateway.
   */
  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setConnectionStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isUnmountedRef.current) {
          socket.close();
          return;
        }

        reconnectAttemptsRef.current = 0;
        setConnectionStatus('connected');
        setWsConnected(true);

        // Start proactive client keepalive heartbeat (every 15s)
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
          }
        }, 15000);

        // Authenticate client immediately
        socket.send(JSON.stringify({ type: 'AUTH', userId }));
      };

      socket.onmessage = (event) => {
        if (isUnmountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          addMessage(data);

          switch (data.type) {
            case 'PONG': {
              if (data.clientTime) {
                const rtt = Date.now() - data.clientTime;
                setLatencyMs(rtt);
              }
              break;
            }

            case 'AUTH_SUCCESS': {
              const { user, fleet, inventory, market, incursions, offlineCatchUp } = data.payload;
              const currentState = useStore.getState();

              const offlineData =
                offlineCatchUp && (offlineCatchUp.elapsedSeconds > 0 || offlineCatchUp.minedQuantity > 0)
                  ? {
                      total: offlineCatchUp.minedQuantity || 0,
                      elapsedSeconds: offlineCatchUp.elapsedSeconds || 0,
                      silicates: +( (offlineCatchUp.minedQuantity || 0) * 0.50 ).toFixed(2),
                      metals: +( (offlineCatchUp.minedQuantity || 0) * 0.35 ).toFixed(2),
                      isotopes: +( (offlineCatchUp.minedQuantity || 0) * 0.15 ).toFixed(2),
                    }
                  : null;

              useStore.setState({
                currentUser: user,
                fleets: fleet || currentState.fleets,
                inventory: inventory || currentState.inventory,
                market: market || currentState.market,
                incursions: incursions || currentState.incursions,
                offlineGains: offlineData,
                offlineNotification: offlineData,
              });
              break;
            }

            case 'MARKET_SYNC': {
              useStore.setState({ market: data.payload || [] });
              break;
            }

            case 'TELEMETRY_SYNC': {
              // 5000ms authoritative state broadcast from server
              if (data.payload.market) {
                useStore.setState({ market: data.payload.market });
              }
              if (data.payload.incursions) {
                useStore.setState({ incursions: data.payload.incursions });
              }
              updateStoreTelemetry(data.payload);
              break;
            }

            case 'FLEET_UPDATED':
            case 'MARKET_TRANSACTION': {
              // Immediate event updates
              const { user, fleet, inventory } = data.payload;
              const currentState = useStore.getState();

              useStore.setState({
                currentUser: user || currentState.currentUser,
                fleets: fleet || currentState.fleets,
                inventory: inventory || currentState.inventory
              });
              break;
            }

            case 'TECH_UPGRADE_SUCCESS': {
              const { user, fleet, inventory } = data.payload;
              const currentState = useStore.getState();

              audioEngine.playTechUpgrade();
              useStore.setState({
                currentUser: user || currentState.currentUser,
                fleets: fleet || currentState.fleets,
                inventory: inventory || currentState.inventory
              });
              break;
            }

            case 'REFINERY_SUCCESS': {
              const { user, inventory, productName } = data.payload;
              const currentState = useStore.getState();

              audioEngine.playRefineryStart();
              useStore.setState({
                currentUser: user || currentState.currentUser,
                inventory: inventory || currentState.inventory
              });
              break;
            }

            case 'ALLIANCE_PROJECT_UPDATED': {
              const { project } = data.payload;
              const currentAllianceData = useStore.getState().allianceData;
              if (currentAllianceData && project) {
                useStore.setState({
                  allianceData: {
                    ...currentAllianceData,
                    project: {
                      ...currentAllianceData.project,
                      ...project,
                    },
                  },
                });
              } else {
                useStore.getState().fetchAllianceData();
              }
              break;
            }

            case 'HAZARDS_SYNC': {
              useStore.setState({ hazards: data.payload || [] });
              break;
            }

            case 'HAZARD_STARTED': {
              const currentHazards = useStore.getState().hazards || [];
              const exists = currentHazards.some((h) => h.id === data.payload.id);
              audioEngine.playHazardAlert();
              if (!exists) {
                useStore.setState({ hazards: [...currentHazards, data.payload] });
              }
              break;
            }

            case 'HAZARD_ENDED': {
              const currentHazards = useStore.getState().hazards || [];
              const filtered = currentHazards.filter((h) => h.sectorId !== data.payload.sectorId);
              useStore.setState({ hazards: filtered });
              break;
            }

            case 'INCURSION_SPAWNED': {
              const currentIncursions = useStore.getState().incursions || [];
              const exists = currentIncursions.some((i) => i.id === data.payload.id);
              audioEngine.playHazardAlert();
              if (!exists) {
                useStore.setState({ incursions: [...currentIncursions, data.payload] });
              }
              break;
            }

            case 'INCURSION_ENDED': {
              const currentIncursions = useStore.getState().incursions || [];
              const filtered = currentIncursions.filter((i) => i.sectorId !== data.payload.sectorId);
              useStore.setState({ incursions: filtered });
              break;
            }

            case 'SECTOR_DISCOVERED': {
              const { sector } = data.payload;
              const currentSectors = useStore.getState().sectors || [];
              const exists = currentSectors.some((s) => s.id === sector.id);
              audioEngine.playLaserFire();
              if (!exists) {
                useStore.setState({ sectors: [...currentSectors, sector] });
              }
              break;
            }

            case 'SECTOR_EXPIRED': {
              const { sectorId } = data.payload;
              const currentSectors = useStore.getState().sectors || [];
              const filtered = currentSectors.filter((s) => s.id !== sectorId);
              useStore.setState({ sectors: filtered });
              break;
            }

            case 'FLEET_DESTROYED': {
              audioEngine.playHazardAlert();
              const { fleetId } = data.payload;
              const currentFleets = useStore.getState().fleets || [];
              const updatedFleets = currentFleets.map((f) =>
                f.id === fleetId ? { ...f, status: 'idle', sector_id: null, extraction_rate: 0 } : f
              );
              useStore.setState({ fleets: updatedFleets });
              break;
            }

            case 'TICK_UPDATE': {
              // 1000ms real-time multi-resource tick delta
              const { timestamp, tickDeltaOre, breakdown } = data.payload;
              const currentInv = useStore.getState().inventory;

              if (breakdown) {
                const updated = currentInv.map((item) => {
                  const delta = breakdown[item.resource_id] || 0;
                  return delta > 0 ? { ...item, quantity: item.quantity + delta } : item;
                });
                useStore.setState({ inventory: updated, lastTickTimestamp: timestamp });
              } else if (tickDeltaOre > 0) {
                const updated = currentInv.map((item) =>
                  item.resource_id === 'ore_ferrite'
                    ? { ...item, quantity: item.quantity + tickDeltaOre }
                    : item
                );
                useStore.setState({ inventory: updated, lastTickTimestamp: timestamp });
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('[useGameState] Error processing WebSocket frame:', err);
        }
      };

      socket.onclose = () => {
        if (isUnmountedRef.current) return;

        setConnectionStatus('disconnected');
        setWsConnected(false);
        clearInterval(pingIntervalRef.current);
        wsRef.current = null;

        // Exponential backoff with jitter
        if (reconnectAttemptsRef.current < maxRetries) {
          const backoff = Math.min(
            baseBackoffMs * Math.pow(2, reconnectAttemptsRef.current),
            maxBackoffMs
          );
          const jitter = Math.random() * 300;
          const delay = backoff + jitter;

          reconnectAttemptsRef.current += 1;
          console.log(
            `[useGameState] Reconnecting in ${Math.round(delay)}ms (Attempt ${reconnectAttemptsRef.current}/${maxRetries})`
          );

          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          console.warn('[useGameState] Maximum reconnection attempts reached.');
        }
      };

      socket.onerror = (err) => {
        console.error('[useGameState] WebSocket encountered an error:', err);
      };
    } catch (err) {
      console.error('[useGameState] Failed to initialize WebSocket:', err);
    }
  }, [url, userId, baseBackoffMs, maxBackoffMs, maxRetries, setWsConnected, addMessage, updateStoreTelemetry]);

  /**
   * Safe message dispatcher.
   */
  const sendMessage = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  /**
   * Manual reconnect trigger.
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  // Lifecycle Management
  useEffect(() => {
    isUnmountedRef.current = false;

    if (autoConnect) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, autoConnect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastSyncTimestamp,
    latencyMs,
    sendMessage,
    reconnect
  };
}

export default useGameState;
