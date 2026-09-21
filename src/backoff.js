'use strict';

/**
 * Exponential backoff with equal jitter for request retries.
 *
 * The class documents its own contract:
 * - delays grow as `baseMs * 2^(attempt - 1)` for 1-based attempt numbers
 * - a delay never exceeds `maxDelayMs`
 * - `maxAttempts` counts total attempts: the first try plus its retries
 * - when every attempt fails, the returned promise rejects with the last error
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Backoff {
  /**
   * @param {object} [options]
   * @param {number} [options.baseMs=100] delay before the first retry
   * @param {number} [options.maxDelayMs=5000] ceiling for any computed delay
   * @param {number} [options.maxAttempts=3] total attempts before giving up
   */
  constructor({ baseMs = 100, maxDelayMs = 5000, maxAttempts = 3 } = {}) {
    if (!Number.isFinite(baseMs) || baseMs <= 0) {
      throw new RangeError('baseMs must be a positive number');
    }
    if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseMs) {
      throw new RangeError('maxDelayMs must be a number at least baseMs');
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new RangeError('maxAttempts must be an integer of at least 1');
    }
    this.baseMs = baseMs;
    this.maxDelayMs = maxDelayMs;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Delay in milliseconds before the given 1-based attempt number.
   * Equal jitter: half the capped delay plus a uniform random half.
   *
   * @param {number} attempt 1-based attempt number
   * @returns {number} milliseconds to wait, never above maxDelayMs
   */
  delayFor(attempt) {
    const grown = this.baseMs * 2 ** (attempt - 1);
    const capped = Math.min(grown, this.maxDelayMs);
    return capped / 2 + Math.random() * (capped / 2);
  }

  /**
   * Run an async function until it succeeds or the attempts run out.
   *
   * @param {() => Promise<*>} fn async function to retry
   * @returns {Promise<*>} the first success, or a rejection with the last error
   */
  async run(fn) {
    let lastError;
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < this.maxAttempts - 1) {
          await sleep(this.delayFor(attempt + 1));
        }
      }
    }
    throw lastError;
  }
}

module.exports = { Backoff };
