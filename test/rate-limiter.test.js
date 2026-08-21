'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { RateLimiter } = require('../src/rate-limiter');

const build = (overrides = {}) => {
  let clock = 0;
  const limiter = new RateLimiter({
    capacity: 10,
    refillPerSecond: 1,
    now: () => clock,
    ...overrides,
  });
  return { limiter, advance: (ms) => { clock += ms; } };
};

test('a new caller starts at full capacity', () => {
  const { limiter } = build();
  assert.strictEqual(limiter.peek('alice'), 10);
});

test('consuming spends tokens and reports the remainder', () => {
  const { limiter } = build();
  const result = limiter.consume('alice', 3);

  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.remaining, 7);
  assert.strictEqual(result.retryAfterMs, 0);
});

test('refuses once the bucket is empty and says when to retry', () => {
  const { limiter } = build();
  limiter.consume('alice', 10);

  const result = limiter.consume('alice', 2);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.remaining, 0);
  assert.strictEqual(result.retryAfterMs, 2000);
});

test('refills over time', () => {
  const { limiter, advance } = build();
  limiter.consume('alice', 10);

  advance(3000);
  assert.strictEqual(limiter.peek('alice'), 3);
});

test('never refills past capacity', () => {
  const { limiter, advance } = build();
  limiter.consume('alice', 1);

  advance(60_000);
  assert.strictEqual(limiter.peek('alice'), 10);
});

test('keeps callers independent', () => {
  const { limiter } = build();
  limiter.consume('alice', 10);

  assert.strictEqual(limiter.consume('bob', 5).allowed, true);
  assert.strictEqual(limiter.consume('alice', 1).allowed, false);
});

test('refund restores spent tokens', () => {
  const { limiter } = build();
  limiter.consume('alice', 3);

  assert.strictEqual(limiter.refund('alice', 3), 10);
});

test('refund never exceeds capacity', () => {
  const { limiter } = build();
  limiter.consume('alice', 1);
  limiter.refund('alice', 5);

  assert.strictEqual(limiter.peek('alice'), 10);
});

test('reset restores a caller to full', () => {
  const { limiter } = build();
  limiter.consume('alice', 10);
  limiter.reset('alice');

  assert.strictEqual(limiter.peek('alice'), 10);
});

test('sweep forgets idle full buckets and keeps spent ones', () => {
  const { limiter, advance } = build();
  limiter.consume('alice', 1);
  limiter.consume('bob', 10);

  // Six seconds refills alice's single spent token but leaves bob four short,
  // so the two buckets are on opposite sides of the "is it full" test. The
  // idle window has to be shorter than the refill time for that to be true at
  // all: under the ten-minute default, every bucket here is full long before
  // it counts as idle, and the sweep would take both.
  advance(6000);
  const removed = limiter.sweep(5000);

  assert.strictEqual(removed, 1);
  assert.strictEqual(limiter.buckets.has('alice'), false);
  assert.strictEqual(limiter.buckets.has('bob'), true);
});

test('rejects a cost larger than the bucket can ever hold', () => {
  const { limiter } = build();
  assert.throws(() => limiter.consume('alice', 11), RangeError);
});

test('rejects nonsense configuration', () => {
  assert.throws(() => new RateLimiter({ capacity: 0, refillPerSecond: 1 }), RangeError);
  assert.throws(() => new RateLimiter({ capacity: 1, refillPerSecond: -1 }), RangeError);
});
