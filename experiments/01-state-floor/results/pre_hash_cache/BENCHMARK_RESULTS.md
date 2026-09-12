# AXM State Floor — Benchmark Results

Generated from raw `benchmark_results.json`; durations are single-process Python measurements on the recorded host.

| Registered | Triggered | Changing | Dormant | Sparse wall ms | Naive wall ms | Naive / sparse | Replay | Order invariant | Output equivalent |
|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|:---:|
| 10 | 7 | 7 | 30.00% | 10.600 | 24.661 | 2.33× | PASS | PASS | PASS |
| 100 | 13 | 9 | 87.00% | 49.143 | 279.929 | 5.70× | PASS | PASS | PASS |
| 1,000 | 31 | 9 | 96.90% | 87.209 | 2864.692 | 32.85× | PASS | PASS | PASS |
| 10,000 | 159 | 9 | 98.41% | 667.410 | 56228.582 | 84.25× | PASS | PASS | PASS |

## State versus history

- Generated cases: 500
- Plain current-state mismatches: 407
- Enriched-state mismatches: 0
- Lost information: material transition count absent, maximum historical load absent

## Interpretation boundary

These results demonstrate this implementation and workload only. They do not establish general AI replacement, hardware-level execution, universal state sufficiency, or cross-language/cross-machine determinism.
