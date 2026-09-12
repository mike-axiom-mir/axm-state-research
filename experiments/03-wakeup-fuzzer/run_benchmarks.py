#!/usr/bin/env python3
"""Run and persist all AXM Wakeup Fuzzer evidence."""

from __future__ import annotations

import argparse
import json
import platform
import sys
from copy import deepcopy
from pathlib import Path

from wakeup_fuzzer.cascade import run_cascade, run_oscillation_fixture
from wakeup_fuzzer.foundation_loader import stable_hash
from wakeup_fuzzer.fuzzer import build_counterexample, run_comparison


SEED = 20260902


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run_all(output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    scales: dict[str, dict] = {}
    for mutation_count in (100, 1_000, 10_000):
        comparison = run_comparison(
            node_count=256,
            mutation_count=mutation_count,
            seed=SEED,
            broken=False,
            capture_transitions=False,
        )
        summary = deepcopy(comparison)
        for mode_payload in summary["modes"].values():
            mode_payload.pop("transitions", None)
        scales[str(mutation_count)] = summary

    # Capture raw receipts in a separate run so JSON evidence construction does
    # not contaminate the scaling timings above.
    captured = run_comparison(
        node_count=256,
        mutation_count=100,
        seed=SEED,
        broken=False,
        capture_transitions=True,
    )
    with (output_dir / "fuzz_transitions_100.jsonl").open("w", encoding="utf-8") as handle:
        for mode, mode_payload in captured["modes"].items():
            for transition in mode_payload["transitions"]:
                compact = {
                    "mode": mode,
                    "transition": transition["transition"],
                    "mutation": transition["mutation"],
                    "awakened_count": len(transition["awakened"]),
                    "awakened_hash": stable_hash(transition["awakened"]),
                    "necessary_count": len(transition["necessary"]),
                    "necessary_hash": stable_hash(transition["necessary"]),
                    "changed_count": len(transition["changed"]),
                    "changed_hash": stable_hash(transition["changed"]),
                    "missed": transition["missed"],
                    "false_wake_count": len(transition["false_wakes"]),
                    "mismatched_outputs": transition["mismatched_outputs"],
                    "output_hash": transition["output_hash"],
                }
                handle.write(
                    json.dumps(
                        compact,
                        sort_keys=True,
                        separators=(",", ":"),
                    )
                    + "\n"
                )

    broken = run_comparison(
        node_count=64,
        mutation_count=64,
        seed=SEED,
        broken=True,
        capture_transitions=True,
    )
    repaired = run_comparison(
        node_count=64,
        mutation_count=64,
        seed=SEED,
        broken=False,
        capture_transitions=True,
    )
    for comparison in (broken, repaired):
        for mode_payload in comparison["modes"].values():
            mode_payload.pop("transitions", None)
    broken_repaired = {"broken": broken, "repaired": repaired}
    counterexample = build_counterexample(seed=SEED, original_size=32)
    cascade = {
        "runs": [run_cascade(size) for size in (10, 100, 1_000)],
        "oscillation_fixture": run_oscillation_fixture(),
    }

    replay_a = run_comparison(
        node_count=128,
        mutation_count=250,
        seed=SEED + 1,
        capture_transitions=True,
    )
    replay_b = run_comparison(
        node_count=128,
        mutation_count=250,
        seed=SEED + 1,
        capture_transitions=True,
    )
    reverse = run_comparison(
        node_count=128,
        mutation_count=250,
        seed=SEED + 1,
        capture_transitions=True,
        reverse_registration=True,
    )
    replay = {
        "identical_repeat": replay_a["comparison_replay_hash"]
        == replay_b["comparison_replay_hash"],
        "registration_order_invariant": replay_a["comparison_replay_hash"]
        == reverse["comparison_replay_hash"],
        "hash": replay_a["comparison_replay_hash"],
    }

    environment = {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "processor": platform.processor() or "unreported",
    }
    results = {
        "schema": "axm.wakeup-fuzzer.benchmark/v1",
        "seed": SEED,
        "environment": environment,
        "registered_nodes": 256,
        "scales": scales,
        "replay": replay,
        "raw_transition_file": "fuzz_transitions_100.jsonl",
    }
    write_json(output_dir / "benchmark_results.json", results)
    write_json(output_dir / "broken_repaired.json", broken_repaired)
    write_json(output_dir / "counterexample.json", counterexample)
    write_json(output_dir / "cascade_results.json", cascade)

    file_hashes = {
        path.name: stable_hash(path.read_text(encoding="utf-8"))
        for path in sorted(output_dir.iterdir())
        if path.is_file() and path.name != "receipt.json"
    }
    receipt = {
        "schema": "axm.wakeup-fuzzer.evidence-receipt/v1",
        "seed": SEED,
        "files": file_hashes,
        "logical_replay_hash": replay["hash"],
    }
    write_json(output_dir / "receipt.json", receipt)
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "raw",
    )
    args = parser.parse_args()
    results = run_all(args.output_dir)
    print(json.dumps(results, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
