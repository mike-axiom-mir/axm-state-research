# AXM Unlabeled Multi-Project Closure — Final Report

## WORKED

- Policy semantics, project/version manifests, training, held out, and checkpoint protocol were frozen at commit `d804cc5f4a2bc863f2f2177daa89d77c1dcdc524` before the first score.
- The combined structural+observed candidate left zero silent stale outputs across ten unlabeled mutations on two disjoint held-out canonical project versions and ended equal to the oracle on each.
- Total candidate work counted 86 sparse, 118 audit, two replay, and 391 checkpoint-reconstruction executions: 597 total versus 1,955 full-oracle check executions.
- The absent Sentinel checkpoint and corrupt Adaptive Closure checkpoint were both detected, quarantined with provenance, and reconstructed only from verified canonical source. Neither was replayed untrusted.
- Two missing dependencies were detected and repaired inside their transitions; all repairs and quarantines retained provenance.
- The independent post-score normalizer verified repeated replay and reversed registration/order at logical hash `e1e223a1570d6697f716c1a787a77d6d70e5e56ebeab9817fbb788f80facafcf`.
- All 40 silent-stale occurrences from failing comparison policies were retained. Their ten unique minimized reproductions all replayed successfully.

## FAILED

- Broken sparse/no-audit retained 32 silent stale occurrences and ended unequal.
- Observed reads retained eight silent opaque-helper stale occurrences. They later self-healed, so final equality alone hid the damage.
- The first-score embedded repeat and reversed-order flags were both false because the logical hash retained a checkpoint-validation provenance hash derived from host timing. The original raw failure remains unchanged. A separate post-score evidence verifier removed only measurements and their derived hash, then passed repeat/order verification.
- Full oracle used 1,955 held-out check executions and also incurred the same 391 checkpoint reconstruction executions in the policy comparison, for 2,346 total.

## MEASURED

Host: CPython 3.12.13 on Linux x86_64. Times and Python object sizes are one-host observations.

| Policy | Sparse | Audit/full | Replay | Reconstruction | Total work | Silent stale | Max window | Final equality |
|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| Broken sparse/no audit | 80 | 0 | 0 | 391 | 471 | 32 | 4 | FAIL |
| Observed reads | 86 | 86 | 0 | 391 | 563 | 8 | 4 | PASS |
| Structural audit | 80 | 118 | 6 | 391 | 595 | 0 | 0 | PASS |
| Combined structural+observed | 86 | 118 | 2 | 391 | 597 | 0 | 0 | PASS |
| Full oracle | 0 | 1,955 | 0 | 391 | 2,346 | 0 | 0 | PASS |

The candidate used 69.4629% fewer check executions than the 1,955-execution held-out full-oracle reference. It observed 38 necessary wakes, two pre-audit missed wakes, 50 false wakes, 38 pre-repair stale outputs, 38 detected stale outputs, and zero silent outputs or windows.

| Held-out project/version | Checkpoint | Candidate work | Full reference | Silent | Equality |
|---|---|---:|---:|---:|:---:|
| Workfloor Sentinel v0.1.0 at tree `8006b291…` | absent | 313 | 1,050 | 0 | PASS |
| Adaptive Closure v0.1.0 at tree `53b39eb9…` | corrupt payload | 284 | 905 | 0 | PASS |

Candidate wall/CPU time was 691.831/691.793 ms. Sparse/audit/replay time was 20.077/32.203/0.041 ms; checkpoint validation/recovery was 0.891/133.569 ms; offline scoring-oracle time was 623.622 ms. Candidate provenance receipts totaled 5,019 canonical bytes across the two held-out versions. Final canonical state bytes were 113,409 and 244,177; retained Python object estimates were 294,386 and 359,255 bytes. These are not process-isolated memory measurements.

## UNKNOWN

- Whether structural transfer survives a helper with hidden reads and no useful public path parameter.
- Whether the same learned templates remain valid when evaluator source changes across canonical versions.
- Whether verified reconstruction remains cheaper over shorter traces or much larger registries.
- Whether checkpoint trust can be established across processes, runtimes, or machines without widening the trusted base.
- Whether these results survive organic histories, effectful checks, concurrent access, or additional project families.

## SURPRISE

Structural audit alone used two fewer executions than the combined candidate (595 versus 597) and also passed. The observed component prevented some sparse misses but added enough routing work that it did not improve the gate outcome in this fixture.

More importantly, observed-only ended oracle-equal despite eight silent stale occurrences. Final equality again overstated what the policy knew during the trace.

The raw replay flag failure was an evidence-design warning: even a provenance hash becomes non-deterministic when it commits to timing. Retaining that failed flag and adding a bounded independent normalizer was safer than rewriting the first score.

## NEXT

Run a frozen cross-version challenge where evaluator source changes, opaque helpers expose no path-shaped parameters, and at least one checkpoint cannot be reconstructed from a locally trusted source. Preserve the unresolved abstain/escalate outcome instead of weakening equality or work accounting.
