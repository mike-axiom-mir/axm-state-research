# Experiment 07 results

## Latest gate

Stateborn v0.5 passed:

- 62 / 62 tests across the full retained source tree;
- 13 / 13 capsule-specific tests;
- 16 / 16 deterministic capsule crossings;
- 16 / 16 distinct namespaces;
- 16 / 16 unchanged source states before explicit acceptance;
- 16 / 16 selective asymmetric returns;
- 16 / 16 forged-return refusals;
- 16 / 16 exact replays;
- static validation for four offline entrypoints, 23 required files, and 14
  JavaScript files with no external runtime dependency.

## Run

```bash
npm test
node tools/validate-static.mjs
node tools/capsule-probe.mjs
```

## Visual verification

The publishing session's cloud browser blocked local and `file:` URLs, so the
rendered v0.5 route is recorded as UNKNOWN. No visual pass is inferred from
source or engine behavior.

## Claim

Demonstrated: two fictional, consented game-state projections can temporarily
compose under separate namespaces, create shared receipt evidence, return only
owner-selected allowlisted paths, detach, and replay in one local process.

Not demonstrated: movement of a human, whole-person identity, account
portability, secure networking, hostile-peer safety, arbitrary schema
compatibility, production multiplayer, consciousness, fun, a generated RPG,
merge, or canon.

