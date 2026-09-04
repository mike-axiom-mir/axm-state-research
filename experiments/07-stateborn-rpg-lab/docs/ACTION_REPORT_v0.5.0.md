# Stateborn v0.5.0 — Action Report

Date: 2026-09-04

## Requested direction

Turn the idea of moving a participant's state—not the participant or an
opaque account blob—into a testable local experiment. Preserve versions
v0.1, v0.2, and v0.3 as knowledge steps alongside v0.4 and the new result.

## Built

- `dist/capsule-world.js`: source ownership, capsule verification, temporary
  composition, shared receipt projection, return proposal, explicit
  acceptance, detachment, and replay;
- `dist/capsules.html`: a visual crossing bench for two fictional sources;
- `tests/capsule-world.test.mjs`: 13 boundary tests;
- `tools/capsule-probe.mjs`: 16 deterministic end-to-end crossings;
- navigation and offline static validation covering all four microscopes.

## Verified locally

- 62 / 62 automated tests passed across v0.1–v0.5;
- 16 / 16 capsule crossings verified both exports and distinct namespaces;
- 16 / 16 left source state unchanged before explicit acceptance;
- 16 / 16 created one receipt-backed shared signal;
- 16 / 16 applied a selective return for Aster and no return fields for Briar;
- 16 / 16 refused a forged return digest;
- 16 / 16 replayed exactly.

## Preserved knowledge chain

The five version archives are immutable named snapshots. v0.1 remains a useful
failure: whole-world copying and hashing does not scale. v0.2 introduces the
sparse fabric, v0.3 separates curiosity input from consequence, v0.4 separates
proposal seats from referee authority, and v0.5 separates source ownership
from temporary shared composition.

## Boundary

This is local structured-state composition. It is not human transfer, account
portability, cryptographic identity, secure networking, a production
multiplayer backend, machine consciousness, a finished RPG, merge, or canon.
