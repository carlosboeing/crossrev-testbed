# crossrev-testbed

A small, dependency-free JavaScript library that exists to be reviewed.

This repository is the proving ground for [CrossRev](https://github.com/carlosboeing/crossrev). CrossRev runs a cross-model pull request review loop — one model reviews, a second verifies and fixes, then the first looks again — and proving that loop needs real pull requests against real code. That is all this code is for. Nothing depends on it, and nothing should.

The library itself is deliberately ordinary: an LRU cache and a token bucket rate limiter, both small enough to hold in your head and both the kind of thing where a plausible bug can hide in plain sight.

## What's here

| Module | What it does |
|---|---|
| `src/lru-cache.js` | Least-recently-used cache with an optional per-entry TTL and lazy expiry |
| `src/rate-limiter.js` | Token bucket limiter, one bucket per caller, refilling continuously rather than on a timer |

## Running the tests

No dependencies and no build step. Node 18 or newer:

```bash
npm test
```

The script is `node --test`, which discovers `test/*.test.js` on its own. Pass a
path only to narrow the run to one file — `node --test test/lru-cache.test.js`.
Passing the directory (`node --test test/`) fails on newer Node, which reads it
as a file rather than a search root.

## A warning about the pull requests here

**Pull requests in this repository may contain deliberate defects.** They are how the review loop gets something to find. Do not read this repository as an example of careful work, and do not copy anything out of it.
