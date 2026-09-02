# Benchmark Results

Raw source of truth: [`raw/benchmark_results.json`](raw/benchmark_results.json), [`raw/broken_repaired.json`](raw/broken_repaired.json), [`raw/counterexample.json`](raw/counterexample.json), [`raw/cascade_results.json`](raw/cascade_results.json), and 500 compact transition receipts in [`raw/fuzz_transitions_100.jsonl`](raw/fuzz_transitions_100.jsonl). The compact receipts retain counts, set hashes, misses, mismatches, and output hashes without repeating the full 256-ID full-scan set on every line.

Seed: `20260902`. Registered checks: `256`. Host: CPython 3.12.13, Linux 6.18.35 x86_64.

## Scaling summary

| Mutations | Mode | Executed | Condition probes | Negative probes | Output changes | Misses | Wall time |
|---:|---|---:|---:|---:|---:|---:|---:|
| 100 | Polling | 800 | 25,600 | 24,800 | 611 | 0 | 80.599 ms |
| 100 | Declared sparse | 800 | 100 | 0 | 611 | 0 | 12.245 ms |
| 100 | Observed | 800 | 100 | 0 | 611 | 0 | 20.800 ms |
| 100 | Shared | 800 | 200 | 0 | 611 | 0 | 12.428 ms |
| 1,000 | Polling | 8,000 | 256,000 | 248,000 | 6,133 | 0 | 855.910 ms |
| 1,000 | Declared sparse | 8,000 | 1,000 | 0 | 6,133 | 0 | 125.157 ms |
| 1,000 | Observed | 8,000 | 1,000 | 0 | 6,133 | 0 | 198.517 ms |
| 1,000 | Shared | 8,000 | 2,000 | 0 | 6,133 | 0 | 126.379 ms |
| 10,000 | Polling | 80,000 | 2,560,000 | 2,480,000 | 60,861 | 0 | 8,458.360 ms |
| 10,000 | Declared sparse | 80,000 | 10,000 | 0 | 60,861 | 0 | 1,311.057 ms |
| 10,000 | Observed | 80,000 | 10,000 | 0 | 60,861 | 0 | 2,109.929 ms |
| 10,000 | Shared | 80,000 | 20,000 | 0 | 60,861 | 0 | 1,337.752 ms |

Full-scan mode executed 25,600, 256,000, and 2,560,000 handlers. Its total wall times were 143.022 ms, 1,489.535 ms, and 15,459.504 ms respectively. The separately built truth-oracle trace took 89.521 ms, 911.694 ms, and 10,015.410 ms.

All repaired outputs were equivalent. Logical replay hash `3af2830356b984c4a318305d3305ae3f4a316bc45bb6c8b37043e7ffbc933fa0` repeated and survived reversed registration.

## Preserved failure

The broken 64-transition fixture produced:

| Mode | Misses | Mismatching transitions | Equivalent |
|---|---:|---:|---|
| Polling | 1 | 64 | no |
| Declared sparse | 1 | 64 | no |
| Shared | 1 | 64 | no |
| Observed | 0 | 0 | yes |

Repairing the subscription produced zero misses and full equivalence in every mode. The counterexample minimizer reduced 32 mutations to one mutation of the omitted field and preserved the failure.

## Cascade

The 1,000-stage polling cascade performed 1,000,000 probes: 1,000 active and 999,000 negative. Token routing performed 1,000 lookups for the same 1,000-step terminal output. The oscillation fixture detected the repeated `A` state after the trace `A, B` and stopped before its limit.

Timings and memory have the boundaries stated in [../FAILURE_LIMITATIONS.md](../FAILURE_LIMITATIONS.md).
