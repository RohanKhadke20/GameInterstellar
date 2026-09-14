import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, initDB } from './db.js';
import { simulationEngine, MODULE_CATALOG, calculateVesselStats } from './simulationEngine.js';
import { setupWebSocketServer } from './websocketServer.js';
import allianceRouter from './routes/alliance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:3000';

// Middlewares
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));

// Mount Alliance Routes
app.use('/api/game/alliance', allianceRouter);
app.use('/api/alliance', allianceRouter);

// Initialize SQLite database and start Simulation Engine
initDB()
  .then(async () => {
    console.log('[DB] Database tables and space mining schema initialized.');
    
    // Seed default sectors and user 1 if not existing
    db.run(
      `INSERT OR IGNORE INTO Sectors (id, coordinate_q, coordinate_r, resource_yield_multiplier, hazard_level) 
       VALUES (1, 0, 0, 1.0, 0.0), (2, 1, -1, 1.5, 0.1), (3, -2, 2, 2.2, 0.35)`
    );

    db.run(
      `INSERT OR IGNORE INTO Users (id, credits, last_tick_timestamp) 
       VALUES (1, 5000, unixepoch())`
    );

    db.run(
      `INSERT OR IGNORE INTO Fleet (id, user_id, sector_id, extraction_rate, status) 
       VALUES (1, 1, 1, 3.5, 'mining')`
    );

    db.run(
      `INSERT OR IGNORE INTO Alliances (id, name, tag, description, level) 
       VALUES (1, 'Vanguard Industrial Coalition', 'VIC', 'Galactic collective pioneering deep-space hyperlane conduits.', 1)`
    );

    db.run(
      `INSERT OR IGNORE INTO MegastructureProjects 
       (id, alliance_id, name, tier, description, required_alloys, contributed_alloys, required_fuel, contributed_fuel, perk_description, status) 
       VALUES (1, 1, 'Stellar Hyperlane Gateway [Nexus-01]', 1, 'Orbital megastructure bending spacetime to expedite galactic transit and amplify sector extraction rates.', 1000.0, 240.0, 500.0, 110.0, '+25% Base Extraction Yield & -30% Sector Transit Duration', 'in_progress')`
    );

    await simulationEngine.initMarket();
    simulationEngine.start();
  })
  .catch((err) => {
    console.error('[DB] Failed to initialize database:', err);
  });

// HTTP Routes - Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'astrolith-server',
    simulationRunning: simulationEngine.isRunning,
    activeUsersCount: simulationEngine.activeUserIds.size,
    timestamp: new Date().toISOString()
  });
});

// Game API Routes
// 1. Get complete game state for a user
app.get('/api/game/state/:userId', async (req, res) => {
  try {
    const state = await simulationEngine.getUserState(parseInt(req.params.userId, 10));
    if (!state.user) return res.status(404).json({ error: 'User not found' });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. List all sectors
app.get('/api/game/sectors', (req, res) => {
  db.all('SELECT * FROM Sectors ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ sectors: rows });
  });
});

// 3. Create or Register User
app.post('/api/game/users', (req, res) => {
  const { credits = 1000 } = req.body;
  const currentTimestamp = Math.floor(Date.now() / 1000);

  db.run(
    'INSERT INTO Users (credits, last_tick_timestamp) VALUES (?, ?)',
    [credits, currentTimestamp],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, credits, last_tick_timestamp: currentTimestamp });
    }
  );
});

// 4. Create Sector
app.post('/api/game/sectors', (req, res) => {
  const { coordinate_q, coordinate_r, resource_yield_multiplier = 1.0, hazard_level = 0.0 } = req.body;

  db.run(
    `INSERT INTO Sectors (coordinate_q, coordinate_r, resource_yield_multiplier, hazard_level)
     VALUES (?, ?, ?, ?)`,
    [coordinate_q, coordinate_r, resource_yield_multiplier, hazard_level],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        coordinate_q,
        coordinate_r,
        resource_yield_multiplier,
        hazard_level
      });
    }
  );
});

// 5. Deploy new Fleet vessel
app.post('/api/game/fleet', (req, res) => {
  const { user_id, sector_id, extraction_rate = 2.5, status = 'mining' } = req.body;

  db.run(
    `INSERT INTO Fleet (user_id, sector_id, extraction_rate, status)
     VALUES (?, ?, ?, ?)`,
    [user_id, sector_id, extraction_rate, status],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newFleet = { id: this.lastID, user_id, sector_id, extraction_rate, status };
      
      // Notify client immediately of fleet change
      const freshState = await simulationEngine.getUserState(user_id);
      simulationEngine.broadcastUpdate(user_id, {
        type: 'FLEET_UPDATED',
        payload: freshState
      });

      res.status(201).json(newFleet);
    }
  );
});

// 6. Update Fleet status or Sector assignment
app.patch('/api/game/fleet/:fleetId', (req, res) => {
  const fleetId = parseInt(req.params.fleetId, 10);
  const { status, sector_id } = req.body;

  db.get('SELECT * FROM Fleet WHERE id = ?', [fleetId], (err, fleet) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!fleet) return res.status(404).json({ error: 'Fleet vessel not found' });

    const newStatus = status || fleet.status;
    const newSectorId = sector_id !== undefined ? sector_id : fleet.sector_id;

    db.run(
      'UPDATE Fleet SET status = ?, sector_id = ? WHERE id = ?',
      [newStatus, newSectorId, fleetId],
      async (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        const freshState = await simulationEngine.getUserState(fleet.user_id);
        simulationEngine.broadcastUpdate(fleet.user_id, {
          type: 'FLEET_UPDATED',
          payload: freshState
        });

        res.json({ id: fleetId, status: newStatus, sector_id: newSectorId });
      }
    );
  });
});

// 7. Sell Resources for Credits (Atomic SQLite Transaction with TOCTOU Protection)
app.post('/api/game/sell', (req, res) => {
  const { user_id, resource_id = 'ore_ferrite', amount } = req.body;
  const sellAmount = parseFloat(amount);
  if (!user_id || isNaN(sellAmount) || sellAmount <= 0) {
    return res.status(400).json({ error: 'Invalid user_id or sell amount' });
  }

  const marketItem = simulationEngine.marketState.get(resource_id);
  const effectivePrice = marketItem ? marketItem.current_price : (parseFloat(req.body.unit_price) || 15);
  const creditsEarned = Math.floor(sellAmount * effectivePrice);

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: 'Database busy or transaction lock failure' });
      }

      db.get(
        'SELECT quantity FROM Inventory WHERE user_id = ? AND resource_id = ?',
        [user_id, resource_id],
        (err, item) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          if (!item || item.quantity < sellAmount) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient resource quantity to sell' });
          }

          db.run(
            'UPDATE Inventory SET quantity = quantity - ? WHERE user_id = ? AND resource_id = ?',
            [sellAmount, user_id, resource_id],
            (updateInvErr) => {
              if (updateInvErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: updateInvErr.message });
              }

              db.run(
                'UPDATE Users SET credits = credits + ? WHERE id = ?',
                [creditsEarned, user_id],
                (updateUserErr) => {
                  if (updateUserErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: updateUserErr.message });
                  }

                  db.run('COMMIT', async (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Transaction commit failed' });
                    }

                    try {
                      await simulationEngine.recordMarketSale(resource_id, sellAmount);
                      const freshState = await simulationEngine.getUserState(user_id);
                      simulationEngine.broadcastToClient(user_id, {
                        type: 'MARKET_TRANSACTION',
                        payload: {
                          creditsEarned,
                          soldAmount: sellAmount,
                          resourceId: resource_id,
                          unitPrice: effectivePrice,
                          ...freshState
                        }
                      });
                    } catch (broadcastErr) {
                      console.error('[Market] State broadcast error:', broadcastErr.message);
                    }

                    return res.json({ success: true, creditsEarned, soldAmount: sellAmount, unitPrice: effectivePrice });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// 8. Refinery Module: Convert raw ores into refined industrial components
app.post('/api/game/refine', (req, res) => {
  const { user_id, recipe_id, batches = 1 } = req.body;

  if (!user_id || !recipe_id) {
    return res.status(400).json({ error: 'Missing user_id or recipe_id in request payload' });
  }

  const userId = parseInt(user_id, 10);
  const count = Math.max(1, parseInt(batches, 10) || 1);

  const RECIPES = {
    refine_alloy: {
      name: 'Refined Alloy Plating',
      outputId: 'res_alloy_plating',
      outputQty: 10 * count,
      inputs: [
        { id: 'ore_ferrite', qty: 50 * count },
        { id: 'res_titanium', qty: 25 * count }
      ]
    },
    refine_fuel: {
      name: 'Stabilized Fuel Cells',
      outputId: 'res_fuel_cells',
      outputQty: 10 * count,
      inputs: [
        { id: 'res_xenon', qty: 40 * count },
        { id: 'res_isotopes', qty: 15 * count }
      ]
    }
  };

  const recipe = RECIPES[recipe_id];
  if (!recipe) {
    return res.status(400).json({ error: `Unknown refining recipe: ${recipe_id}` });
  }

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) return res.status(500).json({ error: 'Transaction start failure' });

      // Fetch user's current raw resource stockpiles
      db.all(
        'SELECT resource_id, quantity FROM Inventory WHERE user_id = ?',
        [userId],
        (invErr, rows) => {
          if (invErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: invErr.message });
          }

          const stockMap = new Map((rows || []).map((r) => [r.resource_id, r.quantity]));

          // Validate input requirements
          for (const reqItem of recipe.inputs) {
            const available = stockMap.get(reqItem.id) || 0;
            if (available < reqItem.qty) {
              db.run('ROLLBACK');
              return res.status(400).json({
                error: `Insufficient ${reqItem.id} for refining. Required: ${reqItem.qty}, Available: ${available.toFixed(1)}`
              });
            }
          }

          // Deduct inputs
          const deductNext = (idx) => {
            if (idx >= recipe.inputs.length) {
              // Add refined output product
              db.run(
                `INSERT INTO Inventory (user_id, resource_id, quantity)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id, resource_id)
                 DO UPDATE SET quantity = quantity + excluded.quantity`,
                [userId, recipe.outputId, recipe.outputQty],
                (insertErr) => {
                  if (insertErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to credit refined product' });
                  }

                  db.run('COMMIT', async (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Refining transaction commit failed' });
                    }

                    console.log(`[Refinery] Refined ${recipe.outputQty}x ${recipe.name} for User #${userId}.`);

                    try {
                      await simulationEngine.recordRefineryDemand(recipe.inputs);
                      const freshState = await simulationEngine.getUserState(userId);
                      simulationEngine.broadcastToClient(userId, {
                        type: 'REFINERY_SUCCESS',
                        payload: {
                          recipeId: recipe_id,
                          produced: recipe.outputQty,
                          productName: recipe.name,
                          ...freshState
                        }
                      });
                    } catch (err) {
                      console.error('[Refinery] Broadcast error:', err.message);
                    }

                    return res.json({
                      success: true,
                      recipeId: recipe_id,
                      producedQty: recipe.outputQty,
                      productName: recipe.name
                    });
                  });
                }
              );
              return;
            }

            const input = recipe.inputs[idx];
            db.run(
              'UPDATE Inventory SET quantity = quantity - ? WHERE user_id = ? AND resource_id = ?',
              [input.qty, userId, input.id],
              (updateErr) => {
                if (updateErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: `Failed to deduct ${input.id}` });
                }
                deductNext(idx + 1);
              }
            );
          };

          deductNext(0);
        }
      );
    });
  });
});

// 9. Get Dynamic Market Commodity Prices & Trends
app.get('/api/game/market', (req, res) => {
  res.json({ market: Array.from(simulationEngine.marketState.values()) });
});

// 10. Get Active Sector Hazards
app.get('/api/game/hazards', (req, res) => {
  res.json({ hazards: Array.from(simulationEngine.activeHazards.values()) });
});

// 11. Get Active Sector Incursions
app.get('/api/game/incursions', (req, res) => {
  res.json({ incursions: Array.from(simulationEngine.activeIncursions.values()) });
});

// 12. Deploy Exploration Deep-Space Probe (High-yield temporary sector with TTL countdown)
app.post('/api/game/probe/deploy', (req, res) => {
  const { user_id } = req.body;
  const userId = parseInt(user_id || 1, 10);
  const PROBE_CREDIT_COST = 250;
  const PROBE_TTL_SECONDS = 75;

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: `Transaction start failure: ${beginErr.message}` });
      }

      // 1. Verify credits
      db.get('SELECT credits FROM Users WHERE id = ?', [userId], (userErr, user) => {
        if (userErr || !user) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'User record not found.' });
        }

        if (user.credits < PROBE_CREDIT_COST) {
          db.run('ROLLBACK');
          return res.status(400).json({
            error: `Insufficient credits to launch deep-space probe. Cost: ₵${PROBE_CREDIT_COST} CR, Available: ₵${user.credits} CR`,
          });
        }

        // 2. Fetch existing sector coordinates to pick a unique unexplored node
        db.all('SELECT coordinate_q, coordinate_r FROM Sectors', [], (secErr, existingSectors) => {
          if (secErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: secErr.message });
          }

          const existingCoordSet = new Set(existingSectors.map((s) => `${s.coordinate_q}:${s.coordinate_r}`));

          // Generate random candidate coordinates within [-3, 3]
          let q = 0, r = 0, attempts = 0;
          do {
            q = Math.floor(Math.random() * 7) - 3;
            r = Math.floor(Math.random() * 7) - 3;
            attempts++;
          } while (existingCoordSet.has(`${q}:${r}`) && attempts < 50);

          if (attempts >= 50) {
            q = Math.floor(Math.random() * 11) - 5;
            r = Math.floor(Math.random() * 11) - 5;
          }

          const now = Math.floor(Date.now() / 1000);
          const expiresAt = now + PROBE_TTL_SECONDS;
          const yieldMultiplier = +(3.5 + Math.random() * 2.0).toFixed(2); // High yield 3.5x - 5.5x
          const hazardLevel = +(0.3 + Math.random() * 0.4).toFixed(2);
          const sectorName = `Anomalous Cluster [P-${Math.floor(100 + Math.random() * 900)}]`;

          // 3. Deduct credits
          db.run(
            'UPDATE Users SET credits = credits - ? WHERE id = ?',
            [PROBE_CREDIT_COST, userId],
            (deductErr) => {
              if (deductErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to deduct probe launch credits.' });
              }

              // 4. Insert temporary high-yield sector
              db.run(
                `INSERT INTO Sectors (coordinate_q, coordinate_r, resource_yield_multiplier, hazard_level, is_temporary, expires_at, name)
                 VALUES (?, ?, ?, ?, 1, ?, ?)`,
                [q, r, yieldMultiplier, hazardLevel, expiresAt, sectorName],
                function (insertErr) {
                  if (insertErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: `Failed to insert temporary sector: ${insertErr.message}` });
                  }

                  const newSectorId = this.lastID;

                  db.run('COMMIT', async (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Commit failed.' });
                    }

                    const newSector = {
                      id: newSectorId,
                      name: sectorName,
                      coordinate_q: q,
                      coordinate_r: r,
                      resource_yield_multiplier: yieldMultiplier,
                      hazard_level: hazardLevel,
                      is_temporary: 1,
                      expires_at: expiresAt,
                      ttl: PROBE_TTL_SECONDS,
                    };

                    console.log(`[Probe] User #${userId} deployed deep-space probe. Discovered ${sectorName} at (${q}, ${r}) with ${yieldMultiplier}x yield!`);

                    // Broadcast instant discovery event with countdown timer
                    simulationEngine.broadcastToClient(null, {
                      type: 'SECTOR_DISCOVERED',
                      payload: {
                        discoveredBy: userId,
                        sector: newSector,
                        expiresAt,
                        ttl: PROBE_TTL_SECONDS,
                      },
                    });

                    // Sync user credits state
                    try {
                      const freshState = await simulationEngine.getUserState(userId);
                      simulationEngine.broadcastToClient(userId, {
                        type: 'TELEMETRY_SYNC',
                        payload: {
                          userId,
                          ...freshState,
                          timestamp: Date.now(),
                        },
                      });
                    } catch (e) {
                      console.error('[Probe] State sync error:', e.message);
                    }

                    return res.json({
                      success: true,
                      sector: newSector,
                      expiresAt,
                      ttl: PROBE_TTL_SECONDS,
                      creditsRemaining: user.credits - PROBE_CREDIT_COST,
                    });
                  });
                }
              );
            }
          );
        });
      });
    });
  });
});

// 9. Technological Upgrades (Tech Tree with SQLite Upgrades Table & Atomic Transactions)
app.post('/api/game/upgrade', (req, res) => {
  const { user_id, upgrade_id, tier, cost_credits, cost_resource_id, cost_resource_amount } = req.body;

  if (!user_id || !upgrade_id) {
    return res.status(400).json({ error: 'Missing user_id or upgrade_id in request payload' });
  }

  const userId = parseInt(user_id, 10);
  const creditsCost = Math.max(0, parseInt(cost_credits, 10) || 0);
  const resourceId = cost_resource_id || (upgrade_id === 'extraction_laser_focus' ? 'res_isotopes' : 'res_metals');
  const resAmount = Math.max(0, parseFloat(cost_resource_amount) || 0);

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: `Transaction start failure: ${beginErr.message}` });
      }

      // 1. Fetch current upgrade level
      db.get(
        'SELECT level FROM Upgrades WHERE user_id = ? AND upgrade_id = ?',
        [userId, upgrade_id],
        (lvlErr, currentUpgrade) => {
          if (lvlErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: lvlErr.message });
          }

          const currentLevel = currentUpgrade ? currentUpgrade.level : 0;
          const targetLevel = tier ? parseInt(tier, 10) : currentLevel + 1;

          // 2. Validate User Credits
          db.get('SELECT credits FROM Users WHERE id = ?', [userId], (userErr, user) => {
            if (userErr || !user) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'User record not found' });
            }

            if (user.credits < creditsCost) {
              db.run('ROLLBACK');
              return res.status(400).json({
                error: `Insufficient credits. Required: ${creditsCost}, Available: ${user.credits}`
              });
            }

            // 3. Helper: Deduct credits, update Upgrades table, and commit
            const applyUpgradeCommit = () => {
              db.run(
                'UPDATE Users SET credits = credits - ? WHERE id = ?',
                [creditsCost, userId],
                (deductCredErr) => {
                  if (deductCredErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to deduct credits' });
                  }

                  // Record technological upgrade level
                  db.run(
                    `INSERT INTO Upgrades (user_id, upgrade_id, level)
                     VALUES (?, ?, ?)
                     ON CONFLICT(user_id, upgrade_id)
                     DO UPDATE SET level = excluded.level`,
                    [userId, upgrade_id, targetLevel],
                    (upgradeErr) => {
                      if (upgradeErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to record upgrade in database' });
                      }

                      // Apply mechanical benefits to fleet if upgrading extraction yield
                      if (upgrade_id === 'drill_yield' || upgrade_id === 'extraction_laser_focus') {
                        db.run(
                          'UPDATE Fleet SET extraction_rate = extraction_rate * 1.25 WHERE user_id = ?',
                          [userId]
                        );
                      }

                      // Commit transaction
                      db.run('COMMIT', async (commitErr) => {
                        if (commitErr) {
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Upgrade transaction commit failed' });
                        }

                        console.log(`[TechTree] Upgraded "${upgrade_id}" to Level ${targetLevel} for User #${userId}.`);

                        // 4. Instant Telemetry Sync via WebSocket Engine
                        try {
                          const freshState = await simulationEngine.getUserState(userId);
                          simulationEngine.broadcastToClient(userId, {
                            type: 'TECH_UPGRADE_SUCCESS',
                            payload: {
                              upgradeId: upgrade_id,
                              level: targetLevel,
                              tier: targetLevel,
                              ...freshState
                            }
                          });

                          return res.json({
                            success: true,
                            upgrade_id,
                            level: targetLevel,
                            tier: targetLevel,
                            user: freshState.user,
                            inventory: freshState.inventory,
                            upgrades: freshState.upgrades
                          });
                        } catch (broadcastErr) {
                          console.error('[TechTree] Telemetry broadcast error:', broadcastErr.message);
                          return res.json({ success: true, upgrade_id, level: targetLevel });
                        }
                      });
                    }
                  );
                }
              );
            };

            // 4. Validate and deduct mineral inventory if applicable
            if (resAmount > 0) {
              db.get(
                'SELECT quantity FROM Inventory WHERE user_id = ? AND resource_id = ?',
                [userId, resourceId],
                (invErr, invItem) => {
                  if (invErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: invErr.message });
                  }

                  const currentQty = invItem ? invItem.quantity : 0;
                  if (currentQty < resAmount) {
                    db.run('ROLLBACK');
                    return res.status(400).json({
                      error: `Insufficient ${resourceId} stockpile. Required: ${resAmount}, Available: ${currentQty}`
                    });
                  }

                  db.run(
                    'UPDATE Inventory SET quantity = quantity - ? WHERE user_id = ? AND resource_id = ?',
                    [resAmount, userId, resourceId],
                    (deductInvErr) => {
                      if (deductInvErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to deduct mineral stockpile' });
                      }
                      applyUpgradeCommit();
                    }
                  );
                }
              );
            } else {
              applyUpgradeCommit();
            }
          });
        }
      );
    });
  });
});

// 11. Module Catalog
app.get('/api/game/modules', (req, res) => {
  res.json({ modules: Object.values(MODULE_CATALOG) });
});

// 12. Modular Vessel Outfitting
app.post('/api/game/fleet/outfit', (req, res) => {
  const { user_id, vessel_id, modules } = req.body;

  if (!user_id || !vessel_id || !Array.isArray(modules)) {
    return res.status(400).json({ error: 'Missing or invalid user_id, vessel_id, or modules array.' });
  }

  const userId = parseInt(user_id, 10);
  const vesselId = parseInt(vessel_id, 10);

  // Validate module existence
  for (const modId of modules) {
    if (!MODULE_CATALOG[modId]) {
      return res.status(400).json({ error: `Invalid component module ID: ${modId}` });
    }
  }

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: `Transaction start failure: ${beginErr.message}` });
      }

      db.get(
        'SELECT * FROM Fleet WHERE id = ? AND user_id = ?',
        [vesselId, userId],
        (fleetErr, vessel) => {
          if (fleetErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: fleetErr.message });
          }

          if (!vessel) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: `Vessel #${vesselId} not found or not owned by user #${userId}` });
          }

          // Calculate power and tonnage requirements
          const proposedStats = calculateVesselStats({
            ...vessel,
            modules,
          });

          if (proposedStats.totalPowerUsed > proposedStats.maxPower) {
            db.run('ROLLBACK');
            return res.status(400).json({
              error: `Power grid overload! Required: ${proposedStats.totalPowerUsed} MW, Capacity: ${proposedStats.maxPower} MW`,
            });
          }

          if (proposedStats.totalTonnageUsed > proposedStats.maxTonnage) {
            db.run('ROLLBACK');
            return res.status(400).json({
              error: `Tonnage capacity exceeded! Required: ${proposedStats.totalTonnageUsed} T, Capacity: ${proposedStats.maxTonnage} T`,
            });
          }

          const modulesJson = JSON.stringify(modules);

          db.run(
            `UPDATE Fleet 
             SET modules = ?, extraction_rate = ?, cargo_capacity = ? 
             WHERE id = ? AND user_id = ?`,
            [modulesJson, proposedStats.effectiveExtractionRate, proposedStats.effectiveCargo, vesselId, userId],
            (updateErr) => {
              if (updateErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: updateErr.message });
              }

              db.run('COMMIT', async (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Commit failed' });
                }

                console.log(`[Fleet] Outfitted vessel #${vesselId} with ${modules.length} modules.`);

                try {
                  const freshState = await simulationEngine.getUserState(userId);
                  simulationEngine.broadcastToClient(userId, {
                    type: 'FLEET_UPDATED',
                    payload: {
                      vesselId,
                      modules,
                      stats: proposedStats,
                      ...freshState,
                    },
                  });
                } catch (bErr) {
                  console.error('[Fleet] Broadcast error:', bErr.message);
                }

                return res.json({
                  success: true,
                  vesselId,
                  modules,
                  stats: proposedStats,
                });
              });
            }
          );
        }
      );
    });
  });
});

// Create HTTP server for Express and attach WebSocket server
const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`[HTTP] Astrolith Server running on http://localhost:${PORT}`);
  console.log(`[WS] Astrolith WebSocket server listening on ws://localhost:${PORT}`);
});

// Graceful Shutdown & SQLite WAL Checkpointing
const handleShutdown = (signal) => {
  console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);

  // Stop Simulation Engine loop
  if (simulationEngine) {
    simulationEngine.stop();
  }

  // Checkpoint WAL and close SQLite connection cleanly
  db.serialize(() => {
    db.run('PRAGMA wal_checkpoint(TRUNCATE)', (ckptErr) => {
      if (ckptErr) {
        console.error('[DB] Error during WAL checkpoint:', ckptErr.message);
      } else {
        console.log('[DB] WAL checkpoint completed (all transactions committed to main DB).');
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error('[DB] Error closing SQLite database:', closeErr.message);
        } else {
          console.log('[DB] SQLite database connection closed cleanly.');
        }

        server.close(() => {
          console.log('[HTTP/WS] Server listener terminated.');
          process.exit(0);
        });
      });
    });
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
