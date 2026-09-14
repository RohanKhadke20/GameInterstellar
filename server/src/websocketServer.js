import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.js';
import { simulationEngine } from './simulationEngine.js';

const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * WebSocket Server Manager
 * - Manages user authentication socket mappings
 * - Streams targeted Inventory & Fleet telemetry every 5000ms
 * - Heartbeat keepalive system
 * - CSWSH Protection & Per-socket Rate Limiting
 */
export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    maxPayload: 65536, // 64KB maximum frame payload limit
    verifyClient: (info, done) => {
      const origin = info.req.headers.origin;
      // Allow connections with matching origin or direct server-to-server calls without origin header
      if (!origin || origin === ALLOWED_ORIGIN || origin === 'http://localhost:3000') {
        done(true);
      } else {
        console.warn(`[WS] Blocked unauthorized connection from origin: ${origin}`);
        done(false, 403, 'Cross-Site WebSocket Hijacking Protection: Origin Forbidden');
      }
    }
  });

  // Map of userId (number) -> Set of active WebSocket instances
  const userSockets = new Map();

  // Helper to run promisified DB queries
  const queryAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

  // 1. Register broadcast adapter with simulationEngine
  simulationEngine.setBroadcastHandler((targetUserId, payload) => {
    const data = JSON.stringify(payload);

    if (targetUserId) {
      const sockets = userSockets.get(targetUserId);
      if (sockets) {
        sockets.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      }
    } else {
      // Global broadcast
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  });

  // 2. 5000ms Dedicated Telemetry Interval Broadcast (Inventory & Fleet)
  const TELEMETRY_INTERVAL_MS = 5000;
  const telemetryInterval = setInterval(async () => {
    if (userSockets.size === 0) return;

    for (const [userId, sockets] of userSockets.entries()) {
      // Filter out non-open sockets
      const openSockets = Array.from(sockets).filter((ws) => ws.readyState === WebSocket.OPEN);
      if (openSockets.length === 0) continue;

      try {
        // Query current Inventory & Fleet for this specific user
        const [inventory, fleet] = await Promise.all([
          queryAll('SELECT resource_id, quantity FROM Inventory WHERE user_id = ?', [userId]),
          queryAll(
            `SELECT 
              f.id, f.sector_id, f.extraction_rate, f.status,
              s.coordinate_q, s.coordinate_r, s.resource_yield_multiplier, s.hazard_level
             FROM Fleet f
             LEFT JOIN Sectors s ON f.sector_id = s.id
             WHERE f.user_id = ?`,
            [userId]
          )
        ]);

        const telemetryPayload = JSON.stringify({
          type: 'TELEMETRY_SYNC',
          payload: {
            userId,
            inventory,
            fleet,
            market: Array.from(simulationEngine.marketState.values()),
            incursions: Array.from(simulationEngine.activeIncursions.values()),
            timestamp: Date.now()
          }
        });

        // Broadcast payload strictly to this authenticated user's client sockets
        openSockets.forEach((ws) => ws.send(telemetryPayload));
      } catch (err) {
        console.error(`[WS] Error broadcasting 5000ms telemetry to user ${userId}:`, err.message);
      }
    }
  }, TELEMETRY_INTERVAL_MS);

  // 3. Heartbeat / Keepalive check (30s interval)
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(telemetryInterval);
    clearInterval(heartbeatInterval);
  });

  // 4. Client Connection Lifecycle
  wss.on('connection', (ws) => {
    let currentUserId = null;
    let messageCount = 0;
    let windowStart = Date.now();
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.send(
      JSON.stringify({
        type: 'WELCOME',
        payload: {
          message: 'Connected to Astrolith Authoritative Telemetry Gateway',
          telemetryIntervalMs: TELEMETRY_INTERVAL_MS
        }
      })
    );

    ws.on('message', async (rawMessage) => {
      // Per-socket rate limiter: Maximum 10 messages per 1000ms
      const now = Date.now();
      if (now - windowStart > 1000) {
        messageCount = 0;
        windowStart = now;
      }
      messageCount += 1;
      if (messageCount > 10) {
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            message: 'Rate limit exceeded. Maximum 10 messages per second allowed.'
          })
        );
        return; // Terminate further frame processing
      }

      try {
        const message = JSON.parse(rawMessage.toString());

        // Inbound packet schema validation guard
        if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Malformed frame: packet must be a JSON object with a valid "type" string.' }));
          return;
        }

        switch (message.type) {
          case 'AUTH': {
            const userId = parseInt(message.userId, 10);
            if (!userId || isNaN(userId)) {
              return ws.send(JSON.stringify({ type: 'ERROR', message: 'Valid userId required.' }));
            }

            // Remove socket from previous user association if re-authenticating
            if (currentUserId && userSockets.has(currentUserId)) {
              userSockets.get(currentUserId).delete(ws);
            }

            currentUserId = userId;
            if (!userSockets.has(userId)) {
              userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(ws);

            // Trigger offline progression catch-up & initial sync
            await simulationEngine.authenticateUser(userId);
            break;
          }

          case 'PING': {
            ws.send(JSON.stringify({ type: 'PONG', clientTime: message.clientTime, serverTime: Date.now() }));
            break;
          }

          default: {
            console.log(`[WS] Received unhandled event: ${message.type}`);
          }
        }
      } catch (err) {
        console.error('[WS] Failed to parse client message:', err.message);
      }
    });

    ws.on('close', () => {
      if (currentUserId && userSockets.has(currentUserId)) {
        const sockets = userSockets.get(currentUserId);
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(currentUserId);
          simulationEngine.deauthenticateUser(currentUserId);
        }
        console.log(`[WS] Disconnected socket for user ${currentUserId}`);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message);
    });
  });

  return wss;
}
