/**
 * TransformInterpolationBuffer
 * 
 * Provides linear and cubic interpolation between discrete network state updates
 * to maintain 60 FPS visual smoothness in Three.js scenes despite network latency.
 */

export class TransformInterpolationBuffer {
  constructor(bufferWindowMs = 150) {
    this.bufferWindowMs = bufferWindowMs;
    this.snapshots = []; // Sorted array of { timestamp, position: { x, y, z }, rotation: { x, y, z } }
  }

  /**
   * Pushes a new authoritative transform update received over WebSocket.
   */
  pushSnapshot(position, rotation, timestamp = Date.now()) {
    this.snapshots.push({ timestamp, position, rotation });

    // Prune snapshots older than 2x buffer window to prevent memory accumulation
    const cutoff = timestamp - (this.bufferWindowMs * 3);
    while (this.snapshots.length > 2 && this.snapshots[0].timestamp < cutoff) {
      this.snapshots.shift();
    }
  }

  /**
   * Computes the interpolated transform for the current rendering frame.
   * @param {number} renderTime - Target timestamp (typically Date.now() - bufferWindowMs)
   */
  getInterpolatedTransform(renderTime = Date.now() - this.bufferWindowMs) {
    if (this.snapshots.length === 0) {
      return null;
    }
    if (this.snapshots.length === 1) {
      return this.snapshots[0];
    }

    // Find the two snapshots surrounding renderTime
    let older = this.snapshots[0];
    let newer = this.snapshots[this.snapshots.length - 1];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].timestamp <= renderTime && this.snapshots[i + 1].timestamp >= renderTime) {
        older = this.snapshots[i];
        newer = this.snapshots[i + 1];
        break;
      }
    }

    const timeSpan = newer.timestamp - older.timestamp;
    if (timeSpan <= 0) {
      return newer;
    }

    // Normalized progress factor [0, 1]
    const alpha = Math.max(0, Math.min(1, (renderTime - older.timestamp) / timeSpan));

    // Linear interpolation for Cartesian coordinates
    const x = older.position.x + (newer.position.x - older.position.x) * alpha;
    const y = older.position.y + (newer.position.y - older.position.y) * alpha;
    const z = older.position.z + (newer.position.z - older.position.z) * alpha;

    return {
      position: { x, y, z },
      rotation: newer.rotation,
      alpha,
    };
  }

  clear() {
    this.snapshots = [];
  }
}
