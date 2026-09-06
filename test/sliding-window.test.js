'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { SlidingWindowCounter } = require('../src/sliding-window');

function at(times) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)];
}

test('a counter allows up to the limit inside one window', () => {
  const counter = new SlidingWindowCounter({
    limit: 3,
    windowMs: 1000,
    now: at([0, 0, 10, 10, 20, 20, 30, 30]),
  });

  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('a').allowed, false);
});

test('a counter reports what is left', () => {
  const counter = new SlidingWindowCounter({ limit: 2, windowMs: 1000, now: () => 0 });

  assert.equal(counter.remaining('a'), 2);
  counter.hit('a');
  assert.equal(counter.remaining('a'), 1);
});

test('a refused hit says how long to wait', () => {
  const counter = new SlidingWindowCounter({ limit: 1, windowMs: 500, now: () => 100 });

  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('a').retryAfterMs, 500);
});

test('resetting a key forgets it', () => {
  const counter = new SlidingWindowCounter({ limit: 1, windowMs: 1000, now: () => 0 });

  counter.hit('a');
  assert.equal(counter.reset('a'), true);
  assert.equal(counter.remaining('a'), 1);
});

test('keys are counted apart', () => {
  const counter = new SlidingWindowCounter({ limit: 1, windowMs: 1000, now: () => 0 });

  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('b').allowed, true);
});

test('the constructor refuses a limit or a window it cannot use', () => {
  assert.throws(() => new SlidingWindowCounter({ limit: 0, windowMs: 1 }), RangeError);
  assert.throws(() => new SlidingWindowCounter({ limit: 1, windowMs: 0 }), RangeError);
});

test('an event exactly windowMs old has expired', () => {
  const counter = new SlidingWindowCounter({
    limit: 1,
    windowMs: 1000,
    now: at([0, 1000]),
  });

  assert.equal(counter.hit('a').allowed, true);
  assert.equal(counter.hit('a').allowed, true);
});
