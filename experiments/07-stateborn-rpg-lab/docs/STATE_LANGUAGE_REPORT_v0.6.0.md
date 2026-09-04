# Typed Machine State Language — Evidence Report v0.6.0

## Question

Can two bounded deterministic actors coordinate on a shared target without a
natural-language payload channel, while keeping consent, ambiguity, failure,
source recovery, and replay inspectable?

## Protocol contract

| Boundary | Mechanism |
|---|---|
| Vocabulary | Five human-authored numeric opcodes. |
| Disclosure | Offers cannot exceed public inventory or consent vectors. |
| Proposal | One deterministic canonical split is selected; alternative count remains visible. |
| Consent | Each seat accepts or refuses the exact proposal digest. |
| Authority | A referee commits only after two matching accept digests. |
| Freshness | Packet sequence and prior-state digest must match. |
| Failure | Insufficient state deadlocks; policy conflict refuses. |
| Recovery | Source records never mutate; receipt replay reaches the same digest. |

## Held-out evidence

The fixture set was frozen at digest
`4a70fa25ce93be23e16dff144eb28a201e437589cba69b007c387c12c0c13b1f`
before scoring. Five held-out trials produced:

- `held-complement`: solved in 6 packets / 2,646 bytes;
- `held-ambiguous`: solved in 6 packets / 2,646 bytes with 3 unused valid
  alternatives retained;
- `held-refusal`: consent refused in 5 packets / 2,090 bytes;
- `held-insufficient`: deadlocked after 2 packets / 718 bytes;
- `held-consent-gap`: deadlocked after 2 packets / 718 bytes.

Every trial had zero private-value leakage, zero natural-language payloads,
unchanged sources, baseline agreement, order-normalized agreement, and exact
replay. Reverse actor order intentionally preserves a different raw receipt
order; only the logical outcome is normalized.

## Adversarial evidence

- a payload containing a text field refused with reason 19;
- a payload changed after sealing refused with reason 11;
- a once-valid packet submitted after state advanced refused with reason 13.

No attack changed its target state.

## What this establishes

Given a shared human-authored schema, deterministic actors can coordinate using
state offers and digest-bound consent rather than sentences. The protocol also
represents “no” and “cannot” as first-class outcomes instead of hiding them.

## What it does not establish

- that machines invented a language or attach subjective meaning to symbols;
- consciousness, desire, animal-like communication, or general intelligence;
- arbitrary game-schema translation or whole-person state representation;
- secure identity, real transport, hostile peer safety, or multiplayer scale;
- good gameplay, a finished RPG, production readiness, merge, or canon.

## Next gate

Run these exact packets through a deterministic hostile-transport simulator:
loss, duplication, reordering, delay, disconnect, reconnect, and expiry. A
successful result must preserve idempotence, explicit failure, independent
source recovery, and consent-bound return deltas.
