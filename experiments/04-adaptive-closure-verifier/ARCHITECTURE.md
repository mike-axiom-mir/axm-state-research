# Architecture

## Foundation reuse

Canonical hashing and deep-size measurement import from the sibling [AXM State Floor](../01-state-floor/). No prior experiment source is copied.

## Fixture

Six deterministic nodes exercise five controlled failures:

| Fault | Failure surface |
|---|---|
| Missing direct dependency | `direct` reads `direct_b` but does not subscribe to it. |
| Missing indirect edge | A producer changes, but its consumer omits the producer-output event. |
| Incomplete permitted slice | `slice` wakes but cannot read `slice_evidence`; it returns a typed abstention. |
| Branch-dependent reads | Cold state reads `branch_p`; after `mode` flips it reads undeclared `branch_q`. |
| Dormant incorrect state | An invalid negative value remains inert until the dormant perspective activates, then returns an explicit abstention. |

Every policy uses the same handlers. Only routing, audit selection, metadata evidence, and repair timing differ.

## Audit boundary

The harness computes a full truth oracle after every transition so the report can count hidden damage. That offline measurement is never used as a risk signal. `policy_work_time_ns` excludes its time; selected audit handlers remain charged to the policy.

`RISK_ADAPTIVE` may audit on only declared/runtime-visible signals:

- a new event shape;
- stale age since the last full verification;
- execution of a high-authority node;
- an explicit missing-evidence/invalid-state abstention.

These signals happened to catch every repairable planted fault within one transition. That is fixture evidence, not proof against an unsignaled omission.

## Explicit repair transaction

On discrepancy or read-set evidence:

1. preserve current output, oracle output, read trace, metadata before/after, and action;
2. add only a traced missing dependency or permitted field;
3. quarantine when no safe metadata repair exists;
4. return to the last fully verified checkpoint;
5. re-materialize cached outputs under amended metadata;
6. replay the bounded recorded suffix;
7. compare the final output map with the full oracle.

No state value, event, failed variant, or provenance record is silently rewritten.

## Observed-read reconciliation

The observed policy traces all nodes once at cold start. It then traces awakened nodes and performs a complete trace every 20 transitions. A changed read set can add an evidenced missing edge before an output becomes stale. In this fixture it learned the branch's `branch_q` edge when `mode` changed.

Read tracing is not complete for opaque calls, external state, concurrency, effects outside the wrapper, or unexecuted branches. It is validation machinery, not a universal dependency oracle.

## Determinism

Fixed events and seeds, sorted routing, canonical hashes, repeat replay, and reversed registration are tested. Timing fields are excluded from logical replay hashes. Cross-language, cross-machine, and concurrent determinism remain untested.

## State Debt fixture

A separate fixture compares 10,000 explicit perspective values and index edges against 80 positive values with implicit zero/default reads. It measures Python object-graph bytes, UTF-8 JSON checkpoint bytes, writes, reads, edges, and materializations while requiring identical output and replay. These units describe this fixture only.
