'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { LruCache } = require('../src/lru-cache');

test('stores and reads back a value', () => {
  const cache = new LruCache();
  cache.set('a', 1);
  assert.strictEqual(cache.get('a'), 1);
  assert.strictEqual(cache.size, 1);
});

test('returns undefined for a key it has never seen', () => {
  const cache = new LruCache();
  assert.strictEqual(cache.get('missing'), undefined);
});

test('evicts the least recently used entry once full', () => {
  const cache = new LruCache({ maxSize: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  assert.strictEqual(cache.has('a'), false);
  assert.strictEqual(cache.get('b'), 2);
  assert.strictEqual(cache.get('c'), 3);
});

test('reading an entry protects it from the next eviction', () => {
  const cache = new LruCache({ maxSize: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a');
  cache.set('c', 3);

  assert.strictEqual(cache.get('a'), 1);
  assert.strictEqual(cache.has('b'), false);
});

test('overwriting a key keeps one entry and refreshes its recency', () => {
  const cache = new LruCache({ maxSize: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('a', 99);
  cache.set('c', 3);

  assert.strictEqual(cache.size, 2);
  assert.strictEqual(cache.get('a'), 99);
  assert.strictEqual(cache.has('b'), false);
});

test('expires an entry once its ttl has elapsed', () => {
  let clock = 1000;
  const cache = new LruCache({ ttlMs: 500, now: () => clock });

  cache.set('a', 1);
  clock += 499;
  assert.strictEqual(cache.get('a'), 1);

  clock += 1;
  assert.strictEqual(cache.get('a'), undefined);
});

test('prune drops expired entries and reports the count', () => {
  let clock = 0;
  const cache = new LruCache({ ttlMs: 100, now: () => clock });

  cache.set('a', 1);
  cache.set('b', 2);
  clock += 100;
  cache.set('c', 3);

  assert.strictEqual(cache.prune(), 2);
  assert.strictEqual(cache.size, 1);
  assert.strictEqual(cache.get('c'), 3);
});

test('rejects a maxSize that cannot hold anything', () => {
  assert.throws(() => new LruCache({ maxSize: 0 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 1.5 }), RangeError);
});

test('rejects a non-positive ttl', () => {
  assert.throws(() => new LruCache({ ttlMs: 0 }), RangeError);
});

test('peek reads a value without refreshing its recency', () => {
  const cache = new LruCache({ maxSize: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  assert.strictEqual(cache.peek('a'), 1);
  cache.set('c', 3);

  assert.strictEqual(cache.has('a'), false);
  assert.strictEqual(cache.get('b'), 2);
  assert.strictEqual(cache.get('c'), 3);
});

test('peek returns undefined for an unknown key', () => {
  const cache = new LruCache();
  assert.strictEqual(cache.peek('missing'), undefined);
});

test('peek returns undefined for an expired entry', () => {
  let clock = 1000;
  const cache = new LruCache({ ttlMs: 500, now: () => clock });

  cache.set('a', 1);
  clock += 500;
  assert.strictEqual(cache.peek('a'), undefined);
});

