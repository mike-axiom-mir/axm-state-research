# AXM Real-Project Closure Trial — Final Report

## Gamer / plain-language explanation

There are 242 guards watching a real project. Several start with wrong watchlists. Training can repair only faults its training level exposes. Then the watchlists freeze and a hidden level changes unseen inputs. One necessary sleeping guard is enough to corrupt cached world state. The combined run passed because no corruption stayed silent, the final world equaled the all-guards oracle, every repair kept a receipt, and audit plus replay used fewer guard executions than waking all 242 every time.

This analogy does not widen the result. The metrics and boundaries below are authoritative.

This report claims a bounded integration and measurement, not novelty for any routing, read-tracing, auditing, replay, or minimization component.

## WORKED

- Experiment 05 imported all 242 canonical Workfloor Sentinel check contracts and 24 evaluator forms without copying their source.
- Six machine-readable training mutations were separated from six frozen held-out mutations. Held-out entries contain no training probes or oracle outputs; their manifest hash is `72315d3330709384129c6a3589b47455beae5e166115f979869127f08afb362e`.
- The first frozen combined run passed without post-failure fixture tuning: zero silent stale outputs, exact final oracle equality, provenance for every repair, and 110 audit+replay executions versus 1,452 full-oracle executions.
- The combined policy learned two file edges and one permitted field in training, then caught and learned the training-unseen conditional timing edge during held-out declared-risk audit.
- One dormant invalid metadata item was preserved as one quarantine/unresolved item rather than deleted or rewritten.
- Repeated combined replay and reversed check registration produced the same logical hash, `8b6b32f724a6c83684356b65a2ca425d3ee780fe43af6ac60181f7e254a057d6`.
- All 21 silent miss occurrences from failing policies were retained and minimized. They map to five unique policy/check counterexamples, each reproducible with one held-out mutation.

## FAILED

- `BROKEN_NO_AUDIT` retained 18 silent stale output occurrences, missed three necessary wakes, stayed stale in all six held-out transitions, reached a six-transition maximum window, and ended unequal.
- `OBSERVED_READS` did not generalize to the conditional timing read that training never executed. It retained three silent stale occurrences across the final three transitions and ended unequal.
- Full oracle reached equality but failed the strict work-reduction term by definition: 1,452 is not less than 1,452.
- The passing policies did not eliminate false routing work. Declared-risk and combined each recorded 25 false wakes among 44 sparse wakes.

## MEASURED

Host: CPython 3.12.13, Linux x86_64. Times are one run. Offline scoring-oracle time is excluded from policy component work and never routes or repairs.

| Policy | Sparse | Audit | Replay | Necessary | Missed wakes | False wakes | Silent stale outputs | Max window | Final equality | Audit + replay | Reduction vs 1,452 | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---:|---:|:---:|
| Broken/no audit | 41 | 0 | 0 | 20 | 3 | 24 | 18 | 6 | FAIL | 0 | 100.0000% | FAIL |
| Declared risk | 44 | 80 | 1 | 20 | 1 | 25 | 0 | 0 | PASS | 81 | 94.4215% | PASS |
| Observed reads | 44 | 44 | 0 | 20 | 1 | 25 | 3 | 3 | FAIL | 44 | 96.9697% | FAIL |
| Combined risk + observed | 44 | 109 | 1 | 20 | 1 | 25 | 0 | 0 | PASS | 110 | 92.4242% | PASS |
| Full oracle | 0 | 1,452 | 0 | 20 | 0 | 1,432 | 0 | 0 | PASS | 1,452 | 0.0000% | FAIL |

Combined training executed 54 sparse, 28 audit, and three replay checks. Across both phases it learned three edges and one field. Held out, one pre-repair stale output was detected and repaired within its transition, leaving zero silent transitions/windows. All four combined learned repairs across both phases have provenance receipts; the held-out repair count was one.

| Combined held-out timing | Result |
|---|---:|
| Wall time | 521.298 ms |
| CPU time | 521.270 ms |
| Sparse work | 8.566 ms |
| Audit work | 25.868 ms |
| Replay work | 0.188 ms |
| Offline scoring oracle | 472.658 ms |

Exact raw values, transition JSONL, repair JSONL, fixture snapshot, counterexamples, and evidence hashes are under `results/raw/`.

## UNKNOWN

- Whether risk+observed closure survives larger or organic histories, unlabeled changes, opaque reads, external state, concurrency, and effectful checks.
- Whether the same learned edges remain sufficient after check source or project structure changes.
- Whether a cheaper independent scoring method can replace the full offline oracle without hiding misses.
- How often declared risk tags are absent or wrong in a real workflow.
- Whether total policy work, receipt storage, and repair replay remain favorable with longer dependency chains.
- Whether replay/order determinism holds across operating systems, Python versions, processes, languages, or machines.

## SURPRISE

Declared risk passed with less audit+replay work than the combined policy: 81 versus 110 executions. The combined policy re-traced every awakened check, adding audit work without improving this fixture's zero-silent-miss result. Observed-only was cheaper still, but its final inequality showed why low work cannot be interpreted without the gate.

The offline oracle was also the dominant measured bottleneck: 472.658 ms of the combined 521.298 ms held-out wall time. That cost is required to score the experiment, although it is not part of the tested policy's routing or repair decision.

## NEXT

Run a frozen multi-project, unlabeled-risk closure challenge. Preserve the same no-leak boundary, add opaque/config-generator and rename/delete chains, require a clean verified checkpoint protocol, and score total policy work as well as audit+replay. Keep every miss and minimize before changing either the learning policy or fixtures.
