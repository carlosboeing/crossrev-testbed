'use strict';

/**
 * A sliding-window request counter, one window per caller.
 *
 * The token bucket in rate-limiter.js smooths bursts; this counts exact events
 * inside a moving interval instead, which is what a quota measured as "60 per
 * minute" actually means. Timestamps are held per key and the stale ones are
 * dropped when the window is consulted, so an idle key costs nothing until it
 * is read again.
 */
class SlidingWindowCounter {
  /**
   * @param {object} options
   * @param {number} options.limit events allowed inside one window
   * @param {number} options.windowMs width of the window in milliseconds
   * @param {() => number} [options.now] clock in milliseconds, injectable for tests
   */
  constructor(options) {
    const { limit, windowMs, now = Date.now } = options ?? {};

    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('limit must be a positive integer');
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new RangeError('windowMs must be a positive number');
    }
    if (typeof now !== 'function') {
      throw new TypeError('now must be a function');
    }

    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();
  }

  /**
   * Record one event for a caller, if the window has room for it.
   *
   * @param {string} key identifies the caller
   * @returns {{allowed: boolean, remaining: number, retryAfterMs: number}}
   */
  hit(key) {
    const at = this.now();
    const timestamps = this.window(key, at);

    if (timestamps.length >= this.limit) {
      const oldest = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: oldest + this.windowMs - at,
      };
    }

    timestamps.push(at);
    return {
      allowed: true,
      remaining: this.limit - timestamps.length,
      retryAfterMs: 0,
    };
  }

  /**
   * How many events the caller may still record right now.
   *
   * @param {string} key
   * @returns {number}
   */
  remaining(key) {
    return this.limit - this.window(key).length;
  }

  /**
   * The live timestamps for a caller, stale entries already dropped.
   *
   * @param {string} key
   * @param {number} [at] the instant to measure against, defaults to `this.now()`
   * @returns {number[]} the timestamps inside the current window
   */
  window(key, at = this.now()) {
    let timestamps = this.hits.get(key);
    if (timestamps === undefined) {
      timestamps = [];
      this.hits.set(key, timestamps);
    }

    const cutoff = at - this.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    return timestamps;
  }

  /**
   * Forget a caller entirely.
   *
   * @param {string} key
   * @returns {boolean} whether anything was held for that key
   */
  reset(key) {
    return this.hits.delete(key);
  }

  /**
   * Drop every key whose window is empty. Nothing calls this automatically:
   * pruning is lazy, and a long-lived counter with many one-off keys benefits
   * from a sweep.
   *
   * @returns {number} how many keys were removed
   */
  prune() {
    let removed = 0;
    for (const key of this.hits.keys()) {
      if (this.window(key).length === 0) {
        this.hits.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

module.exports = { SlidingWindowCounter };
