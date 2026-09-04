# Stateborn v0.6.0 — Action Report

Date: 2026-09-04

## Requested direction

Continue the bottom-up experiment and test whether machines can coordinate by
state rather than by human conversation. Preserve every earlier knowledge step
and keep failures useful.

## Built

- `dist/state-language.js`: a deterministic offer/propose/accept/refuse/commit
  packet engine with consent, digests, sequence checks, idempotence, deadlock,
  normalized outcome comparison, and exact replay;
- `dist/language.html`: an offline microscope separating the raw machine
  channel from human observer interpretation;
- `tests/state-language.test.mjs`: 17 protocol and boundary tests;
- `tools/state-language-probe.mjs`: a frozen five-fixture held-out gate plus
  free-text, tamper, and stale-packet attacks;
- updated navigation and static validation across five microscopes.

## Verified locally

- 79 / 79 tests passed across v0.1–v0.6;
- held-out outcomes: 2 solved, 1 refused, 2 deadlocked;
- 0 private fixture values and 0 prose values entered accepted payloads;
- every accepted joint delta was bound to both exact acceptance digests;
- source records stayed unchanged;
- forward and reverse offer orders had identical normalized outcomes;
- exact replay and the direct public-state baseline agreed on every fixture;
- all three adversarial packets failed closed;
- static validation passed 28 required files and 17 JavaScript files with no
  external runtime dependency.

## Boundary

The protocol demonstrates bounded coordination, not an evolved machine
language. Human authors supplied the schema and semantics. No model, network,
account, real personal data, cryptographic identity, or production backend is
connected. This is not a finished RPG, merge, release, or canon action.
