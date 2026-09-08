'use strict';

/**
 * A least-recently-used cache with an optional per-entry time to live.
 *
 * Insertion order in a Map is the recency order we need: re-inserting a key
 * moves it to the end, so the first key the iterator yields is always the
 * least recently used one.
 */
class LruCache {
  /**
   * @param {object} [options]
   * @param {number} [options.maxSize=128] entries to hold before evicting
   * @param {number} [options.ttlMs] lifetime of an entry, omitted for no expiry
   * @param {() => number} [options.now] clock, injectable for tests
   */
  constructor(options = {}) {
    const { maxSize = 128, ttlMs, now = Date.now } = options;

    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new RangeError('maxSize must be a positive integer');
    }
    if (ttlMs !== undefined && (!Number.isFinite(ttlMs) || ttlMs <= 0)) {
      throw new RangeError('ttlMs must be a positive number when given');
    }

    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
  }

  get size() {
    return this.entries.size;
  }

  /**
   * @param {string} key
   * @returns {boolean} whether the entry exists and has not expired
   */
  has(key) {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Reading an entry marks it as most recently used.
   *
   * @param {string} key
   * @returns {*} the stored value, or undefined when absent or expired
   */
  get(key) {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return undefined;
    }

    // Delete then set, so the entry moves to the end of the iteration order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /**
   * Read an entry without marking it as most recently used.
   *
   * @param {string} key
   * @returns {*} the stored value, or undefined when absent or expired
   */
  peek(key) {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * @param {string} key
   * @param {*} value
   * @returns {LruCache} this, for chaining
   */
  set(key, value) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });

    while (this.entries.size > this.maxSize) {
      const oldest = this.entries.keys().next().value;
      this.entries.delete(oldest);
    }

    return this;
  }

  /**
   * @param {string} key
   * @returns {boolean} whether an entry was removed
   */
  delete(key) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  /**
   * Drop every expired entry. Nothing calls this automatically — expiry is
   * lazy, and a long-lived cache of rarely-read keys benefits from a sweep.
   *
   * @returns {number} how many entries were removed
   */
  prune() {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * @param {{storedAt: number}} entry
   * @returns {boolean}
   */
  isExpired(entry) {
    if (this.ttlMs === undefined) return false;
    return this.now() - entry.storedAt >= this.ttlMs;
  }
}

module.exports = { LruCache };
