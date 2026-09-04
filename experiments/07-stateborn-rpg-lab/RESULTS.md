# Experiment 07 results

## Latest gate

Stateborn v0.7 passed:

- 97 / 97 tests across the full retained source tree;
- 18 / 18 hostile-transport-specific tests;
- frozen transport outcomes: 7 solved, 1 consent refusal, 2 deadlocked;
- 56 attempted sends, 49 accepted packets, and 24,960 transmitted bytes;
- every requested fault family appeared: 4 drops, 2 duplicates suppressed,
  1 expiry, 1 reorder, 1 disconnect, 1 recovery pass, and 1 tamper refusal;
- duplicate and expired envelopes had no canonical state effect;
- source records unchanged and exact replay passed in all ten routes;
- private values stayed out, accepted payloads stayed state-only, and each
  commit preserved its exact acceptance provenance;
- the repeated-loss route retained a transport-created deadlock despite a
  solvable direct protocol baseline;
- static validation for six offline entrypoints, 33 required files, and 20
  JavaScript files with no external runtime dependency.

The retained v0.6 state-language gate, v0.5 16-run capsule probe, and v0.1–v0.4
tests also pass.

## Run

```bash
npm test
node tools/validate-static.mjs
node tools/capsule-probe.mjs
node tools/state-language-probe.mjs
node tools/state-transport-probe.mjs
```

## Visual verification

No live browser verification was requested for v0.7. Engine, probe, bundle,
navigation, and static checks passed. The earlier v0.5 rendered route remains
UNKNOWN because its publishing session's cloud browser blocked local URLs.

## Claim

Demonstrated: within one deterministic simulator, the exact v0.6 typed packets
can preserve consent, privacy, idempotence, bounded recovery, explicit refusal,
honest deadlock, and exact replay under ten frozen hostile-delivery routes.

Not demonstrated: a spontaneous or private machine language, subjective
understanding, whole-person identity, real networking, hostile-peer safety,
cryptographic identity, arbitrary schema compatibility, production
multiplayer, consciousness, fun, a generated RPG, merge, or canon.
