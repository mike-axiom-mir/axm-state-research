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

## Experiment 03 — AXM Wakeup Fuzzer

At 256 registered checks and 10,000 mutations, declared sparse performed 80,000 handlers and completed in 1,311.057 ms versus polling's 8,458.360 ms. Polling asked 2,560,000 relevance questions; 2,480,000 were negative. A missing dependency caused 64 incorrect transitions and minimized to one mutation. Observed reads repaired that static omission but used a 105,717-byte registry versus 24,432 bytes for declared sparse.

- [Final report](../experiments/03-wakeup-fuzzer/FINAL_REPORT.md)
- [Raw benchmark JSON](../experiments/03-wakeup-fuzzer/results/raw/benchmark_results.json)
- [Failures and limitations](../experiments/03-wakeup-fuzzer/FAILURE_LIMITATIONS.md)

## Experiment 04 — AXM Adaptive Closure Verifier

At 10,000 transitions, the broken sparse control ended unequal. Fixed interval, seeded sample, declared risk, full oracle, and observed reconciliation all repaired/replayed to final equality, but maximum damage windows were 25, 131, 1, 1, and 0 transitions respectively. The observed policy used 13,436 audit handlers; declared risk used 30,216; full oracle used 60,000. These are six-node controlled-fixture results, not completeness proof.

A bounded State Debt fixture compared 10,000 explicit values/edges with 80 materialized positive values. Measured resident object bytes fell from 885,657 to 7,325 and JSON checkpoint bytes from 110,001 to 881 with exact output/replay equality.

- [Final report](../experiments/04-adaptive-closure-verifier/FINAL_REPORT.md)
- [Raw benchmark JSON](../experiments/04-adaptive-closure-verifier/results/raw/benchmark_results.json)
- [Raw fault matrix](../experiments/04-adaptive-closure-verifier/results/raw/fault_matrix.json)
- [Failures and limitations](../experiments/04-adaptive-closure-verifier/FAILURE_LIMITATIONS.md)

## Current strongest target

**Real-project closure trial:** apply declared-risk and observed-read reconciliation to Workfloor Sentinel's real checks, then attack them with a held-out mutation set. Publish every miss and minimize it.
