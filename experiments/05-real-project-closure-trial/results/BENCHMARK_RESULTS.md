# AXM Real-Project Closure Trial — Benchmark Results

The frozen gate policy is `COMBINED_RISK_OBSERVED`. Offline truth-oracle work scores hidden corruption and is reported separately from policy work.

| Policy | Sparse checks | Audit checks | Replay checks | Silent stale outputs | Max silent window | Learned edges | Fields | Quarantines | Final equality | Audit + replay | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---:|:---:|
| `BROKEN_NO_AUDIT` | 41 | 0 | 0 | 18 | 6 | 0 | 0 | 0 | FAIL | 0 | FAIL |
| `DECLARED_RISK` | 44 | 80 | 1 | 0 | 0 | 3 | 1 | 1 | PASS | 81 | PASS |
| `OBSERVED_READS` | 44 | 44 | 0 | 3 | 3 | 2 | 1 | 0 | FAIL | 44 | FAIL |
| `COMBINED_RISK_OBSERVED` | 44 | 109 | 1 | 0 | 0 | 3 | 1 | 1 | PASS | 110 | PASS |
| `FULL_ORACLE` | 0 | 1452 | 0 | 0 | 0 | 0 | 0 | 0 | PASS | 1452 | FAIL |

## Frozen held-out gate

- held-out manifest hash: `72315d3330709384129c6a3589b47455beae5e166115f979869127f08afb362e`;
- silent stale outputs: **0**;
- final oracle equality: **PASS**;
- repairs retain provenance: **PASS**;
- audit + replay work: **110** check executions versus **1452** for the full oracle (92.4242% reduction);
- combined gate: **PASS**.

## Work and timing

The combined held-out run executed 44 sparse checks, 109 audit checks, and 1 replay checks. It recorded 1 pre-repair stale output, detected 1 inside the transition, and left 0 silent.

Combined held-out wall/CPU time: 521.298 / 521.270 ms. Sparse/audit/replay work time: 8.566 / 25.868 / 0.188 ms. Offline scoring-oracle time: 472.658 ms.

## Determinism and retained failures

Repeat replay: **PASS**. Reversed registration: **PASS**.

The broken control retained 18 silent stale output occurrences. Observed-only retained 3. Every occurrence has a minimized reproduction record in `raw/counterexamples.json`.

## Boundary

This is one six-mutation held-out fixture over 242 deterministic checks from one real project snapshot. A pass does not prove complete dependency learning, production safety, or cross-machine determinism.
