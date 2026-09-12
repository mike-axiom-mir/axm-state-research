# Architecture Notes

## Canonical state

The runtime owns one nested state object. Nodes receive a zero-copy `PermittedStateView` that permits only declared paths. Nodes emit proposals and cannot call other nodes. A cycle-level mutation guard hashes the state before handlers and checks it again before merge.

The view is an API boundary, not a security sandbox. Returned Python subobjects are still mutable; accidental persistent mutation is detected, but hostile mutate-then-restore behavior is outside this prototype.

## Change detection and sparse routing

Input path changes become typed events such as `material_changed` and `dimensions_changed`. Each event exposes:

- a broad semantic route key;
- one deterministic scope partition derived from event path and source.

The first variant in each family subscribes broadly. Generated scale variants subscribe to one of 128 exact partitions. This creates a controlled sparse workload while honestly labeling the nodes as variants rather than unique disciplines.

The router is an inverted index from subscription key to node contracts. Nodes never exchange direct messages, so registry size does not create an all-to-all graph.

## Scheduler and quiescence

For each cycle, the scheduler:

1. Routes only current events.
2. Sorts invocations deterministically by node ID and event identity.
3. Runs every handler against the same state snapshot.
4. Collects structured deltas and receipts.
5. Merges all proposals in sorted path order.
6. Converts accepted changes into the next event set.
7. Stops when no new accepted change exists.

The test workload stabilized in two or three iterations depending on scale and registered family coverage.

## Merge and conflict rules

- Independent paths merge.
- Identical values for the same path deduplicate.
- A unique highest-ranked authority can select a value only if its authority domain matches the output path's defined domain.
- Every disagreement is retained as a conflict object, including conflicts resolved by domain authority.
- Tied or non-domain disagreements remain unresolved and enter the escalation queue.
- No majority voting is used.
- Accepted provenance contains every identical supporting proposal's node, evidence references, confidence, and proposal hash.

Two optimization families deliberately disagree on `recommendations.primary_material` and `recommendations.primary_strategy`. Neither owns the `recommendations` domain, so both conflicts remain explicit and those target fields stay unset.

## Determinism boundary

Canonical JSON uses sorted keys, compact separators, UTF-8, and SHA-256. A replay fingerprint contains the final state hash and timing-free receipt payloads. Tests cover:

- repeated runs;
- reversed node registration;
- reversed execution order;
- sparse versus naive final-output equivalence.

This proves deterministic replay on the tested interpreter and data types. It does not yet prove cross-language, cross-Python-version, or cross-machine determinism. Floating-point values in future worlds need a stricter numeric representation.

## Naive comparison

The baseline uses the same nodes, handlers, events, subscriptions, merge gate, and expected output. Every cycle it scans every node and serializes/deserializes a complete current-state plus 48-event history packet separately for every node. Irrelevant nodes still perform packet evaluation but emit nothing.

This matches the requested naive architecture and is not an optimized competing design. A shared-snapshot full-scan baseline is required in the next experiment to separate routing gains from serialization gains.

## State versus history

Five hundred generated event sequences tested two predicates:

- whether load ever exceeded the current material's capacity;
- whether material changed more than twice.

Plain final values lacked maximum historical load and transition count. Enriching canonical state with exactly those two aggregates restored equivalence for these predicates. This is evidence for sufficient statistics, not evidence that arbitrary history can be discarded.
