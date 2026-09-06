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

## A warning about the pull requests here

**Pull requests in this repository may contain deliberate defects.** They are how the review loop gets something to find. Do not read this repository as an example of careful work, and do not copy anything out of it.

## Two kinds of pull request, and what happens to each

They are told apart by whether the change is meant to be wrong, and they end differently.

| Kind | What it is | Ends |
|---|---|---|
| **Proof** | Code under `src/` and `test/`, written to carry defects for the loop to find | Closed, never merged |
| **Everything else** | Workflow repins, configuration, documentation | Merged |

**A proof pull request is closed, not merged.** Its code was written to be wrong, so merging it would put the defects in `main` and spoil the fodder for the next one. Close it with the branch:

```bash
gh pr close <number> --delete-branch
```

**Deleting the branch does not delete the record.** GitHub keeps a closed pull request's diff, commits and comments whether the branch exists or not, so `gh pr diff <number>` still answers afterwards. Measured on pull request 13, whose branch is gone. That is the whole reason a branch is safe to remove here, and why hundreds of them never accumulate.

**Everything else merges.** Repinning the workflows to a new CrossRev release is the usual one, and this section arrived as one of them. The repository has **Automatically delete head branches** switched on, so its branch goes without anyone remembering.
