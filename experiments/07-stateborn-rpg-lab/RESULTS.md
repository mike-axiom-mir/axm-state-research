# Experiment 07 results

## Latest gate

Stateborn v0.6 passed:

- 79 / 79 tests across the full retained source tree;
- 17 / 17 state-language-specific tests;
- frozen held-out outcomes: 2 solved, 1 refused, 2 deadlocked;
- zero private-value leaks and zero natural-language payload values;
- every committed delta bound to two exact accept packet digests;
- source records unchanged in all five trials;
- exact replay, reverse-order normalized outcomes, and direct-baseline
  agreement in all five trials;
- free-text, tampered, and stale packets refused without target-state mutation;
- static validation for five offline entrypoints, 28 required files, and 17
  JavaScript files with no external runtime dependency.

The retained v0.5 16-run capsule probe and v0.1–v0.4 tests also pass.

## Run

```bash
npm test
node tools/validate-static.mjs
node tools/capsule-probe.mjs
node tools/state-language-probe.mjs
```

## Visual verification

No live browser verification was requested for v0.6. Engine, probe, bundle,
navigation, and static checks passed. The earlier v0.5 rendered route remains
UNKNOWN because its publishing session's cloud browser blocked local URLs.

## Claim

Demonstrated: within one human-authored typed schema, two bounded deterministic
actors can solve, refuse, or deadlock through state packets without a prose
payload channel, while preserving consent provenance, source recovery, and
exact replay.

Not demonstrated: a spontaneous or private machine language, subjective
understanding, whole-person identity, secure networking, hostile-peer safety,
arbitrary schema compatibility, production multiplayer, consciousness, fun, a
generated RPG, merge, or canon.
