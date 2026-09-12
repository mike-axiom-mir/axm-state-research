# AXM Real-Project Closure Trial

This experiment tests the single gate proposed by Adaptive Closure Verifier against the canonical 242 AXM Workfloor Sentinel checks:

```text
silent stale outputs == 0
final oracle equality == true
all repairs retain provenance
audit + replay work < full oracle work
```

It imports Sentinel's check contracts, evaluators, snapshot loader, and file-change semantics from sibling `experiments/02-workfloor-sentinel`. It does not copy their source. The project snapshot is real State Floor source; the mutations and planted metadata faults are deterministic research fixtures.

The contribution claimed here is only the bounded integration and measurement of existing routing, tracing, auditing, replay, and minimization techniques under this frozen gate. No component-novelty claim is made.

## Gamer / plain-language explanation

Picture 242 guards watching a real game world. A few guards receive wrong watchlists. A training level may teach them missing routes and evidence. Then the watchlists freeze and a hidden level changes inputs training never used. If even one necessary guard sleeps, the cached world state is corrupted. The run passes only when there are zero silent misses, every repair leaves a receipt, the final world matches the all-guards oracle, and auditing plus replay wakes fewer guards than waking all 242 on every hidden-level change.

The analogy is only a guide. The authoritative result is the check-execution, output-equality, provenance, timing, and counterexample evidence in `results/raw/`.

## Frozen split and faults

`fixtures/mutation_split.json` is the machine-readable boundary. It contains six training mutations, six held-out mutations, no held-out oracle outputs, and five planted fault types:

- direct file dependency omission;
- a raw-results/derived-report dependency omission;
- incomplete permitted evidence access;
- a recursive conditional timing read not exposed in training; and
- dormant invalid metadata, quarantined rather than silently rewritten.

The held-out manifest hash is `72315d3330709384129c6a3589b47455beae5e166115f979869127f08afb362e`. The first frozen combined run passed, so the fixture was not tuned after a failure.

## Policies

All five policies start held-out evaluation from the same verified output checkpoint and the metadata each learned during training.

| Policy | Held-out behavior |
|---|---|
| `BROKEN_NO_AUDIT` | Broken declared routing only; retained failure control. |
| `DECLARED_RISK` | Audit checks selected by declared event risk families. |
| `OBSERVED_READS` | Use training-learned file/config reads and trace checks that awaken. |
| `COMBINED_RISK_OBSERVED` | Union declared-risk selection with observed awakened reads; frozen gate policy. |
| `FULL_ORACLE` | Execute all 242 checks on all six held-out mutations. |

The offline truth oracle runs only after policy routing, auditing, repair, and replay. It scores hidden stale outputs but never supplies routing or repair answers.

## Run

Python 3.11 or newer is required. The experiment uses only the standard library.

```bash
cd experiments/05-real-project-closure-trial
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
PYTHONDONTWRITEBYTECODE=1 python3 run_benchmarks.py
```

Reproduce a minimized miss with the command stored in `results/raw/counterexamples.json`, for example:

```bash
python3 run_benchmarks.py --verify-counterexample BROKEN_NO_AUDIT:boundary--software-not-hardware:held-direct-unseen-wording
```

The benchmark deterministically replaces its JSON/JSONL evidence and readable report. Timing values are host-specific.

## Result

The combined policy left zero silent stale outputs, ended exactly equal to the oracle, retained provenance for all four learned repairs across training and held-out phases, and used 110 held-out audit+replay check executions versus 1,452 full-oracle executions. The broken control retained 18 silent stale output occurrences. Observed-only retained three from the training-unseen conditional read; all 21 miss occurrences were minimized to reproducible one-mutation counterexamples.

See [FINAL_REPORT.md](FINAL_REPORT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [FAILURE_LIMITATIONS.md](FAILURE_LIMITATIONS.md), [NEXT_EXPERIMENT.md](NEXT_EXPERIMENT.md), and [results/BENCHMARK_RESULTS.md](results/BENCHMARK_RESULTS.md).
