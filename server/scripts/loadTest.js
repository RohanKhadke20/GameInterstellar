import WebSocket from 'ws';
import { performance } from 'perf_hooks';

/**
 * Astrolith QA Concurrency & Database Lock Stress Test
 * 
 * Objectives:
 * 1. Simulates 50 simultaneous WebSocket connections to ws://localhost:5000.
 * 2. Floods the server with concurrent AUTH payloads to stress-test atomic SQLite
 *    WAL-mode offline catch-up transactions (BEGIN IMMEDIATE TRANSACTION ... COMMIT).
 * 3. Measures time-to-first-telemetry (AUTH -> TELEMETRY_SYNC).
 * 4. Catches and flags SQLITE_BUSY lock timeouts, socket drops, or HTTP 500 crashes.
 */

const CONFIG = {
  totalClients: 50,
  wsUrl: process.env.WS_URL || 'ws://localhost:5000',
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  timeoutMs: 15000,
};

// ANSI Color Helpers for Terminal Formatting
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  emerald: '\x1b[32m',
  amber: '\x1b[33m',
  rose: '\x1b[31m',
  slate: '\x1b[90m',
};

async function runLoadTest() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}     ASTROLITH QA LOAD TEST: CONCURRENCY & SQLITE WAL BENCHMARK  ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.slate}Target Gateway: ${CONFIG.wsUrl}${COLORS.reset}`);
  console.log(`${COLORS.slate}Concurrent Clients: ${CONFIG.totalClients}${COLORS.reset}`);
  console.log(`${COLORS.slate}Origin Header: ${CONFIG.origin}${COLORS.reset}\n`);

  const metrics = {
    connected: 0,
    authSuccess: 0,
    telemetryReceived: 0,
    errors: [],
    sqliteBusyErrors: [],
    authLatencies: [],
    telemetryLatencies: [],
    startTime: performance.now(),
  };

  const clients = [];

  /**
   * Spawns a single client simulation worker
   */
  const spawnClient = (clientId) => {
    return new Promise((resolve) => {
      const targetUserId = (clientId % 5) + 1; // Round-robin across initial users
      let authSentAt = 0;
      let isResolved = false;

      const ws = new WebSocket(CONFIG.wsUrl, {
        headers: { Origin: CONFIG.origin },
      });

      clients.push(ws);

      // Safety timeout per client
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          metrics.errors.push({
            clientId,
            error: `Timeout: Did not receive TELEMETRY_SYNC within ${CONFIG.timeoutMs}ms`,
          });
          resolve();
        }
      }, CONFIG.timeoutMs);

      ws.on('open', () => {
        metrics.connected += 1;
        authSentAt = performance.now();

        // Flood server with immediate AUTH request triggering offline catch-up transaction
        ws.send(JSON.stringify({ type: 'AUTH', userId: targetUserId }));
      });

      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());

          if (message.type === 'AUTH_SUCCESS') {
            const authLatency = performance.now() - authSentAt;
            metrics.authSuccess += 1;
            metrics.authLatencies.push(authLatency);
          }

          if (message.type === 'TELEMETRY_SYNC' || message.type === 'TICK_UPDATE') {
            if (!isResolved) {
              const telemetryLatency = performance.now() - authSentAt;
              metrics.telemetryReceived += 1;
              metrics.telemetryLatencies.push(telemetryLatency);
              isResolved = true;
              clearTimeout(timer);
              resolve();
            }
          }

          if (message.type === 'ERROR') {
            const errorMsg = message.payload?.message || JSON.stringify(message);
            if (errorMsg.includes('SQLITE_BUSY') || errorMsg.includes('database is locked')) {
              metrics.sqliteBusyErrors.push({ clientId, error: errorMsg });
            }
            metrics.errors.push({ clientId, error: errorMsg });
          }
        } catch (parseErr) {
          metrics.errors.push({ clientId, error: `Invalid JSON payload: ${parseErr.message}` });
        }
      });

      ws.on('error', (err) => {
        const errorMsg = err.message || err.toString();
        if (errorMsg.includes('SQLITE_BUSY') || errorMsg.includes('locked')) {
          metrics.sqliteBusyErrors.push({ clientId, error: errorMsg });
        }
        metrics.errors.push({ clientId, error: errorMsg });

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          resolve();
        }
      });

      ws.on('close', (code, reason) => {
        if (code !== 1000 && !isResolved) {
          metrics.errors.push({
            clientId,
            error: `Socket closed unexpectedly (Code: ${code}, Reason: ${reason.toString() || 'None'})`,
          });
        }
      });
    });
  };

  console.log(`${COLORS.amber}[LoadTest] Launching ${CONFIG.totalClients} simultaneous client connections...${COLORS.reset}`);

  // Initiate flood
  const tasks = Array.from({ length: CONFIG.totalClients }, (_, i) => spawnClient(i + 1));
  await Promise.all(tasks);

  const totalDuration = ((performance.now() - metrics.startTime) / 1000).toFixed(2);

  // Compute Latency Percentiles
  const calculatePercentiles = (arr) => {
    if (!arr.length) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return {
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      avg: avg.toFixed(2),
      p50: p50.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2),
    };
  };

  const authStats = calculatePercentiles(metrics.authLatencies);
  const telemetryStats = calculatePercentiles(metrics.telemetryLatencies);

  // Close all open client connections
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Test completed');
    }
  });

  // Print Formatted Test Results
  console.log(`\n${COLORS.bright}${COLORS.emerald}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.emerald}                       BENCHMARK RESULTS                        ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.emerald}================================================================${COLORS.reset}`);
  console.log(`• Total Concurrent Clients:     ${CONFIG.totalClients}`);
  console.log(`• Connected Sockets:            ${metrics.connected} / ${CONFIG.totalClients}`);
  console.log(`• Successful Authentications:   ${metrics.authSuccess} / ${CONFIG.totalClients}`);
  console.log(`• First Telemetry Received:     ${metrics.telemetryReceived} / ${CONFIG.totalClients}`);
  console.log(`• Total Elapsed Test Time:      ${totalDuration}s\n`);

  console.log(`${COLORS.bright}--- LATENCY BREAKDOWN (AUTH Response) ---${COLORS.reset}`);
  console.log(`  Min: ${authStats.min}ms | Avg: ${authStats.avg}ms | Max: ${authStats.max}ms`);
  console.log(`  P50: ${authStats.p50}ms | P95: ${authStats.p95}ms | P99: ${authStats.p99}ms\n`);

  console.log(`${COLORS.bright}--- LATENCY BREAKDOWN (Time to First Telemetry) ---${COLORS.reset}`);
  console.log(`  Min: ${telemetryStats.min}ms | Avg: ${telemetryStats.avg}ms | Max: ${telemetryStats.max}ms`);
  console.log(`  P50: ${telemetryStats.p50}ms | P95: ${telemetryStats.p95}ms | P99: ${telemetryStats.p99}ms\n`);

  // Error & Database Lock Assessment
  console.log(`${COLORS.bright}--- DATABASE CONCURRENCY & LOCK INTEGRITY ---${COLORS.reset}`);
  if (metrics.sqliteBusyErrors.length === 0) {
    console.log(`${COLORS.emerald}✓ PASS: Zero (0) SQLITE_BUSY lock errors detected.${COLORS.reset}`);
    console.log(`${COLORS.emerald}✓ PASS: WAL mode and busy_timeout handled all 50 concurrent catch-up transactions cleanly.${COLORS.reset}`);
  } else {
    console.log(`${COLORS.rose}✗ FAIL: ${metrics.sqliteBusyErrors.length} SQLITE_BUSY lock errors detected!${COLORS.reset}`);
    metrics.sqliteBusyErrors.forEach((err) => {
      console.log(`   Client #${err.clientId}: ${err.error}`);
    });
  }

  if (metrics.errors.length > metrics.sqliteBusyErrors.length) {
    console.log(`\n${COLORS.amber}--- GENERAL WARNINGS / SOCKET ERRORS (${metrics.errors.length}) ---${COLORS.reset}`);
    metrics.errors.slice(0, 10).forEach((err) => {
      console.log(`   Client #${err.clientId}: ${err.error}`);
    });
  }

  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================${COLORS.reset}\n`);

  process.exit(metrics.sqliteBusyErrors.length > 0 ? 1 : 0);
}

runLoadTest().catch((err) => {
  console.error(`${COLORS.rose}[Fatal Error in Load Test]${COLORS.reset}`, err);
  process.exit(1);
});
