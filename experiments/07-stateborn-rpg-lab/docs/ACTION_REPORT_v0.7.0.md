# Stateborn v0.7.0 — Action Report

Date: 2026-09-04

## Requested direction

Continue the bottom-up experiment by placing the exact state-language packets
under hostile delivery. Let trying teach the system, keep useful failures, and
do not mistake a game-shaped microscope for a real RPG or multiplayer system.

## Built

- `dist/state-transport.js`: a deterministic transport harness with envelopes,
  queue ticks, bounded retry, deduplication, expiry, reordering,
  disconnect/reconnect, digest-bound checkpoint recovery, and exact replay;
- `dist/transport.html`: an offline tick-by-tick transport microscope;
- `tests/state-transport.test.mjs`: 18 contract, fault, privacy, consent,
  recovery, retained-failure, determinism, and replay tests;
- `tools/state-transport-probe.mjs`: a frozen ten-route held-out gate;
- `results/raw/state_transport_probe.json`: the reproducible raw result;
- updated navigation and static validation across six microscopes.

## Verified locally

- 97 / 97 tests passed across v0.1–v0.7;
- held-out outcomes: 7 solved, 1 consent refusal, 2 deadlocked;
- 56 attempted sends, 49 accepted packets, and 24,960 transmitted bytes;
- all requested fault families appeared in the evidence ledger;
- duplicate and expired deliveries caused no state effect;
- interrupted recovery solved from a digest-bound checkpoint;
- private fixture values stayed out and accepted payloads stayed state-only;
- every commit retained exact consent provenance;
- all source records stayed unchanged and all routes replayed exactly;
- static validation passed 33 required files and 20 JavaScript files with no
  external runtime dependency.

## Learning retained

The first run after freezing the routes exposed a defect in corrupt-packet
recovery: the rejected packet entered duplicate tracking and caused its later
clean retry to be suppressed. The minimal repair adds a packet digest to the
delivered set only after the underlying state-language engine accepts it. The
fixture digest remained unchanged and the route is now a regression test.

Repeated loss still exhausts its bounded attempts and deadlocks even though
the direct protocol baseline solves. That result is retained, not optimized
away.

## Boundary

This is one deterministic process simulating transport. No socket, browser
peer connection, public network, relay, cryptographic peer identity, account,
AI model, real personal data, or production backend is connected. It is not a
finished RPG, secure multiplayer implementation, merge, release, or canon
action.
