# AXM State Floor — Benchmark Results

Generated from raw `benchmark_results.json`; durations are single-process Python measurements on the recorded host.

| Registered | Triggered | Changing | Dormant | Sparse wall ms | Naive wall ms | Naive / sparse | Replay | Order invariant | Output equivalent |
|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|:---:|
| 10 | 7 | 7 | 30.00% | 7.404 | 21.974 | 2.97× | PASS | PASS | PASS |
| 100 | 13 | 9 | 87.00% | 26.035 | 343.736 | 13.20× | PASS | PASS | PASS |
| 1,000 | 31 | 9 | 96.90% | 79.667 | 3968.625 | 49.82× | PASS | PASS | PASS |
| 10,000 | 159 | 9 | 98.41% | 158.105 | 53936.096 | 341.14× | PASS | PASS | PASS |

## State versus history

- Generated cases: 500
- Plain current-state mismatches: 407
- Enriched-state mismatches: 0
- Lost information: material transition count absent, maximum historical load absent

## Interpretation boundary

These results demonstrate this implementation and workload only. They do not establish general AI replacement, hardware-level execution, universal state sufficiency, or cross-language/cross-machine determinism.
