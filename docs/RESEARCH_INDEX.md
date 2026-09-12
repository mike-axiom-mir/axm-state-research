# Research Index

This page indexes measured results. It does not widen their claim boundaries.

## Experiment 01 — AXM State Floor v0.1.0

The first experiment tested a canonical deterministic state, sparse event routing, many small perspective functions, structured receipts, and an evidence-preserving merge/conflict gate.

| Measurement | Result |
|---|---:|
| Registered nodes | 10,000 |
| Triggered nodes | 159 |
| Node executions | 188 |
| Nodes changing state | 9 |
| Accepted deltas | 11 |
| Explicit unresolved conflicts | 2 |
| Dormant nodes | 98.41% |
| Registry + router memory | 3,658,200 bytes |
| Repaired sparse wall time | 158.105 ms |
| Naive baseline wall time | 53,936.096 ms |
| Pre-cache sparse wall time | 667.410 ms |
| Plain-state/history mismatches | 407 / 500 cases |
| Enriched-state/history agreement | 500 / 500 cases for two tested predicates |

The pre-cache run exposed repeated canonical-state hashing as a bottleneck. A cycle-level hash cache repaired that measured implementation issue. State was insufficient when temporal evidence had not been represented; after enriching the schema with the missing evidence, the two tested predicates agreed with full-history evaluation.

- [Final report](../experiments/01-state-floor/FINAL_REPORT.md)
- [Raw benchmark JSON](../experiments/01-state-floor/results/benchmark_results.json)
- [Pre-cache raw benchmark JSON](../experiments/01-state-floor/results/pre_hash_cache/benchmark_results.json)
- [Failures and limitations](../experiments/01-state-floor/FAILURE_LIMITATIONS.md)
- [Next experiment proposed at completion](../experiments/01-state-floor/NEXT_EXPERIMENT.md)

## Experiment 02 — AXM Workfloor Sentinel v0.1.0

The second experiment attacked sparse routing with controlled in-memory changes to a real State Floor source snapshot. All three modes used the same 242 check contracts and evaluators.

| Measurement | Defective map | Repaired map |
|---|---:|---:|
| Registered checks | 242 | 242 |
| Perspective families | 21 | 21 |
| Real source files | 27 | 27 |
| Controlled changes | 7 | 7 |
| Sparse wakes | 58 | 59 |
| Necessary wakes | 23 | 23 |
| Missed wakes | 1 | 0 |
| False wakes | 36 | 36 |
| Final output equivalence | FAIL | PASS |

| Repaired-run measurement | Result |
|---|---:|
| Sparse wall time | 101.614 ms |
| Shared full-scan wall time | 795.143 ms |
| Duplicated-packet baseline wall time | 3,816.443 ms |
| Baseline duplicated bytes | 401,987,894 bytes |
| False wake-up rate | 61.0169% |
| Evaluation reduction vs full scan | 96.5171% |
| Repeated replay hashes | PASS |
| Reversed registration order | PASS |

The deliberately incomplete dependency map missed one necessary check. Repairing that known edge removed the miss across this seven-change fixture, but did not establish dependency completeness in general. False wake-ups became the clearest measured routing inefficiency.

- [Final report](../experiments/02-workfloor-sentinel/FINAL_REPORT.md)
- [Raw result JSON](../experiments/02-workfloor-sentinel/results/sentinel_results.json)
- [Failures and limitations](../experiments/02-workfloor-sentinel/FAILURE_LIMITATIONS.md)
- [Next experiment proposed at completion](../experiments/02-workfloor-sentinel/NEXT_EXPERIMENT.md)

## Current strongest target

**AXM Wakeup Fuzzer:** generate dependency-aware source and state mutations, compare sparse execution against a full oracle, minimize any missed-wake counterexample, and measure whether false wake-ups can fall without allowing misses.
