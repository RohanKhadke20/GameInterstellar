import { logger } from '../lib/logger.js';

/**
 * InMemoryEventBus — Single-process IEventBus implementation.
 *
 * Suitable for single-instance deployments. When horizontal scaling is needed,
 * replace with RedisEventBus:
 *
 *   import { RedisEventBus } from './RedisEventBus.js';
 *   const eventBus = process.env.REDIS_URL
 *     ? new RedisEventBus(process.env.REDIS_URL)
 *     : new InMemoryEventBus();
 *
 * The interface contract (IEventBus) is defined in GameEvent.js:
 *   - publish(event: GameEvent): Promise<void>
 *   - subscribe(handler: (event: GameEvent) => void): () => void  // returns unsubscribe fn
 */
export class InMemoryEventBus {
  /** @type {Array<(event: import('./GameEvent.js').GameEvent) => void>} */
  #handlers = [];

  /**
   * Publishes a GameEvent to all registered subscribers.
   * Errors thrown by individual handlers are caught and logged — they do not
   * interrupt delivery to subsequent handlers.
   *
   * @param {import('./GameEvent.js').GameEvent} event
   * @returns {Promise<void>}
   */
  async publish(event) {
    logger.info('GameEvent published', { type: event.type });
    for (const handler of this.#handlers) {
      try {
        handler(event);
      } catch (e) {
        logger.error('EventBus handler threw', { error: e.message, eventType: event.type });
      }
    }
  }

  /**
   * Subscribes a handler to all published GameEvents.
   *
   * @param {(event: import('./GameEvent.js').GameEvent) => void} handler
   * @returns {() => void} Unsubscribe function — call to remove this handler.
   */
  subscribe(handler) {
    this.#handlers.push(handler);
    return () => {
      this.#handlers = this.#handlers.filter((h) => h !== handler);
    };
  }
}
