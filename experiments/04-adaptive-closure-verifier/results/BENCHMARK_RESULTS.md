# Benchmark Results

Canonical raw evidence: [benchmark JSON](raw/benchmark_results.json), [fault matrix](raw/fault_matrix.json), [State Debt](raw/state_debt.json), [100-transition capture](raw/captured_100.json), [JSONL receipts](raw/transition_receipts_100.jsonl), and [evidence receipt](raw/receipt.json).

At 10,000 transitions, `NO_AUDIT` failed final equality. All audited policies ended equal after explicit repair/replay. Fixed interval permitted a 25-transition damage window; deterministic sampling permitted 131; declared risk and full audit bounded it to one. Observed reconciliation prevented the planted stale outputs after cold-start and branch read-set evidence, but this does not prove it sees hidden reads.

See [FINAL_REPORT.md](../FINAL_REPORT.md) for the exact table and claim boundary.
