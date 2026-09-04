#!/usr/bin/env python3
"""Run and persist deterministic AXM Adaptive Closure evidence."""

from __future__ import annotations

import argparse
import json
import platform
import sys
from pathlib import Path

from adaptive_closure.engine import POLICIES, run_policy, run_suite
from adaptive_closure.foundation_loader import stable_hash
from adaptive_closure.model import FAULTS, generate_events
from adaptive_closure.state_debt import run_state_debt_fixture


SEED = 20260902


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run_all(output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    scales = {str(count): run_suite(count, SEED) for count in (100, 1_000, 10_000)}
    captured = run_suite(100, SEED, capture=True)
    with (output_dir / "transition_receipts_100.jsonl").open("w", encoding="utf-8") as handle:
        for policy in POLICIES:
            for receipt in captured[policy].pop("transition_receipts"):
                handle.write(json.dumps({"policy": policy, **receipt}, sort_keys=True, separators=(",", ":")) + "\n")

    fault_matrix = {}
    for fault in FAULTS:
        fault_matrix[fault] = {
            policy: run_policy(policy, generate_events(100, SEED), frozenset({fault}), SEED, capture=True)
            for policy in ("NO_AUDIT", "FIXED_INTERVAL", "SEEDED_SAMPLE", "RISK_ADAPTIVE", "FULL_ORACLE", "OBSERVED_RECONCILE")
        }
        for result in fault_matrix[fault].values():
            result.pop("transition_receipts", None)

    replay_a = run_policy("RISK_ADAPTIVE", generate_events(1_000, SEED + 1), frozenset(FAULTS), SEED + 1, True)
    replay_b = run_policy("RISK_ADAPTIVE", generate_events(1_000, SEED + 1), frozenset(FAULTS), SEED + 1, True)
    replay_reverse = run_policy("RISK_ADAPTIVE", generate_events(1_000, SEED + 1), frozenset(FAULTS), SEED + 1, True, True)
    replay = {
        "identical_repeat": replay_a["replay_hash"] == replay_b["replay_hash"],
        "registration_order_invariant": replay_a["replay_hash"] == replay_reverse["replay_hash"],
        "hash": replay_a["replay_hash"],
    }
    state_debt = run_state_debt_fixture()
    environment = {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "processor": platform.processor() or "unreported",
    }
    benchmark = {
        "schema": "axm.adaptive-closure.benchmark/v1", "seed": SEED,
        "environment": environment, "policies": list(POLICIES), "scales": scales,
        "replay": replay,
        "timing_boundary": "policy_work_time_ns excludes the always-on offline truth-oracle measurement used by the harness; selected audit handler work remains included",
    }
    write_json(output_dir / "benchmark_results.json", benchmark)
    write_json(output_dir / "fault_matrix.json", fault_matrix)
    write_json(output_dir / "state_debt.json", state_debt)
    write_json(output_dir / "captured_100.json", captured)
    files = {
        path.name: stable_hash(path.read_text(encoding="utf-8"))
        for path in sorted(output_dir.iterdir()) if path.is_file() and path.name != "receipt.json"
    }
    receipt = {
        "schema": "axm.adaptive-closure.evidence-receipt/v1", "seed": SEED,
        "files": files, "logical_replay_hash": replay["hash"],
        "source_notes": "PR #2 research files were read at commit 2c71d11 and were not copied or modified",
    }
    write_json(output_dir / "receipt.json", receipt)
    return benchmark


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "results" / "raw")
    args = parser.parse_args()
    result = run_all(args.output_dir)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
