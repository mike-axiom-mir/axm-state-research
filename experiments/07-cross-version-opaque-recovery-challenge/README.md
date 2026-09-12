# Experiment 07 — Cross-Version Opaque Recovery Challenge

This experiment is the next boss after unlabeled multi-project closure.

Gamer version: the safety NPC kept the same name and buttons, but a patch changed
which hidden world flag it reads. Later, one save belongs to a version whose NPC
code is missing. A bad runtime keeps showing an old green light. The candidate
runs the changed-but-available NPC as a tiny guarded fallback, and for the missing
NPC it shows **UNRESOLVED** and sends that item to the escalation queue. It is not
allowed to “win” by marking the whole game unresolved.

The experiment uses 12 deterministic software nodes, two six-change held-out
worlds, a v1-bound checkpoint, one unavailable evaluator source, five comparison
policies, a full oracle, typed receipts, automatic counterexample minimization,
and a frozen 85% resolved-coverage gate.

## Run

Python 3.11+ and the standard library are sufficient.

```bash
python run_benchmarks.py --verify-freeze-only
python -m unittest discover -s tests -v
python verify_evidence.py
```

`run_benchmarks.py` refuses to overwrite the committed first score. Use explicit
temporary `--output-dir` and `--report` paths for a fresh non-canonical run.

## Evidence map

- [Architecture](ARCHITECTURE.md)
- [Benchmark results](results/BENCHMARK_RESULTS.md)
- [Final report](FINAL_REPORT.md)
- [Failures and limitations](FAILURE_LIMITATIONS.md)
- [Next experiment](NEXT_EXPERIMENT.md)
- `results/raw/benchmark_results.json` — structured score
- `results/raw/execution_receipts.jsonl` — node execution receipts
- `results/raw/provenance_receipts.jsonl` — checkpoint/escalation provenance
- `results/raw/snapshot_scores.jsonl` — post-action oracle comparisons
- `results/raw/counterexamples.json` — retained minimized misses

## Boundary

This is a controlled software-runtime experiment. It does not model CPU/GPU
hardware nodes, prove production safety, reconstruct unavailable source, establish
component novelty, or demonstrate anything about biological brains.
