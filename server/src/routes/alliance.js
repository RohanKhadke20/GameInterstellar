import express from 'express';
import { db } from '../db.js';
import { simulationEngine } from '../simulationEngine.js';

const router = express.Router();

/**
 * GET /api/game/alliance/projects
 * Fetches the active alliance and ongoing megastructure projects with contribution leaderboard.
 */
router.get('/projects', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.user_id || 1, 10);

  db.serialize(() => {
    // 1. Fetch default alliance
    db.get('SELECT * FROM Alliances ORDER BY id ASC LIMIT 1', [], (allianceErr, alliance) => {
      if (allianceErr) {
        return res.status(500).json({ error: allianceErr.message });
      }

      // 2. Fetch active megastructure project
      db.get(
        'SELECT * FROM MegastructureProjects WHERE status = ? ORDER BY id ASC LIMIT 1',
        ['in_progress'],
        (projErr, project) => {
          if (projErr) {
            return res.status(500).json({ error: projErr.message });
          }

          if (!project) {
            return res.json({ alliance: alliance || null, project: null, userContributions: [] });
          }

          // 3. Fetch top contributors
          db.all(
            `SELECT 
              c.user_id,
              c.resource_id,
              SUM(c.quantity) as total_contributed,
              MAX(c.contributed_at) as last_contribution
             FROM MegastructureContributions c
             WHERE c.project_id = ?
             GROUP BY c.user_id, c.resource_id
             ORDER BY total_contributed DESC
             LIMIT 10`,
            [project.id],
            (contribErr, leaderboard) => {
              if (contribErr) {
                return res.status(500).json({ error: contribErr.message });
              }

              // 4. Calculate progress percentages
              const alloyPct = Math.min(100, Math.round((project.contributed_alloys / project.required_alloys) * 100));
              const fuelPct = Math.min(100, Math.round((project.contributed_fuel / project.required_fuel) * 100));
              const overallPct = Math.min(100, Math.round(((project.contributed_alloys + project.contributed_fuel) / (project.required_alloys + project.required_fuel)) * 100));

              return res.json({
                alliance: alliance || { name: 'Vanguard Coalition', tag: 'VIC', level: 1 },
                project: {
                  ...project,
                  alloyProgressPct: alloyPct,
                  fuelProgressPct: fuelPct,
                  overallProgressPct: overallPct,
                },
                leaderboard: leaderboard || [],
              });
            }
          );
        }
      );
    });
  });
});

/**
 * POST /api/game/alliance/contribute
 * Submits refined resources from a player's inventory to the active megastructure project.
 */
router.post('/contribute', (req, res) => {
  const { user_id, project_id, resource_id, amount } = req.body;

  if (!user_id || !project_id || !resource_id || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid contribution parameters.' });
  }

  const userId = parseInt(user_id, 10);
  const projectId = parseInt(project_id, 10);
  const contributionAmount = Math.max(1, parseFloat(amount));

  if (resource_id !== 'res_alloy_plating' && resource_id !== 'res_fuel_cells') {
    return res.status(400).json({ error: 'Invalid contribution material. Must be Refined Alloy Plating or Stabilized Fuel Cells.' });
  }

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: `Transaction start failure: ${beginErr.message}` });
      }

      // 1. Validate user inventory
      db.get(
        'SELECT quantity FROM Inventory WHERE user_id = ? AND resource_id = ?',
        [userId, resource_id],
        (invErr, invItem) => {
          if (invErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: invErr.message });
          }

          const availableQty = invItem ? invItem.quantity : 0;
          if (availableQty < contributionAmount) {
            db.run('ROLLBACK');
            return res.status(400).json({
              error: `Insufficient inventory. Required: ${contributionAmount}, Available: ${availableQty.toFixed(1)}`,
            });
          }

          // 2. Fetch project
          db.get('SELECT * FROM MegastructureProjects WHERE id = ?', [projectId], (projErr, project) => {
            if (projErr || !project) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Megastructure project not found.' });
            }

            if (project.status === 'completed') {
              db.run('ROLLBACK');
              return res.status(400).json({ error: 'Megastructure project is already fully constructed!' });
            }

            // 3. Deduct inventory
            db.run(
              'UPDATE Inventory SET quantity = quantity - ? WHERE user_id = ? AND resource_id = ?',
              [contributionAmount, userId, resource_id],
              (deductErr) => {
                if (deductErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to deduct contribution from inventory' });
                }

                // 4. Update Megastructure project contributions
                const columnToUpdate = resource_id === 'res_alloy_plating' ? 'contributed_alloys' : 'contributed_fuel';
                db.run(
                  `UPDATE MegastructureProjects SET ${columnToUpdate} = ${columnToUpdate} + ? WHERE id = ?`,
                  [contributionAmount, projectId],
                  (updateProjErr) => {
                    if (updateProjErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to update project progress' });
                    }

                    // 5. Record contribution ledger entry
                    db.run(
                      'INSERT INTO MegastructureContributions (project_id, user_id, resource_id, quantity) VALUES (?, ?, ?, ?)',
                      [projectId, userId, resource_id, contributionAmount],
                      (insertContribErr) => {
                        if (insertContribErr) {
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Failed to record contribution ledger entry' });
                        }

                        // 6. Check completion conditions
                        db.get('SELECT * FROM MegastructureProjects WHERE id = ?', [projectId], (checkErr, updatedProj) => {
                          if (checkErr) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: checkErr.message });
                          }

                          const isComplete =
                            updatedProj.contributed_alloys >= updatedProj.required_alloys &&
                            updatedProj.contributed_fuel >= updatedProj.required_fuel;

                          const completeCallback = () => {
                            db.run('COMMIT', async (commitErr) => {
                              if (commitErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Commit failed' });
                              }

                              console.log(`[Alliance] User #${userId} contributed ${contributionAmount}x ${resource_id} to Project #${projectId}.`);

                              // Broadcast instant state update via WebSocket
                              try {
                                const freshUserState = await simulationEngine.getUserState(userId);
                                simulationEngine.broadcastToClient(null, {
                                  type: 'ALLIANCE_PROJECT_UPDATED',
                                  payload: {
                                    projectId,
                                    contributedBy: userId,
                                    resourceId: resource_id,
                                    amount: contributionAmount,
                                    project: updatedProj,
                                  },
                                });

                                simulationEngine.broadcastToClient(userId, {
                                  type: 'TELEMETRY_SYNC',
                                  payload: {
                                    userId,
                                    ...freshUserState,
                                    timestamp: Date.now(),
                                  },
                                });
                              } catch (bErr) {
                                console.error('[Alliance] Broadcast error:', bErr.message);
                              }

                              return res.json({
                                success: true,
                                project: updatedProj,
                                contributedAmount: contributionAmount,
                                resourceId: resource_id,
                              });
                            });
                          };

                          if (isComplete && updatedProj.status !== 'completed') {
                            db.run(
                              'UPDATE MegastructureProjects SET status = ?, completed_at = unixepoch() WHERE id = ?',
                              ['completed', projectId],
                              () => {
                                updatedProj.status = 'completed';
                                completeCallback();
                              }
                            );
                          } else {
                            completeCallback();
                          }
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
    });
  });
});

export default router;
