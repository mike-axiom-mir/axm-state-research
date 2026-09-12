# Next experiment — Independent peer routing

## Gate

Move the exact v0.7 envelopes between separately running peers with separate
memory and recovery stores. Start with a manual copy/paste invitation and a
bounded local or direct transport so infrastructure cannot become hidden state
authority.

## Freeze before scoring

Freeze wire serialization, peer versions, invitations, retry/expiry rules,
recovery checkpoints, conflict fixtures, success/deadlock verifier, leakage
detector, and normalization before held-out runs.

## Measure

- byte-equal canonical envelopes across process boundaries;
- solved, refused, unavailable, conflicted, and deadlocked tasks;
- resumption when only one peer has a newer checkpoint;
- explicit refusal of conflicting or tampered checkpoints;
- peer disappearance without invented success;
- only explicitly accepted return deltas reaching either source;
- exact replay from each peer's independent evidence.

## Pass boundary

At least one held-out task must resume and solve across two independent
runtimes. A conflicting checkpoint must refuse, peer disappearance must stay
unavailable, both sources must remain independently recoverable, and each
peer's evidence must replay to the same accepted result.

A pass would support cross-runtime routing. It would not establish secure
Internet networking, NAT traversal, reliable free relays, cryptographic
identity, production multiplayer, human-state movement, consciousness, or an
evolved machine language.
