'use strict';

/**
 * Exponential backoff with full jitter, for retrying a failed request.
 *
 * Delays grow as base * 2^(attempt - 1), are capped at maxDelayMs, and then
 * have jitter applied. The first attempt waits baseDelayMs.
 */
class Backoff {
  /**
   * @param {object} options
   * @param {number} options.baseDelayMs first delay, in milliseconds
   * @param {number} options.maxDelayMs  upper bound on any delay
   * @param {number} options.maxAttempts how many attempts are allowed in total
   */
  constructor({ baseDelayMs = 100, maxDelayMs = 30000, maxAttempts = 5 } = {}) {
    if (baseDelayMs <= 0) {
      throw new RangeError('baseDelayMs must be positive');
    }
    if (maxDelayMs < baseDelayMs) {
      throw new RangeError('maxDelayMs must be at least baseDelayMs');
    }
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxAttempts = maxAttempts;
    this.attempt = 0;
  }

  /** True while another attempt is allowed. */
  canRetry() {
    return this.attempt < this.maxAttempts;
  }

  /**
   * The delay before the given attempt, in milliseconds. Attempt 1 is the
   * first retry, so it waits baseDelayMs.
   */
  delayFor(attempt, random = Math.random) {
    const exponential = this.baseDelayMs * Math.pow(2, attempt - 1);
    const jittered = exponential * random();
    return Math.min(jittered, this.maxDelayMs);
  }

  /** Advances to the next attempt and returns its delay. */
  next(random = Math.random) {
    this.attempt += 1;
    return this.delayFor(this.attempt, random);
  }

  /** Forgets every attempt so far. */
  reset() {
    this.attempt = 0;
  }
}

module.exports = { Backoff };
