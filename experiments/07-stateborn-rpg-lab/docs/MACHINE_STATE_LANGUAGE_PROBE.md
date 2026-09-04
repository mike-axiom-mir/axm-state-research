# Machine state language probe — Gate 3 result

Claim status: **IMPLEMENTED / PASS INSIDE A BOUNDED AUTHORED PROTOCOL**

## Hypothesis tested

A machine communication event can be a state change emitted by one bounded
system that another system distinguishes and uses, without a sentence channel.

## Implemented forms

| Code | Operation | State-only payload |
|---:|---|---|
| 0 | offer | consent-bounded vector |
| 1 | propose | contribution map, candidate count, offer digests |
| 2 | accept | exact proposal digest and reason code 0 |
| 3 | refuse | exact proposal digest and typed reason code |
| 4 | commit | proposal digest and two accept digests |

Free text, modified digests, and stale sequence numbers refuse before canonical
mutation. A local referee may commit only after both seats accept one exact
proposal.

## Frozen result

Five held-out fixtures produced two solved tasks, one explicit consent refusal,
and two deadlocks. All sessions excluded fictional private fixture values,
preserved sources, matched a direct public-state baseline, normalized across
reverse speaker order, and replayed exactly.

## Interpretation boundary

This supports coordination through state transitions under an agreed protocol.
It does not show that machines invented the symbols or share private meanings.
Humans authored the codes, dimensions, rules, fixtures, and observer labels.

## Next falsifiable test

Carry the same packets over a simulated transport that reorders, duplicates,
drops, delays, and reconnects messages. Preserve expiry, idempotence, explicit
deadlock, source recovery, and only consented return deltas.
