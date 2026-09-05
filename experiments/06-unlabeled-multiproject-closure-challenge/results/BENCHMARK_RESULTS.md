# Unlabeled Multi-Project Closure — Benchmark Results

The frozen candidate is `COMBINED_STRUCTURAL_OBSERVED`. The scoring oracle runs after policy decisions and is timed separately.

| Policy | Sparse | Audit | Replay | Reconstruction | Total work | Full reference | Silent stale | Final equality | Gate reference |
|---|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|
| `BROKEN_SPARSE_NO_AUDIT` | 80 | 0 | 0 | 391 | 471 | 1955 | 32 | FAIL | comparison |
| `OBSERVED_READS` | 86 | 86 | 0 | 391 | 563 | 1955 | 8 | PASS | comparison |
| `STRUCTURAL_AUDIT` | 80 | 118 | 6 | 391 | 595 | 1955 | 0 | PASS | comparison |
| `COMBINED_STRUCTURAL_OBSERVED` | 86 | 118 | 2 | 391 | 597 | 1955 | 0 | PASS | candidate |
| `FULL_ORACLE` | 0 | 1955 | 0 | 391 | 2346 | 1955 | 0 | PASS | comparison |

## Frozen gate

- silent stale outputs: **0**;
- final oracle equality: **PASS**;
- repair/quarantine provenance: **PASS**;
- total policy work: **597** versus **1955** full-oracle check executions;
- gate: **PASS**.

## Transfer and checkpoint behavior

| Held-out project/version | Checkpoint | Checks | Mutations | Total policy work | Full reference | Silent stale | Equality |
|---|---|---:|---:|---:|---:|---:|:---:|
| `adaptive-closure-v0.1.0-at-7ba2b1d` | `corrupt_payload` | 181 | 5 | 284 | 905 | 0 | PASS |
| `workfloor-sentinel-v0.1.0-at-7ba2b1d` | `absent` | 210 | 5 | 313 | 1050 | 0 | PASS |

Checkpoint validation/recovery work is included above as reconstruction check executions. The candidate recorded 2 checkpoint quarantines and 0 unresolved recoveries. Offline scoring used 1955 executions and 623.622 ms.

## Determinism and retained misses

Repeated replay: **FAIL**. Reversed registration/order: **FAIL**.

Failing comparison policies produced 40 retained miss occurrences. Every occurrence has a minimized reproduction in `counterexamples.json`.

## Boundary

This is a frozen controlled challenge over named canonical repository subtrees and in-memory mutations. It makes no component-novelty, production, AI, model-weight, substrate, or cross-machine claim.

Held-out manifest SHA-256: `2d3b07b3f5eaf5bac06c739d7ff3e3ac9a45f71daff757b7c18d37eb601da251`.
