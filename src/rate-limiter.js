'use strict';

/**
 * A token bucket rate limiter, one bucket per caller.
 *
 * Tokens refill continuously rather than on a fixed schedule: the balance is
 * computed from elapsed time when a bucket is consulted, so there is no timer
 * to hold open and an idle bucket costs nothing until it is read.
 */
class RateLimiter {
  /**
   * @param {object} options
   * @param {number} options.capacity most tokens a bucket can hold
   * @param {number} options.refillPerSecond tokens added per second
   * @param {() => number} [options.now] clock in milliseconds, injectable for tests
   */
  constructor(options) {
    const { capacity, refillPerSecond, now = Date.now } = options ?? {};

    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive number');
    }
    if (!Number.isFinite(refillPerSecond) || refillPerSecond <= 0) {
      throw new RangeError('refillPerSecond must be a positive number');
    }

    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
    this.buckets = new Map();
  }

  /**
   * Take tokens for a caller if the bucket can cover them.
   *
   * @param {string} key identifies the caller
   * @param {number} [cost=1] tokens this request costs
   * @returns {{allowed: boolean, remaining: number, retryAfterMs: number}}
   */
  consume(key, cost = 1) {
    if (!Number.isFinite(cost) || cost <= 0) {
      throw new RangeError('cost must be a positive number');
    }
    if (cost > this.capacity) {
      throw new RangeError('cost exceeds capacity, so it can never be allowed');
    }

    const bucket = this.refill(key);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
    }

    const shortfall = cost - bucket.tokens;
    const retryAfterMs = Math.ceil((shortfall / this.refillPerSecond) * 1000);
    return { allowed: false, remaining: bucket.tokens, retryAfterMs };
  }

  /**
   * Return tokens to a caller. The resulting balance never exceeds capacity:
   * refunding more than was spent, or refunding a full bucket, leaves the
   * bucket at capacity rather than above it.
   *
   * @param {string} key identifies the caller
   * @param {number} [amount=1] tokens to put back
   * @returns {number} tokens currently available after the refund
   */
  refund(key, amount = 1) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('amount must be a positive number');
    }

    const bucket = this.refill(key);
    bucket.tokens += amount;
    return bucket.tokens;
  }

  /**
   * Read a caller's balance without spending anything.
   *
   * @param {string} key
   * @returns {number} tokens currently available
   */
  peek(key) {
    return this.refill(key).tokens;
  }

  /**
   * Give a caller its full allowance back.
   *
   * @param {string} key
   */
  reset(key) {
    this.buckets.delete(key);
  }

  /**
   * Forget buckets that have sat at full capacity since before the cutoff.
   * A full bucket is indistinguishable from a fresh one, so dropping it loses
   * nothing and keeps the map from growing with one entry per caller seen.
   *
   * @param {number} [idleMs=600000] idle time after which a full bucket is dropped
   * @returns {number} how many buckets were removed
   */
  sweep(idleMs = 600_000) {
    const cutoff = this.now() - idleMs;
    let removed = 0;

    for (const [key, bucket] of this.buckets) {
      if (bucket.updatedAt <= cutoff && this.refill(key).tokens >= this.capacity) {
        this.buckets.delete(key);
        removed += 1;
      }
    }

    return removed;
  }

  /**
   * Bring a bucket's balance up to date, creating it if this caller is new.
   *
   * @param {string} key
   * @returns {{tokens: number, updatedAt: number}}
   */
  refill(key) {
    const timestamp = this.now();
    let bucket = this.buckets.get(key);

    if (bucket === undefined) {
      bucket = { tokens: this.capacity, updatedAt: timestamp };
      this.buckets.set(key, bucket);
      return bucket;
    }

    const elapsedSeconds = (timestamp - bucket.updatedAt) / 1000;
    if (elapsedSeconds > 0) {
      const gained = elapsedSeconds * this.refillPerSecond;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + gained);
      bucket.updatedAt = timestamp;
    }

    return bucket;
  }
}

module.exports = { RateLimiter };
