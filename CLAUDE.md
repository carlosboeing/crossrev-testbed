# crossrev-testbed — project instructions for AI agents

A deliberately small JavaScript library that exists so [CrossRev](https://github.com/carlosboeing/crossrev) has real pull requests to review. Nothing here is used by anything.

## Project Map

- **Tracker**: GitHub Issues (this repo)
- **Board**: none
- **Roadmap**: none
- **Changelog**: none
- **Architecture**: two independent modules under `src/`, no shared state, no framework
- **Other**:
  - No dependencies, no build step, no lockfile. Node 18 or newer, `npm test` runs `node --test`.
  - The `Tracker` field above is read by `crossrev init` when it resolves where deferred findings go. Changing it changes that behaviour.

## What this repository is for

CrossRev runs a cross-model review loop across two proofs. This repository is where both run:

- **The baseline proof** establishes that automated mode works at all — that a comment fires a workflow, that the label chain carries a pass from one leg to the next, that the fork guard stops before the checkout, and that the watchdog notices a stalled leg.
- **The feature proof** exercises the comment commands, the per-leg automatic flags and the pass window, which needs churn: preset flips, permission rejections, fork pull requests and comment bursts.

The repository is kept rather than thrown away, so the run URLs cited in those records keep resolving.

## Working here

- **Pull requests may carry deliberate defects.** That is the point of them. A defect you find in a pull request here is probably load-bearing for a proof — do not fix it unless asked, and say what you found rather than silently correcting it.
- **`main` should stay correct.** Defects belong in pull requests, not in the base. If `main` is broken, the review leg has no clean baseline to judge a diff against.
- **Keep it dependency-free.** Adding a package changes what the review legs see and adds a lockfile to every diff. The modules use Node built-ins only, and the tests use `node:test`.
- **Keep it small.** This is fodder, not a product. Two modules is enough; resist growing it.

## The pull request lifecycle

A pull request here is a completed assertion about CrossRev, not work in flight. Four rules follow from that, and the first is the one that is easy to get wrong.

- **Never merge a proof pull request.** Every proof diffs from `main`, so merging one changes the base that every later proof is measured against. The v0.2.0 and v0.5.0 baselines are comparable only because `src/rate-limiter.js` was byte-identical at the base of both. A merge that added a method to it would have made the second run a different experiment.
- **Close it when its evidence is written up, and delete the branch.** Nothing is lost. The markers, the review threads and the resolution replies stay readable on a closed pull request — `gh api repos/carlosboeing/crossrev-testbed/issues/N/comments` returns them all. GitHub also keeps `refs/pull/N/head` after the branch is gone, so the commits stay reachable.
- **Zero open pull requests is the resting state.** An open one should mean a proof is running right now. Parking a reproduction for an open CrossRev defect is not a reason to keep one, because the defect's own issue carries the run ids. Re-file a fresh pull request when a fix needs verifying.
- **Change `main` deliberately.** Re-pinning the workflows after a CrossRev release is the usual reason and needs no ceremony. A commit touching `src/` or `test/` should name the earlier proofs it invalidates, because it invalidates them silently otherwise.

## Conventions

- Conventional Commits: `<type>(<scope>): <description>`, imperative, subject under 72 characters.
- No emojis in files.
- CommonJS (`require`/`module.exports`), matching what is already here.
- Every exported function carries a JSDoc block. The review legs read them, so a wrong one is worse than none.
