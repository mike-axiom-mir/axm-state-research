#!/usr/bin/env python3
"""Verify committed evidence hashes, freeze, determinism, and reproductions."""

from __future__ import annotations

import hashlib
import json

from opaque_recovery.runtime import CANDIDATE_POLICY, run_policy, verify_counterexample
from run_benchmarks import RAW_DIR, REPORT_PATH, crosscheck_report, verify_freeze


def main() -> int:
    verify_freeze()
    receipt = json.loads((RAW_DIR / "first_score_receipt.json").read_text(encoding="utf-8"))
    hashes_match = True
    for name, expected in receipt["files"].items():
        path = REPORT_PATH if name == REPORT_PATH.name else RAW_DIR / name
        hashes_match &= hashlib.sha256(path.read_bytes()).hexdigest() == expected
    first = run_policy(policy=CANDIDATE_POLICY, minimize=False)
    repeat = run_policy(policy=CANDIDATE_POLICY, minimize=False)
    reverse = run_policy(
        policy=CANDIDATE_POLICY, reverse_registration=True, minimize=False
    )
    counterexamples = json.loads((RAW_DIR / "counterexamples.json").read_text(encoding="utf-8"))
    specs = sorted({item["reproduce_spec"] for item in counterexamples})
    reproductions = {spec: verify_counterexample(spec) for spec in specs}
    raw = json.loads((RAW_DIR / "benchmark_results.json").read_text(encoding="utf-8"))
    result = {
        "freeze_verified": True,
        "raw_evidence_hashes_match": hashes_match,
        "raw_report_crosscheck": crosscheck_report(
            raw, REPORT_PATH.read_text(encoding="utf-8")
        ),
        "repeat_replay_equal": first["logical_replay_hash"] == repeat["logical_replay_hash"],
        "registration_order_invariant": first["logical_replay_hash"]
        == reverse["logical_replay_hash"],
        "counterexample_unique_count": len(specs),
        "counterexample_reproductions": reproductions,
        "all_counterexamples_reproduce": bool(specs) and all(reproductions.values()),
    }
    result["passed"] = all(
        value for key, value in result.items() if key not in {"counterexample_unique_count", "counterexample_reproductions"}
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
