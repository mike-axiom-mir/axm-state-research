# Actor Capsule Crossing — Evidence Report v0.5.0

## Question

Can two independently recoverable actor states expose minimal projections to a
temporary shared world, collaborate there, and return only owner-approved
changes without fusing their sources?

## Contract tested

| Boundary | Mechanism |
|---|---|
| Disclosure | Export paths are checked against a fixed public allowlist. |
| Ownership | Every capsule binds an owner, source revision, and source digest. |
| Composition | Projections live under `capsules.<ownerId>`; collisions refuse. |
| Authority | Session operations mutate session projections only. |
| Collaboration | A shared signal requires matching independent receipts at one cell. |
| Return | A digest-bound packet proposes allowlisted deltas; it cannot write. |
| Consent | The source applies only the exact return paths selected by its owner. |
| Separation | Detach removes the projection and retains a receipt. |
| Recovery | Exact replay reconstructs session state and evidence. |

Private local notes and recovery tokens are deliberately present in each
fictional source so the tests can prove they are absent from exported capsules.

## Probe result

Sixteen deterministic runs all passed capsule verification, namespace
separation, source immutability before acceptance, receipt-backed shared
signalling, selective return, forged-packet refusal, and exact replay. Aster
accepted one signal delta; Briar explicitly accepted no fields. That asymmetry
is intentional: shared activity does not imply shared writeback policy.

## What this establishes

A small local protocol can treat participant-facing state as an owned,
consent-bounded projection rather than one fused database record. The session
can close while both source states remain independently recoverable.

## What it does not establish

- that a whole human or identity has been represented or moved;
- secure identity, signatures, encryption, revocation, or hostile-peer safety;
- network transport, matchmaking, persistence races, or server recovery;
- semantic compatibility between arbitrary games or state schemas;
- good gameplay, autonomous emergence, consciousness, or machine language;
- production readiness, merge, release, or canon status.

## Next falsifiable gate

Replace the human-readable action vocabulary with a typed state-language test:
two bounded actors receive one shared problem and may exchange only offers,
requested deltas, accept/refuse responses, and receipts. Measure completion,
deadlock, ambiguity, message count, information leakage, and replay.
