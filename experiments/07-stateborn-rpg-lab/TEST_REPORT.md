# AXM Stateborn RPG Lab v0.7.0 — Test Report

Tested: 2026-09-04

## Result

**PASS within the v0.7.0 local experimental boundary**

97 / 97 automated tests passed across the retained v0.1–v0.7 chain. This does
not prove a natural machine language, consciousness, human-state transfer,
secure networking, open-ended emergence, or a generated RPG.

## Automated verification

- 12 original canonical-state and receipt-integrity tests;
- 13 sparse living-world and autonomous-reciprocity tests;
- 11 curiosity-loop tests;
- 13 coexistence tests;
- 13 actor-capsule ownership, consent, return, and recovery tests;
- 17 typed state-language, consent, ordering, attack, and replay tests.
- 18 hostile-transport, retry, recovery, deduplication, expiry, and replay tests.

Static validation covers six offline HTML entrypoints, 20 JavaScript files,
all local navigation, the hosting declaration, and 33 required files. No
external runtime dependency was found.

## Frozen hostile-transport gate

Fixture digest:
`937ea582ce4576bdff15fb1afebbece7c9f11e2b138860d66cfcbc381f948079`

| Held-out route | Outcome | Ticks | Attempts | Transport event |
|---|---:|---:|---:|---|
| drop retry | solved | 7 | 7 | 1 drop |
| duplicate | solved | 6 | 6 | 1 duplicate suppressed |
| delay | solved | 9 | 6 | 1 delay |
| reorder stale | solved | 8 | 7 | 1 reorder, 1 stale refusal |
| disconnect recover | solved | 9 | 6 | 1 disconnect, 1 recovery pass |
| expiry retry | solved | 10 | 7 | 1 expiry |
| corrupt retry | solved | 7 | 7 | 1 tamper refusal |
| consent refusal | refused | 5 | 5 | 1 duplicate suppressed |
| insufficient | deadlocked | 3 | 2 | state insufficient |
| loss exhaustion | deadlocked | 4 | 3 | 3 drops; attempts exhausted |

The ten routes total 56 attempted sends, 49 accepted packets, and 24,960
transmitted bytes. Seven solve, one refuses, and two deadlock. Every expected
outcome, replay, source digest, consent binding, privacy check, state-only
payload check, duplicate no-effect check, and expiry no-effect check passed.
The disconnect route recovered from a checkpoint. The repeated-loss route is
retained as a transport failure even though its direct protocol baseline
solves.

The first frozen corruption run exposed a deduplication bug. A refused corrupt
delivery had been recorded as delivered and suppressed the later clean retry.
Only accepted packets now enter the delivered set; the unchanged frozen route
then solved, and the regression is tested.

## Frozen state-language gate

Fixture digest:
`4a70fa25ce93be23e16dff144eb28a201e437589cba69b007c387c12c0c13b1f`

| Held-out fixture | Outcome | Accepted packets | Bytes | Ambiguity |
|---|---:|---:|---:|---:|
| complement | solved | 6 | 2,646 | 0 |
| ambiguous | solved | 6 | 2,646 | 3 |
| refusal | refused | 5 | 2,090 | 0 |
| insufficient | deadlocked | 2 | 718 | 0 |
| consent gap | deadlocked | 2 | 718 | 0 |

All five runs kept private fixture values out of the session, used no
natural-language payload values, left both source records unchanged, agreed
with the direct public-state baseline, produced the same normalized result
under reverse offer order, and replayed exactly. The raw receipt order remains
visible and is not falsely described as identical.

Adversarial checks refused a free-text field with reason code 19, a modified
packet with reason code 11, and a stale packet with reason code 13. Each refusal
left the target canonical state unchanged.

## Retained evidence

The v0.6 five-fixture protocol result, v0.5 16-run capsule result, and all
v0.1–v0.4 tests still pass. v0.1 keeps
its failed whole-world scale profile; later sparse results do not rewrite it.

## Browser interaction verification

No live browser or visual acceptance run was requested for v0.7. Engine tests,
the held-out probes, bundle syntax, navigation, and offline static validation
are complete. The browser surface is an inspection instrument, not evidence
that the protocol is fun or generally usable.

## Truth boundary

Observed: the exact bounded v0.6 state packets can preserve consent, privacy,
idempotence, recovery, explicit refusal, honest deadlock, and exact replay
through ten deterministic hostile-delivery routes.

Not proven: spontaneous semantics, subjective understanding, animal-like
communication, arbitrary schema compatibility, identity transfer, real
network safety, adversarial cryptographic security, production multiplayer,
good gameplay, merge, release, or canon status.
