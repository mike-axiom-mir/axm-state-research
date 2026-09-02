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

## Experiment 05 — AXM Real-Project Closure Trial

Experiment 05 imported Sentinel's canonical 242 checks and 24 evaluator forms without copying source. It planted five metadata/evidence fault types, trained on six mutations, froze metadata, then scored six disjoint held-out mutations without held-out oracle answers entering routing or repair.

| Held-out policy | Sparse checks | Audit checks | Replay checks | Missed wakes | Silent stale outputs | Final equality | Audit + replay |
|---|---:|---:|---:|---:|---:|:---:|---:|
| Broken/no audit | 41 | 0 | 0 | 3 | 18 | FAIL | 0 |
| Declared risk | 44 | 80 | 1 | 1 | 0 | PASS | 81 |
| Observed reads | 44 | 44 | 0 | 1 | 3 | FAIL | 44 |
| Combined risk + observed | 44 | 109 | 1 | 1 | 0 | PASS | 110 |
| Full oracle | 0 | 1,452 | 0 | 0 | 0 | PASS | 1,452 |

The frozen combined gate passed: zero silent stale outputs, exact final equality, provenance on every learned repair, and 92.4242% fewer audit+replay check executions than the 1,452-check full-oracle reference. It learned three edges and one permitted field across both phases and retained one dormant invalid metadata quarantine/unresolved item. Repeat and reversed-registration replay passed. Broken and observed-only failures produced 21 occurrence receipts, all minimized to reproducible one-mutation counterexamples.

This is a bounded integration/measurement result over one controlled split, not a novelty or completeness claim.

- [Final report](../experiments/05-real-project-closure-trial/FINAL_REPORT.md)
- [Raw benchmark JSON](../experiments/05-real-project-closure-trial/results/raw/benchmark_results.json)
- [Raw counterexamples](../experiments/05-real-project-closure-trial/results/raw/counterexamples.json)
- [Failures and limitations](../experiments/05-real-project-closure-trial/FAILURE_LIMITATIONS.md)

## Current strongest target

## Experiment 06 — Unlabeled Multi-Project Closure Challenge

Experiment 06 froze policy code, one training project version, two disjoint held-out project versions, ten unlabeled held-out mutations, and a checkpoint protocol before scoring. The candidate used ordinary event/check shape plus training-observed templates; held-out inputs carried no risk labels, oracle answers, or training probes.

| Held-out policy | Sparse | Audit/full | Replay | Reconstruction | Total policy work | Silent stale | Final equality |
|---|---:|---:|---:|---:|---:|---:|:---:|
| Broken sparse/no audit | 80 | 0 | 0 | 391 | 471 | 32 | FAIL |
| Observed reads | 86 | 86 | 0 | 391 | 563 | 8 | PASS |
| Structural audit | 80 | 118 | 6 | 391 | 595 | 0 | PASS |
| Combined structural + observed | 86 | 118 | 2 | 391 | 597 | 0 | PASS |
| Full oracle | 0 | 1,955 | 0 | 391 | 2,346 | 0 | PASS |

The candidate passed its frozen gate with 69.4629% fewer total policy check executions than the 1,955-check held-out full-oracle reference. The absent and corrupt checkpoints each triggered quarantine plus trusted full reconstruction; all 391 reconstruction executions counted. Workfloor Sentinel transfer used 313 versus 1,050 checks; Adaptive Closure transfer used 284 versus 905. All repairs/quarantines retained provenance.

Broken and observed policies produced 40 retained silent-stale occurrences and ten unique one-mutation minimized reproductions. The first-score embedded replay flags failed because timing-derived provenance entered the logical hash; an independent evidence-only normalizer retained that failure and verified repeat/reversed-order equality after removing only measurements and their derived hash.

- [Final report](../experiments/06-unlabeled-multiproject-closure-challenge/FINAL_REPORT.md)
- [Raw benchmark JSON](../experiments/06-unlabeled-multiproject-closure-challenge/results/raw/benchmark_results.json)
- [Raw counterexamples](../experiments/06-unlabeled-multiproject-closure-challenge/results/raw/counterexamples.json)
- [Post-score verification](../experiments/06-unlabeled-multiproject-closure-challenge/results/raw/post_score_verification.json)
- [Failures and limitations](../experiments/06-unlabeled-multiproject-closure-challenge/FAILURE_LIMITATIONS.md)

## Current strongest target

**Cross-version opaque recovery challenge:** change evaluator source across canonical versions, remove useful path-shaped parameters from opaque helpers, and include a checkpoint whose canonical source cannot be locally trusted. Preserve unresolved abstention/escalation rather than weakening the gate.
