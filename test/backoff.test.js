'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Backoff } = require('../src/backoff');

// A random source that always returns 1 takes jitter out of the picture, so
// each delay is the full exponential value.
const noJitter = () => 1;

test('the first retry waits baseDelayMs', () => {
  const backoff = new Backoff({ baseDelayMs: 100 });
  assert.strictEqual(backoff.delayFor(1, noJitter), 100);
});

test('each retry doubles the delay', () => {
  const backoff = new Backoff({ baseDelayMs: 100 });
  assert.deepStrictEqual(
    [1, 2, 3, 4].map((attempt) => backoff.delayFor(attempt, noJitter)),
    [100, 200, 400, 800],
  );
});

test('caps every delay at maxDelayMs', () => {
  const backoff = new Backoff({ baseDelayMs: 100, maxDelayMs: 250 });
  assert.strictEqual(backoff.delayFor(3, noJitter), 250);
});

test('applies jitter to the exponential delay', () => {
  const backoff = new Backoff({ baseDelayMs: 100 });
  assert.strictEqual(backoff.delayFor(2, () => 0.5), 100);
});

test('next advances the attempt and returns its delay', () => {
  const backoff = new Backoff({ baseDelayMs: 100 });

  assert.strictEqual(backoff.next(noJitter), 100);
  assert.strictEqual(backoff.next(noJitter), 200);
  assert.strictEqual(backoff.attempt, 2);
});

test('canRetry stops at maxAttempts', () => {
  const backoff = new Backoff({ maxAttempts: 2 });

  assert.strictEqual(backoff.canRetry(), true);
  backoff.next(noJitter);
  assert.strictEqual(backoff.canRetry(), true);
  backoff.next(noJitter);
  assert.strictEqual(backoff.canRetry(), false);
});

test('reset forgets every attempt so far', () => {
  const backoff = new Backoff({ baseDelayMs: 100, maxAttempts: 1 });
  backoff.next(noJitter);
  backoff.reset();

  assert.strictEqual(backoff.attempt, 0);
  assert.strictEqual(backoff.canRetry(), true);
  assert.strictEqual(backoff.next(noJitter), 100);
});

test('rejects nonsense configuration', () => {
  assert.throws(() => new Backoff({ baseDelayMs: 0 }), RangeError);
  assert.throws(() => new Backoff({ baseDelayMs: 100, maxDelayMs: 50 }), RangeError);
});
