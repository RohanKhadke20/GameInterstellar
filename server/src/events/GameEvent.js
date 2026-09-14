/**
 * GameEvent — Typed discriminated union of all game domain events.
 *
 * Adding a new event:
 *   1. Add a new variant to the GameEvent union below.
 *   2. Publish it via IEventBus.publish() at the appropriate domain boundary.
 *   3. Subscribe handlers in websocketServer.js or any future service module.
 *
 * @typedef {Object} GameEvent
 */

/**
 * @typedef {
 *   | { type: 'PLAYER_JOINED';      playerId: string; sessionId: string }
 *   | { type: 'PLAYER_LEFT';         playerId: string }
 *   | { type: 'FLEET_REPOSITIONED'; playerId: string; sectorId: string; x: number; y: number; z: number }
 *   | { type: 'ASTEROID_HARVESTED'; asteroidId: string; playerId: string; resources: number }
 *   | { type: 'COMBAT_EVENT';        attackerId: string; targetId: string; damage: number }
 *   | { type: 'GAME_TICK';           tick: number; timestamp: number }
 * } GameEvent
 */

/**
 * IEventBus — Contract for an event bus implementation.
 * Implemented by InMemoryEventBus (default) and RedisEventBus (future horizontal scale).
 *
 * Drop-in replacement pattern:
 *   const bus = process.env.REDIS_URL
 *     ? new RedisEventBus(process.env.REDIS_URL)
 *     : new InMemoryEventBus();
 *
 * @interface
 * @typedef {{ publish: (event: GameEvent) => Promise<void>, subscribe: (handler: (event: GameEvent) => void) => () => void }} IEventBus
 */

// Exported as named symbols so consumers can use JSDoc @type annotations
export const GameEventTypes = Object.freeze({
  PLAYER_JOINED:      'PLAYER_JOINED',
  PLAYER_LEFT:        'PLAYER_LEFT',
  FLEET_REPOSITIONED: 'FLEET_REPOSITIONED',
  ASTEROID_HARVESTED: 'ASTEROID_HARVESTED',
  COMBAT_EVENT:       'COMBAT_EVENT',
  GAME_TICK:          'GAME_TICK',
});
