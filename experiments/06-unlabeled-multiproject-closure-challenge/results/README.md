# Results

`raw/pre_score_freeze_receipt.json` and `manifests/FREEZE_SHA256SUMS` must exist and verify before the first score. After that score, this directory retains the exact benchmark JSON, JSONL transition/provenance receipts, checkpoint receipts, minimized counterexamples, readable benchmark report, and hash receipt.

Scored evidence is append-only in meaning: it may be superseded by an explicitly linked non-semantic correction, never silently rewritten to improve the gate.

