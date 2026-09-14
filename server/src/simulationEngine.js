import { db } from './db.js';

/**
 * Astrolith Modular Vessel Components Catalog
 */
export const MODULE_CATALOG = {
  mod_extractor_mk1: {
    id: 'mod_extractor_mk1',
    name: 'Mining Laser Mk-I',
    category: 'extractor',
    power: 15,
    tonnage: 8,
    bonusExtraction: 1.5,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 400,
    icon: '⚡',
    description: 'Focused optical cutter providing +1.5 T/s base extraction yield.',
  },
  mod_extractor_mk2: {
    id: 'mod_extractor_mk2',
    name: 'Sub-Surface Bore Mk-II',
    category: 'extractor',
    power: 30,
    tonnage: 15,
    bonusExtraction: 3.2,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 950,
    icon: '🌋',
    description: 'Pneumatic rotary drill head offering +3.2 T/s high-yield extraction.',
  },
  mod_extractor_mk3: {
    id: 'mod_extractor_mk3',
    name: 'Plasma Siphon Mk-III',
    category: 'extractor',
    power: 50,
    tonnage: 22,
    bonusExtraction: 6.0,
    bonusCargo: 0,
    hazardReduction: 0,
    costCredits: 2200,
    icon: '☄️',
    description: 'High-energy plasma ionization beam delivering +6.0 T/s extraction yield.',
  },
  mod_cargo_small: {
    id: 'mod_cargo_small',
    name: 'Modular Silo Mk-I',
    category: 'cargo',
    power: 5,
    tonnage: 12,
    bonusExtraction: 0,
    bonusCargo: 3000,
    hazardReduction: 0,
    costCredits: 350,
    icon: '📦',
    description: 'Expanded magnetic hold adding +3,000 T resource storage capacity.',
  },
  mod_cargo_medium: {
    id: 'mod_cargo_medium',
    name: 'Expanded Hold Mk-II',
    category: 'cargo',
    power: 10,
    tonnage: 20,
    bonusExtraction: 0,
    bonusCargo: 8000,
    hazardReduction: 0,
    costCredits: 850,
    icon: '🏗️',
    description: 'Reinforced pressurized silo adding +8,000 T heavy resource hold.',
  },
  mod_armor_titanium: {
    id: 'mod_armor_titanium',
    name: 'Titanium Plating Mk-I',
    category: 'plating',
    power: 0,
    tonnage: 10,
    bonusExtraction: 0,
    bonusCargo: 0,
    hazardReduction: 0.25,
    costCredits: 500,
    icon: '🛡️',
    description: 'Hardened composite plating mitigating 25% of environmental hazard debuffs.',
  },
  mod_shield_composite: {
    id: 'mod_shield_composite',
    name: 'Composite Shield Matrix',
    category: 'plating',
    power: 25,
    tonnage: 6,
    bonusExtraction: 0,
    bonusCargo: 0,
    hazardReduction: 0.45,
    costCredits: 1200,
    icon: '🔮',
    description: 'Electromagnetic deflector barrier absorbing 45% of localized solar/storm debuffs.',
  },
};

/**
 * Dynamically computes vessel stats summing base hull parameters and equipped module modifiers.
 */
export function calculateVesselStats(fleet) {
  const baseExtraction = fleet.base_extraction_rate !== undefined ? fleet.base_extraction_rate : (fleet.extraction_rate || 2.0);
  const baseTransitSpeed = fleet.transit_speed || 1.0;
  const baseCargo = fleet.cargo_capacity || 10000.0;
  const maxPower = fleet.max_power || 100;
  const maxTonnage = fleet.max_tonnage || 50;

  let equippedModules = [];
  if (Array.isArray(fleet.modules)) {
    equippedModules = fleet.modules;
  } else if (typeof fleet.modules === 'string') {
    try {
      equippedModules = JSON.parse(fleet.modules) || [];
    } catch {
      equippedModules = [];
    }
  }

  let totalExtractionBonus = 0;
  let totalCargoBonus = 0;
  let totalHazardReduction = 0;
  let totalPowerUsed = 0;
  let totalTonnageUsed = 0;

  for (const modId of equippedModules) {
    const mod = MODULE_CATALOG[modId] || (typeof modId === 'object' ? modId : null);
    if (mod) {
      totalExtractionBonus += (mod.bonusExtraction || 0);
      totalCargoBonus += (mod.bonusCargo || 0);
      totalHazardReduction += (mod.hazardReduction || 0);
      totalPowerUsed += (mod.power || 0);
      totalTonnageUsed += (mod.tonnage || 0);
    }
  }

  const effectiveExtractionRate = +(baseExtraction + totalExtractionBonus).toFixed(2);
  const effectiveCargo = baseCargo + totalCargoBonus;
  const effectiveHazardDefense = Math.min(0.85, totalHazardReduction);

  return {
    baseExtractionRate: baseExtraction,
    effectiveExtractionRate,
    effectiveTransitSpeed: baseTransitSpeed,
    effectiveCargo,
    effectiveHazardDefense,
    maxPower,
    maxTonnage,
    totalPowerUsed,
    totalTonnageUsed,
    modules: equippedModules,
  };
}

/**
 * Astrolith Core Simulation Engine (Singleton)
 * Handles real-time system ticks (1000ms), offline progression resolution,
 * atomic SQLite batch transactions, and WebSocket state broadcasts.
 */
class SimulationEngine {
  constructor() {
    if (SimulationEngine.instance) {
      return SimulationEngine.instance;
    }

    this.tickIntervalMs = 1000;
    this.intervalId = null;
    this.isRunning = false;
    this.isProcessingTick = false;

    // Set of authenticated, currently active user IDs
    this.activeUserIds = new Set();

    // Dynamic Hazard Events System (Day 4)
    this.activeHazards = new Map(); // sectorId -> hazard object
    this.hazardIntervalSeconds = 60; // Trigger hazard check every 60 seconds
    this.hazardDurationSeconds = 30; // Active hazard duration (30s)
    this.tickCount = 0;

    // Event-Driven AI Faction Incursion System (Day 6)
    this.activeIncursions = new Map(); // sectorId -> incursion object
    this.sectorExtractionVolume = new Map(); // sectorId -> cumulative extraction volume
    this.incursionThreshold = 20.0; // Extraction volume threshold to trigger hostile incursion
    this.incursionDurationSeconds = 35; // Active incursion duration

    // Dynamic Market Economy System (Day 5)
    this.marketState = new Map(); // resource_id -> market commodity object
    this.marketIntervalTicks = 5; // Fluctuate prices every 5 seconds

    // Broadcast callback registered by WebSocket server
    this.broadcastHandler = null;

    SimulationEngine.instance = this;
  }

  /**
   * Retrieves the singleton instance.
   * @returns {SimulationEngine}
   */
  static getInstance() {
    if (!SimulationEngine.instance) {
      SimulationEngine.instance = new SimulationEngine();
    }
    return SimulationEngine.instance;
  }

  /**
   * Registers a WebSocket broadcast function.
   * @param {Function} handler - fn(userId, message)
   */
  setBroadcastHandler(handler) {
    this.broadcastHandler = typeof handler === 'function' ? handler : null;
  }

  /**
   * Starts the 1000ms simulation loop.
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => this.processSystemTick(), this.tickIntervalMs);
    console.log(`[SimulationEngine] Started system tick loop (${this.tickIntervalMs}ms).`);
  }

  /**
   * Stops the simulation loop.
   */
  stop() {
    if (!this.isRunning) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    console.log('[SimulationEngine] Stopped system tick loop.');
  }

  /**
   * Helper: Promisified DB query execution.
   */
  _queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  _queryGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  _queryRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Handles user authentication and resolves offline tick catch-up in a single atomic transaction.
   * @param {number} userId - The authenticated user's ID.
   * @returns {Promise<Object>} Full aggregated user state after catch-up.
   */
  async authenticateUser(userId) {
    const now = Math.floor(Date.now() / 1000);

    // 1. Fetch user record
    const user = await this._queryGet('SELECT * FROM Users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const lastTick = user.last_tick_timestamp || now;
    const elapsedSeconds = Math.max(0, now - lastTick);

    // 2. Fetch user's active mining fleet and sector multipliers
    const miningFleets = await this._queryAll(
      `SELECT 
        f.*,
        COALESCE(s.resource_yield_multiplier, 1.0) AS multiplier
      FROM Fleet f
      LEFT JOIN Sectors s ON f.sector_id = s.id
      WHERE f.user_id = ? AND f.status = 'mining'`,
      [userId]
    );

    // 3. Calculate catch-up resource accumulation dynamically based on modular stats
    let batchMinedQuantity = 0;
    for (const fleet of miningFleets) {
      const stats = calculateVesselStats(fleet);
      batchMinedQuantity += stats.effectiveExtractionRate * fleet.multiplier * elapsedSeconds;
    }

    // 4. Execute atomic catch-up batch transaction
    if (elapsedSeconds > 0) {
      await this._queryRun('BEGIN IMMEDIATE TRANSACTION');
      try {
        if (batchMinedQuantity > 0) {
          await this._queryRun(
            `INSERT INTO Inventory (user_id, resource_id, quantity)
             VALUES (?, 'ore_ferrite', ?)
             ON CONFLICT(user_id, resource_id) 
             DO UPDATE SET quantity = quantity + excluded.quantity`,
            [userId, batchMinedQuantity]
          );
        }

        // Update user's last tick timestamp
        await this._queryRun('UPDATE Users SET last_tick_timestamp = ? WHERE id = ?', [
          now,
          userId
        ]);

        await this._queryRun('COMMIT');
      } catch (txError) {
        await this._queryRun('ROLLBACK');
        throw new Error(`Offline tick transaction failed: ${txError.message}`);
      }
    }

    // 5. Track user in memory for real-time ticks
    this.activeUserIds.add(userId);

    // 6. Fetch complete fresh state
    const fullState = await this.getUserState(userId);

    // 7. Broadcast initial authenticated state via WebSocket
    this.broadcastToClient(userId, {
      type: 'AUTH_SUCCESS',
      payload: {
        ...fullState,
        activeHazards: Array.from(this.activeHazards.values()),
        offlineCatchUp: {
          elapsedSeconds,
          minedQuantity: batchMinedQuantity
        }
      }
    });

    return fullState;
  }

  /**
   * Initializes the dynamic market pricing table and seeds default commodities.
   */
  async initMarket() {
    const DEFAULT_COMMODITIES = [
      { resource_id: 'ore_ferrite', name: 'Ferrite Ore', base_price: 10.0 },
      { resource_id: 'res_silicates', name: 'Silicates', base_price: 15.0 },
      { resource_id: 'res_titanium', name: 'Titanium', base_price: 35.0 },
      { resource_id: 'res_xenon', name: 'Xenon Gas', base_price: 50.0 },
      { resource_id: 'res_isotopes', name: 'Isotope-238', base_price: 120.0 },
      { resource_id: 'res_alloy_plating', name: 'Alloy Plating', base_price: 280.0 },
      { resource_id: 'res_fuel_cells', name: 'Fuel Cells', base_price: 320.0 },
    ];

    try {
      const rows = await this._queryAll('SELECT * FROM Market');
      if (rows.length === 0) {
        const now = Math.floor(Date.now() / 1000);
        for (const item of DEFAULT_COMMODITIES) {
          await this._queryRun(
            `INSERT INTO Market (resource_id, name, base_price, current_price, previous_price, trend, volume_sold, last_updated)
             VALUES (?, ?, ?, ?, ?, 0.0, 0.0, ?)`,
            [item.resource_id, item.name, item.base_price, item.base_price, item.base_price, now]
          );
          this.marketState.set(item.resource_id, {
            resource_id: item.resource_id,
            name: item.name,
            base_price: item.base_price,
            current_price: item.base_price,
            previous_price: item.base_price,
            trend: 0.0,
            volume_sold: 0.0,
            last_updated: now,
          });
        }
        console.log('[Market] Dynamic market initialized with 7 commodities.');
      } else {
        for (const row of rows) {
          this.marketState.set(row.resource_id, { ...row });
        }
        console.log(`[Market] Loaded ${rows.length} dynamic market commodity prices from SQLite.`);
      }
    } catch (err) {
      console.error('[Market] Error initializing market:', err.message);
    }
  }

  /**
   * Price Fluctuation Algorithm (Day 5 Dynamic Economy)
   * - Evaluated every 5 seconds.
   * - Applies mean-reversion pull toward base price.
   * - Incorporates random market noise / volatility.
   * - Slowly dissipates excess supply pressure from previous bulk sales.
   * - Calculates trend indicators (+/- %).
   */
  async updateDynamicMarket(now) {
    if (this.marketState.size === 0) {
      await this.initMarket();
    }

    if (this.tickCount % this.marketIntervalTicks !== 0) {
      return;
    }

    let hasChanged = false;

    for (const [resId, item] of this.marketState.entries()) {
      // 1. Mean-reversion pull toward base_price
      const reversionDrift = (item.base_price - item.current_price) * 0.035;

      // 2. Stochastic noise / organic trading drift (+/- 2.5% of base)
      const noise = (Math.random() - 0.49) * (item.base_price * 0.025);

      // 3. Dissipate volume sold over time
      item.volume_sold = Math.max(0, item.volume_sold * 0.92);

      // 4. Calculate new price bounded between 40% and 250% of base_price
      const rawPrice = item.current_price + reversionDrift + noise;
      const boundedPrice = Math.max(item.base_price * 0.4, Math.min(item.base_price * 2.5, rawPrice));
      const roundedPrice = +boundedPrice.toFixed(2);

      if (roundedPrice !== item.current_price) {
        const trend = +(((roundedPrice - item.previous_price) / item.previous_price) * 100).toFixed(2);
        item.previous_price = item.current_price;
        item.current_price = roundedPrice;
        item.trend = trend;
        item.last_updated = now;
        hasChanged = true;

        await this._queryRun(
          `UPDATE Market 
           SET current_price = ?, previous_price = ?, trend = ?, volume_sold = ?, last_updated = ?
           WHERE resource_id = ?`,
          [item.current_price, item.previous_price, item.trend, item.volume_sold, now, resId]
        );
      }
    }

    if (hasChanged) {
      this.broadcastToClient(null, {
        type: 'MARKET_SYNC',
        payload: Array.from(this.marketState.values())
      });
    }
  }

  /**
   * Adjusts price down when bulk sales occur (supply shock)
   */
  async recordMarketSale(resourceId, amountSold) {
    const item = this.marketState.get(resourceId);
    if (!item) return;

    const now = Math.floor(Date.now() / 1000);
    const priceDrop = (amountSold / 100) * (item.base_price * 0.06);
    const newPrice = Math.max(item.base_price * 0.35, +(item.current_price - priceDrop).toFixed(2));

    item.previous_price = item.current_price;
    item.current_price = newPrice;
    item.volume_sold += amountSold;
    item.trend = +(((item.current_price - item.previous_price) / item.previous_price) * 100).toFixed(2);
    item.last_updated = now;

    await this._queryRun(
      `UPDATE Market 
       SET current_price = ?, previous_price = ?, trend = ?, volume_sold = ?, last_updated = ?
       WHERE resource_id = ?`,
      [item.current_price, item.previous_price, item.trend, item.volume_sold, now, resourceId]
    );

    this.broadcastToClient(null, {
      type: 'MARKET_SYNC',
      payload: Array.from(this.marketState.values())
    });
  }

  /**
   * Adjusts price up when raw resources are consumed by refining (demand shock)
   */
  async recordRefineryDemand(inputs) {
    const now = Math.floor(Date.now() / 1000);
    let changed = false;

    for (const inp of inputs) {
      const item = this.marketState.get(inp.id);
      if (item) {
        const priceBump = (inp.qty / 100) * (item.base_price * 0.04);
        const newPrice = Math.min(item.base_price * 2.5, +(item.current_price + priceBump).toFixed(2));
        item.previous_price = item.current_price;
        item.current_price = newPrice;
        item.trend = +(((item.current_price - item.previous_price) / item.previous_price) * 100).toFixed(2);
        item.last_updated = now;
        changed = true;

        await this._queryRun(
          `UPDATE Market SET current_price = ?, previous_price = ?, trend = ?, last_updated = ? WHERE resource_id = ?`,
          [item.current_price, item.previous_price, item.trend, now, inp.id]
        );
      }
    }

    if (changed) {
      this.broadcastToClient(null, {
        type: 'MARKET_SYNC',
        payload: Array.from(this.marketState.values())
      });
    }
  }

  /**
   * Manages Event-Driven AI Faction Incursions:
   * 1. Checks and cleans up expired incursions, broadcasting INCURSION_ENDED.
   * 2. Checks sectors where cumulative extraction volume exceeds threshold, spawning hostile AI entities.
   * 3. Broadcasts INCURSION_SPAWNED alerts via WebSocket pipeline.
   */
  async updateDynamicIncursions(now) {
    // 1. Process Expired Incursions
    for (const [sectorId, incursion] of this.activeIncursions.entries()) {
      if (now >= incursion.expiresAt) {
        this.activeIncursions.delete(sectorId);
        console.log(`[AI Incursion] Hostile incursion by ${incursion.factionName} ended in Sector #${sectorId}.`);

        this.broadcastToClient(null, {
          type: 'INCURSION_ENDED',
          payload: {
            sectorId,
            factionName: incursion.factionName,
            endedAt: now,
            message: `Sector #${sectorId} secured. Hostile ${incursion.factionName} forces repelled.`,
          },
        });
      }
    }

    // 2. Check for Extraction Volume Trigger (volume > incursionThreshold)
    for (const [sectorId, volume] of this.sectorExtractionVolume.entries()) {
      if (volume >= this.incursionThreshold && !this.activeIncursions.has(sectorId)) {
        const incursion = {
          id: `incursion_${sectorId}_${now}`,
          sectorId,
          factionName: 'Krynn Syndicate Marauders',
          shipClass: 'Krynn Void-Reaper',
          hostileCount: 2,
          attackDps: 6.5,
          debuffMultiplier: 0.60, // 40% extraction penalty
          duration: this.incursionDurationSeconds,
          expiresAt: now + this.incursionDurationSeconds,
          status: 'hostile',
        };

        this.activeIncursions.set(sectorId, incursion);
        this.sectorExtractionVolume.set(sectorId, 0); // Reset volume counter
        console.log(`[AI Incursion] Hostile Incursion TRIGGERED in Sector #${sectorId} by ${incursion.factionName}!`);

        this.broadcastToClient(null, {
          type: 'INCURSION_SPAWNED',
          payload: incursion,
        });
      }
    }
  }

  /**
   * Manages Temporary Probe-Discovered Sectors Lifecycle:
   * 1. Checks for expired sectors where now >= sector.expires_at.
   * 2. If a user fleet is still inside the expiring sector, calculates TOTAL HULL LOSS / DESTRUCTION.
   * 3. Deletes the expired temporary sector from the Sectors table and broadcasts SECTOR_EXPIRED.
   */
  async updateTemporarySectors(now) {
    try {
      const expiredSectors = await this._queryAll(
        'SELECT * FROM Sectors WHERE is_temporary = 1 AND expires_at <= ?',
        [now]
      );

      for (const sector of expiredSectors) {
        console.log(`[Exploration] Temporary Sector #${sector.id} [${sector.coordinate_q}, ${sector.coordinate_r}] reached TTL expiration!`);

        // Check if any fleets failed to evacuate
        const trappedFleets = await this._queryAll(
          'SELECT * FROM Fleet WHERE sector_id = ?',
          [sector.id]
        );

        for (const fleet of trappedFleets) {
          console.warn(`[Exploration] FLEET DESTROYED: Vessel #${fleet.id} ("${fleet.name}") failed to evacuate Sector #${sector.id} before spacetime collapse!`);

          // Total Hull Loss / Catastrophic damage: reset to idle, detach sector, zero base extraction rate
          await this._queryRun(
            `UPDATE Fleet 
             SET sector_id = NULL, status = 'idle', extraction_rate = 0, name = name || ' [HULL COMPROMISED]'
             WHERE id = ?`,
            [fleet.id]
          );

          // Broadcast catastrophic loss alert to the owner
          this.broadcastToClient(fleet.user_id, {
            type: 'FLEET_DESTROYED',
            payload: {
              fleetId: fleet.id,
              fleetName: fleet.name,
              sectorId: sector.id,
              message: `CATASTROPHIC HULL LOSS: Vessel "${fleet.name}" was destroyed in Sector #${sector.id} spacetime collapse after failing to evacuate before TTL expiration!`,
            },
          });
        }

        // Delete the expired temporary sector
        await this._queryRun('DELETE FROM Sectors WHERE id = ?', [sector.id]);

        // Broadcast sector expiration to all connected users
        this.broadcastToClient(null, {
          type: 'SECTOR_EXPIRED',
          payload: {
            sectorId: sector.id,
            coordinate_q: sector.coordinate_q,
            coordinate_r: sector.coordinate_r,
            message: `Sector [${sector.coordinate_q}, ${sector.coordinate_r}] spacetime signature has collapsed and dissipated.`,
          },
        });
      }
    } catch (err) {
      console.error('[SimulationEngine] Error updating temporary sectors:', err.message);
    }
  }

  /**
   * Deauthenticates a user and removes them from the active tick set.
   * @param {number} userId
   */
  deauthenticateUser(userId) {
    this.activeUserIds.delete(userId);
  }

  /**
   * Manages Dynamic Hazard Events Lifecycle:
   * 1. Checks and cleans up expired hazards, broadcasting HAZARD_ENDED.
   * 2. Triggers a new random localized hazard every 60 seconds with a 30s duration, broadcasting HAZARD_STARTED.
   */
  async updateDynamicHazards(now) {
    let hazardsChanged = false;

    // 1. Process Expired Hazards
    for (const [sectorId, hazard] of this.activeHazards.entries()) {
      if (now >= hazard.expiresAt) {
        this.activeHazards.delete(sectorId);
        hazardsChanged = true;
        console.log(`[Hazard System] Hazard "${hazard.name}" ended in Sector #${sectorId}. Normal yield restored.`);

        // Broadcast Hazard End alert to all clients
        this.broadcastToClient(null, {
          type: 'HAZARD_ENDED',
          payload: {
            sectorId,
            hazardName: hazard.name,
            message: `Sector #${sectorId} hazard (${hazard.name}) cleared. Normal extraction yields restored.`,
            endedAt: now
          }
        });
      }
    }

    // 2. Periodic Hazard Trigger Loop (Every 60s)
    if (this.tickCount % this.hazardIntervalSeconds === 0) {
      const sectors = await this._queryAll('SELECT id, coordinate_q, coordinate_r, hazard_level FROM Sectors');
      if (sectors.length > 0) {
        // Pick a random sector to be affected
        const targetSector = sectors[Math.floor(Math.random() * sectors.length)];
        const sectorId = targetSector.id;

        const HAZARD_TEMPLATES = [
          {
            type: 'SOLAR_FLARE',
            name: 'Solar Flare',
            debuffMultiplier: 0.5, // 50% extraction penalty
            duration: this.hazardDurationSeconds,
            severity: 'HIGH',
            description: 'Coronal mass ejection causing severe interference with extraction laser arrays.'
          },
          {
            type: 'MICROMETEOROID_SHOWER',
            name: 'Micrometeoroid Storm',
            debuffMultiplier: 0.4, // 60% extraction penalty
            duration: this.hazardDurationSeconds,
            severity: 'CRITICAL',
            description: 'Hypervelocity debris impacts forcing mining vessels into defensive posture.'
          },
          {
            type: 'GRAVITATIONAL_ANOMALY',
            name: 'Gravitational Anomaly',
            debuffMultiplier: 1.75, // +75% bonus extraction yield!
            duration: this.hazardDurationSeconds,
            severity: 'POSITIVE',
            description: 'Spatial rift compression dramatically amplifying exotic isotope resonance extraction!'
          }
        ];

        const template = HAZARD_TEMPLATES[Math.floor(Math.random() * HAZARD_TEMPLATES.length)];
        const hazardEvent = {
          id: `haz-${sectorId}-${now}`,
          sectorId,
          coordinate_q: targetSector.coordinate_q,
          coordinate_r: targetSector.coordinate_r,
          ...template,
          startedAt: now,
          expiresAt: now + template.duration
        };

        this.activeHazards.set(sectorId, hazardEvent);
        hazardsChanged = true;
        console.log(`[Hazard System] HAZARD_STARTED: "${template.name}" in Sector #${sectorId} (${template.debuffMultiplier}x multiplier, duration ${template.duration}s).`);

        // Broadcast Hazard Start alert to all clients
        this.broadcastToClient(null, {
          type: 'HAZARD_STARTED',
          payload: {
            ...hazardEvent,
            message: `ALERT: ${template.name} detected in Sector #${sectorId}! Extraction yield modified (${template.debuffMultiplier}x) for ${template.duration}s.`
          }
        });
      }
    }

    // Broadcast authoritative state synchronization if hazards mutated
    if (hazardsChanged) {
      this.broadcastToClient(null, {
        type: 'HAZARDS_SYNC',
        payload: Array.from(this.activeHazards.values())
      });
    }
  }

  /**
   * Primary 1000ms Game Loop Tick.
   * Simulates real-time mining for all active connected users in a single atomic transaction.
   */
  async processSystemTick() {
    if (this.isProcessingTick || this.activeUserIds.size === 0) {
      return;
    }

    this.isProcessingTick = true;
    this.tickCount += 1;
    const now = Math.floor(Date.now() / 1000);
    const activeIds = Array.from(this.activeUserIds);

    try {
      // Update dynamic hazard cycles
      await this.updateDynamicHazards(now);

      // Update dynamic market pricing fluctuations
      await this.updateDynamicMarket(now);

      // Update event-driven AI hostile incursions
      await this.updateDynamicIncursions(now);

      // Update temporary probe sectors lifecycle & expiration hull loss
      await this.updateTemporarySectors(now);

      // Query active mining vessels for all currently active users
      const placeholders = activeIds.map(() => '?').join(',');
      const activeMiningFleets = await this._queryAll(
        `SELECT 
          f.*,
          COALESCE(s.resource_yield_multiplier, 1.0) AS multiplier
        FROM Fleet f
        LEFT JOIN Sectors s ON f.sector_id = s.id
        WHERE f.user_id IN (${placeholders}) AND f.status = 'mining'`,
        activeIds
      );

      // Aggregate multi-resource yields per user for 1-second tick
      const userYieldMap = new Map();
      for (const fleet of activeMiningFleets) {
        const stats = calculateVesselStats(fleet);
        const activeHazard = this.activeHazards.get(fleet.sector_id);
        const activeIncursion = this.activeIncursions.get(fleet.sector_id);
        
        let hazardMultiplier = 1.0;
        if (activeHazard) {
          const rawDebuff = 1.0 - (activeHazard.debuffMultiplier || 0.5);
          const mitigatedDebuff = rawDebuff * (1.0 - stats.effectiveHazardDefense);
          hazardMultiplier = Math.max(0.1, 1.0 - mitigatedDebuff);
        }

        let incursionMultiplier = 1.0;
        if (activeIncursion) {
          const rawIncursionDebuff = 1.0 - (activeIncursion.debuffMultiplier || 0.6);
          const mitigatedIncursion = rawIncursionDebuff * (1.0 - stats.effectiveHazardDefense);
          incursionMultiplier = Math.max(0.1, 1.0 - mitigatedIncursion);
        }

        const effectiveRate = stats.effectiveExtractionRate * hazardMultiplier * incursionMultiplier;
        const totalYield = effectiveRate * fleet.multiplier * 1.0;

        // Accumulate sector extraction volume for incursion triggering
        const currentSectorVol = this.sectorExtractionVolume.get(fleet.sector_id) || 0;
        this.sectorExtractionVolume.set(fleet.sector_id, currentSectorVol + totalYield);

        if (!userYieldMap.has(fleet.user_id)) {
          userYieldMap.set(fleet.user_id, {
            total: 0,
            ore_ferrite: 0,
            res_silicates: 0,
            res_titanium: 0,
            res_xenon: 0,
            res_isotopes: 0
          });
        }

        const userStock = userYieldMap.get(fleet.user_id);
        userStock.total += totalYield;
        userStock.ore_ferrite += totalYield * 0.45;
        userStock.res_silicates += totalYield * 0.25;
        userStock.res_titanium += totalYield * 0.15;
        userStock.res_xenon += totalYield * 0.10;
        userStock.res_isotopes += totalYield * (activeHazard?.type === 'GRAVITATIONAL_ANOMALY' ? 0.15 : 0.05);
      }

      // Execute single atomic batch transaction for inventory accumulation
      await this._queryRun('BEGIN IMMEDIATE TRANSACTION');
      try {
        for (const [userId, yields] of userYieldMap.entries()) {
          if (yields.ore_ferrite > 0) {
            await this._queryRun(
              `INSERT INTO Inventory (user_id, resource_id, quantity)
               VALUES (?, 'ore_ferrite', ?)
               ON CONFLICT(user_id, resource_id) 
               DO UPDATE SET quantity = quantity + excluded.quantity`,
              [userId, yields.ore_ferrite]
            );
          }
          if (yields.res_silicates > 0) {
            await this._queryRun(
              `INSERT INTO Inventory (user_id, resource_id, quantity)
               VALUES (?, 'res_silicates', ?)
               ON CONFLICT(user_id, resource_id) 
               DO UPDATE SET quantity = quantity + excluded.quantity`,
              [userId, yields.res_silicates]
            );
          }
          if (yields.res_titanium > 0) {
            await this._queryRun(
              `INSERT INTO Inventory (user_id, resource_id, quantity)
               VALUES (?, 'res_titanium', ?)
               ON CONFLICT(user_id, resource_id) 
               DO UPDATE SET quantity = quantity + excluded.quantity`,
              [userId, yields.res_titanium]
            );
          }
          if (yields.res_xenon > 0) {
            await this._queryRun(
              `INSERT INTO Inventory (user_id, resource_id, quantity)
               VALUES (?, 'res_xenon', ?)
               ON CONFLICT(user_id, resource_id) 
               DO UPDATE SET quantity = quantity + excluded.quantity`,
              [userId, yields.res_xenon]
            );
          }
          if (yields.res_isotopes > 0) {
            await this._queryRun(
              `INSERT INTO Inventory (user_id, resource_id, quantity)
               VALUES (?, 'res_isotopes', ?)
               ON CONFLICT(user_id, resource_id) 
               DO UPDATE SET quantity = quantity + excluded.quantity`,
              [userId, yields.res_isotopes]
            );
          }

          // Update user last tick timestamp
          await this._queryRun('UPDATE Users SET last_tick_timestamp = ? WHERE id = ?', [
            now,
            userId
          ]);
        }

        await this._queryRun('COMMIT');
      } catch (batchErr) {
        await this._queryRun('ROLLBACK');
        console.error('[SimulationEngine] Batch tick transaction rolled back:', batchErr.message);
        return;
      }

      // Broadcast new state / tick payload to subscribers
      for (const userId of activeIds) {
        const yields = userYieldMap.get(userId) || { total: 0 };
        this.broadcastToClient(userId, {
          type: 'TICK_UPDATE',
          payload: {
            timestamp: now,
            tickDeltaOre: yields.total,
            breakdown: yields
          }
        });
      }
    } catch (err) {
      console.error('[SimulationEngine] Error processing system tick:', err);
    } finally {
      this.isProcessingTick = false;
    }
  }

  /**
   * Fetches the complete aggregated state of a user.
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getUserState(userId) {
    const user = await this._queryGet('SELECT * FROM Users WHERE id = ?', [userId]);
    const rawFleet = await this._queryAll(
      `SELECT f.*, s.coordinate_q, s.coordinate_r, s.resource_yield_multiplier, s.hazard_level
       FROM Fleet f
       LEFT JOIN Sectors s ON f.sector_id = s.id
       WHERE f.user_id = ?`,
      [userId]
    );

    const fleet = rawFleet.map((vessel) => {
      const stats = calculateVesselStats(vessel);
      return {
        ...vessel,
        modules: stats.modules,
        base_extraction_rate: stats.baseExtractionRate,
        extraction_rate: stats.effectiveExtractionRate,
        transit_speed: stats.effectiveTransitSpeed,
        cargo_capacity: stats.effectiveCargo,
        power_used: stats.totalPowerUsed,
        tonnage_used: stats.totalTonnageUsed,
        max_power: stats.maxPower,
        max_tonnage: stats.maxTonnage,
        hazard_defense: stats.effectiveHazardDefense,
      };
    });

    const inventory = await this._queryAll('SELECT * FROM Inventory WHERE user_id = ?', [userId]);
    const upgrades = await this._queryAll('SELECT upgrade_id, level FROM Upgrades WHERE user_id = ?', [userId]);
    const market = Array.from(this.marketState.values());
    const incursions = Array.from(this.activeIncursions.values());

    return { user, fleet, inventory, upgrades, market, incursions };
  }

  /**
   * Exposes an update function to broadcast custom state updates to connected clients.
   * @param {number|null} userId - Specific target user ID or null for global broadcast
   * @param {Object} message - Payload object to send
   */
  broadcastToClient(userId, message) {
    if (this.broadcastHandler) {
      this.broadcastHandler(userId, message);
    }
  }
}

// Export singleton instance and class definition
const simulationEngine = SimulationEngine.getInstance();
export { SimulationEngine, simulationEngine };
export default simulationEngine;
