# Retained Transport Failure — Rejected Packet Poisoned Deduplication

Date observed: 2026-09-04  
Frozen fixture digest: `937ea582ce4576bdff15fb1afebbece7c9f11e2b138860d66cfcbc381f948079`

## First observed result

The first score after freezing the v0.7 route universe produced 6 solved, 1
refused, and 3 deadlocked routes. `held-corrupt-retry` deadlocked instead of
matching its expected solved outcome, so the gate failed.

This observation was printed during development before the raw result artifact
was sealed. It is retained here as a development receipt, not misrepresented
as a separate raw capture.

## Cause

The corrupt envelope deliberately changed packet contents while retaining the
original intended packet digest. The state-language engine correctly refused
the mismatch. The transport layer then incorrectly inserted that rejected
digest into its delivered-digest set. When the sender retried the clean packet,
deduplication suppressed it as though the corrupt attempt had been accepted.

## Minimal repair

Transport now inserts a digest into duplicate tracking only after the
state-language engine returns `APPLIED`. Refused, corrupt, stale, and expired
attempts do not become replay barriers.

The route definitions and frozen fixture digest were not changed. The same
`held-corrupt-retry` route then solved. An automated regression asserts that
the tampered attempt refuses, the clean retry applies, and exact replay still
passes.

## Why retain it

Transport-level receipt identity and state-level acceptance are different
facts. Treating “seen” as “applied” can convert recoverable corruption into a
false permanent deadlock. That distinction is now part of the v0.7 contract.
