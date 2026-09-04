# Next experiment — Hostile state-packet transport

## Gate

Move the exact v0.6 typed packets through a deterministic simulated transport
instead of delivering them directly in process. Inject bounded loss,
duplication, delay, reordering, disconnect, reconnect, and expiry.

## Freeze before scoring

Freeze transport schedules, retry/expiry rules, actor-visible state, recovery
checkpoints, consent rules, success/deadlock verifier, leakage detector, and
normalization before held-out runs.

## Measure

- solved, refused, expired, and deadlocked tasks;
- attempts, accepted packets, duplicate suppression, and bytes;
- convergence after reordering and reconnect;
- stale or ambiguous packets retained as explicit receipts;
- independent source recovery after interrupted sessions;
- only explicitly accepted return deltas reaching either source;
- exact replay under the frozen fault schedule.

## Pass boundary

At least one held-out task must recover and solve after interruption, while
duplicates apply no effect, expired or stale messages fail closed, unresolved
sessions stay unresolved, both sources remain independently recoverable, and
replay reproduces every final outcome.

A pass would support a simulated transport protocol. It would not establish
secure networking, hostile Internet safety, identity, production multiplayer,
human-state movement, consciousness, or an evolved machine language.
