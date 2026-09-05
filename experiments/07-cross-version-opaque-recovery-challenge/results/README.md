# Result Evidence

The canonical first score is append-only evidence bound to semantic freeze commit
`3d35321ac1f99ee0cbf18a0ee81f812d94abbb59`.

- `BENCHMARK_RESULTS.md` — generated readable score.
- `raw/pre_score_freeze_receipt.json` — commit/tree and frozen file hashes.
- `raw/benchmark_results.json` — policy/project metrics and frozen gate result.
- `raw/execution_receipts.jsonl` — 124 node execution receipts.
- `raw/provenance_receipts.jsonl` — 21 training/checkpoint/escalation receipts.
- `raw/snapshot_scores.jsonl` — 84 post-action snapshot scores across policies.
- `raw/counterexamples.json` — 14 retained wrong-output occurrences.
- `raw/first_score_receipt.json` — hashes of every canonical result file.

Run `python verify_evidence.py` from the experiment directory to verify the freeze,
file hashes, report crosscheck, replay/order determinism, and all six unique
counterexample reproductions.
