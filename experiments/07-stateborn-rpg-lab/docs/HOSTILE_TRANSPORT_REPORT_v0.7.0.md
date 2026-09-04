# Hostile State-Packet Transport — Evidence Report v0.7.0

## Question

Can the exact v0.6 typed packets preserve consent, privacy, idempotence,
recovery, honest failure, and replay when a deterministic transport drops,
duplicates, delays, reorders, expires, corrupts, or interrupts delivery?

## Frozen contract

The twelve-route universe contains two training routes and ten held-out routes.
It was frozen at digest
`937ea582ce4576bdff15fb1afebbece7c9f11e2b138860d66cfcbc381f948079`.
Scoring uses only the held-out routes.

The v0.6 packet schema is unchanged. A transport envelope binds the packet,
send tick, delivery tick, expiry tick, attempt, and fault evidence. Retry and
tick limits are explicit. The state-language engine remains the sole authority
for accepting or refusing a delivered packet.

## Held-out evidence

| Route | Outcome | Ticks | Attempts | Accepted | Transport bytes | Key evidence |
|---|---:|---:|---:|---:|---:|---|
| `held-drop-retry` | solved | 7 | 7 | 6 | 3,005 | one drop, then retry |
| `held-duplicate` | solved | 6 | 6 | 6 | 3,169 | one duplicate suppressed |
| `held-delay` | solved | 9 | 6 | 6 | 2,646 | delayed delivery |
| `held-reorder-stale` | solved | 8 | 7 | 6 | 3,005 | reorder and stale refusal |
| `held-disconnect-recover` | solved | 9 | 6 | 6 | 2,646 | checkpoint recovery pass |
| `held-expiry-retry` | solved | 10 | 7 | 6 | 3,070 | one expiry, then retry |
| `held-corrupt-retry` | solved | 7 | 7 | 6 | 3,175 | tamper refusal, clean retry |
| `held-consent-refusal` | refused | 5 | 5 | 5 | 2,449 | policy refusal remains terminal |
| `held-insufficient` | deadlocked | 3 | 2 | 2 | 718 | `STATE_INSUFFICIENT` |
| `held-loss-exhaustion` | deadlocked | 4 | 3 | 0 | 1,077 | three drops; attempts exhausted |

Aggregate result: 7 solved, 1 refused, 2 deadlocked; 56 attempted sends, 49
accepted packets, 24,960 transmitted bytes, 4 drops, 2 duplicates suppressed,
1 expiry, 1 reorder, 1 disconnect, and 1 successful recovery.

Every route matched its expected outcome, replayed exactly, preserved both
source digests, kept private values out, kept accepted payloads state-only, and
kept committed deltas bound to exact consent packets. Duplicates and expired
envelopes caused no second canonical effect.

## Counterfactual failure

`held-loss-exhaustion` is intentionally important: its direct state-language
baseline solves, but the hostile route drops every bounded attempt and ends in
`TRANSPORT_ATTEMPTS_EXHAUSTED`. The harness therefore distinguishes a protocol
deadlock from a transport-created failure instead of rewriting unavailability
as success.

## Repair learned from the frozen run

The first corrupt-retry run exposed a rejected-packet deduplication defect.
The corrupt envelope kept the original intended packet digest; after refusal,
that digest was incorrectly recorded as delivered, so the clean retry was
suppressed. Duplicate barriers now record only packets the state-language
engine accepted. The frozen fixture universe did not change. See
`RETAINED_TRANSPORT_FAILURE_v0.7.0.md` for the preserved failure account.

## What this establishes

Within one deterministic simulator, the authored state protocol has explicit
semantics for hostile delivery, retry, idempotence, expiry, interruption,
recovery, refusal, and bounded transport failure.

## What it does not establish

- real cross-process, browser, Internet, NAT, or relay behavior;
- cryptographic transport security or trustworthy peer identity;
- arbitrary adversaries, Byzantine peers, or production multiplayer scale;
- a machine-invented language, consciousness, or whole-person state;
- good gameplay, a generated RPG, merge, release, or canon.
