#!/usr/bin/env python3
"""Run, persist, replay, and crosscheck Real-Project Closure evidence."""

from __future__ import annotations

import argparse
import json
import platform
import shutil
import sys
from pathlib import Path
from typing import Any

from real_project_closure.engine import run_experiment, verify_counterexample
from real_project_closure.foundation_loader import EXPERIMENT_ROOT, stable_hash
from real_project_closure.model import FIXTURE_PATH


RAW_DIR = EXPERIMENT_ROOT / "results" / "raw"
REPORT_PATH = EXPERIMENT_ROOT / "results" / "BENCHMARK_RESULTS.md"


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n")


def markdown_report(data: dict[str, Any]) -> str:
    lines = [
        "# AXM Real-Project Closure Trial — Benchmark Results",
        "",
        "The frozen gate policy is `COMBINED_RISK_OBSERVED`. Offline truth-oracle work scores hidden corruption and is reported separately from policy work.",
        "",
        "| Policy | Sparse checks | Audit checks | Replay checks | Silent stale outputs | Max silent window | Learned edges | Fields | Quarantines | Final equality | Audit + replay | Gate |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---:|:---:|",
    ]
    for policy, result in data["policies"].items():
        held = result["held_out"]
        lines.append(
            f"| `{policy}` | {held['sparse_check_executions']} | {held['audit_check_executions'] + held['full_oracle_check_executions']} | {held['replay_check_executions']} | {held['silent_stale_outputs']} | {held['maximum_silent_stale_window']} | {result['learned_edge_total']} | {result['learned_field_total']} | {result['quarantine_total']} | {'PASS' if result['gate']['final_oracle_equality'] else 'FAIL'} | {result['audit_plus_replay_work']} | {'PASS' if result['gate']['passed'] else 'FAIL'} |"
        )
    gate = data["gate"]
    combined = data["policies"][data["gate_policy"]]
    held = combined["held_out"]
    lines.extend(
        [
            "",
            "## Frozen held-out gate",
            "",
            f"- held-out manifest hash: `{data['held_out_manifest_hash']}`;",
            f"- silent stale outputs: **{held['silent_stale_outputs']}**;",
            f"- final oracle equality: **{'PASS' if gate['final_oracle_equality'] else 'FAIL'}**;",
            f"- repairs retain provenance: **{'PASS' if gate['all_repairs_retain_provenance'] else 'FAIL'}**;",
            f"- audit + replay work: **{combined['audit_plus_replay_work']}** check executions versus **{combined['full_oracle_work']}** for the full oracle ({combined['audit_replay_work_reduction_percentage']:.4f}% reduction);",
            f"- combined gate: **{'PASS' if gate['passed'] else 'FAIL'}**.",
            "",
            "## Work and timing",
            "",
            f"The combined held-out run executed {held['sparse_check_executions']} sparse checks, {held['audit_check_executions']} audit checks, and {held['replay_check_executions']} replay checks. It recorded {held['pre_repair_stale_outputs']} pre-repair stale output, detected {held['detected_stale_outputs']} inside the transition, and left {held['silent_stale_outputs']} silent.",
            "",
            f"Combined held-out wall/CPU time: {held['wall_time_ns'] / 1_000_000:.3f} / {held['cpu_time_ns'] / 1_000_000:.3f} ms. Sparse/audit/replay work time: {held['sparse_work_time_ns'] / 1_000_000:.3f} / {held['audit_work_time_ns'] / 1_000_000:.3f} / {held['replay_work_time_ns'] / 1_000_000:.3f} ms. Offline scoring-oracle time: {held['oracle_measurement_time_ns'] / 1_000_000:.3f} ms.",
            "",
            "## Determinism and retained failures",
            "",
            f"Repeat replay: **{'PASS' if data['determinism']['repeat_replay_equal'] else 'FAIL'}**. Reversed registration: **{'PASS' if data['determinism']['registration_order_invariant'] else 'FAIL'}**.",
            "",
            f"The broken control retained {data['policies']['BROKEN_NO_AUDIT']['held_out']['silent_stale_outputs']} silent stale output occurrences. Observed-only retained {data['policies']['OBSERVED_READS']['held_out']['silent_stale_outputs']}. Every occurrence has a minimized reproduction record in `raw/counterexamples.json`.",
            "",
            "## Boundary",
            "",
            "This is one six-mutation held-out fixture over 242 deterministic checks from one real project snapshot. A pass does not prove complete dependency learning, production safety, or cross-machine determinism.",
        ]
    )
    return "\n".join(lines) + "\n"


def crosscheck_report(data: dict[str, Any], report: str) -> bool:
    combined = data["policies"][data["gate_policy"]]
    required = (
        f"silent stale outputs: **{combined['held_out']['silent_stale_outputs']}**",
        f"**{combined['audit_plus_replay_work']}** check executions versus **{combined['full_oracle_work']}**",
        f"combined gate: **{'PASS' if data['gate']['passed'] else 'FAIL'}**",
        data["held_out_manifest_hash"],
    )
    return all(token in report for token in required)


def run_all(output_dir: Path = RAW_DIR, report_path: Path = REPORT_PATH) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    evidence = run_experiment()
    transitions = evidence.pop("transition_receipts")
    repairs = evidence.pop("repair_receipts")
    counterexamples = evidence.pop("counterexamples")
    evidence["environment"] = {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "processor": platform.processor() or "unreported",
    }
    evidence["timing_boundary"] = (
        "wall/cpu fields are one host run; oracle_measurement fields are offline scoring and never route or repair policy work"
    )
    write_json(output_dir / "benchmark_results.json", evidence)
    write_jsonl(output_dir / "transition_receipts.jsonl", transitions)
    write_jsonl(output_dir / "repair_receipts.jsonl", repairs)
    write_json(output_dir / "counterexamples.json", counterexamples)
    shutil.copyfile(FIXTURE_PATH, output_dir / "mutation_split.json")
    report = markdown_report(evidence)
    if not crosscheck_report(evidence, report):
        raise RuntimeError("generated report failed raw metric crosscheck")
    report_path.write_text(report, encoding="utf-8")
    files = {
        path.name: stable_hash(path.read_text(encoding="utf-8"))
        for path in sorted(output_dir.iterdir())
        if path.is_file() and path.name != "receipt.json"
    }
    files[report_path.name] = stable_hash(report)
    receipt = {
        "schema": "axm.real-project-closure.evidence-receipt/v1",
        "base_commit": "d6ee5b61a42323db22c80325a2895dfbf03b2d48",
        "branch": "ai/real-project-closure-trial-2026-09-02",
        "canonical_source": "experiments/02-workfloor-sentinel imported at runtime; source not copied",
        "held_out_manifest_hash": evidence["held_out_manifest_hash"],
        "logical_replay_hash": evidence["determinism"]["logical_replay_hash"],
        "files": files,
        "gate_passed": evidence["gate"]["passed"],
    }
    write_json(output_dir / "receipt.json", receipt)
    return evidence


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=RAW_DIR)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--verify-counterexample")
    parser.add_argument("--crosscheck-only", action="store_true")
    args = parser.parse_args()
    if args.verify_counterexample:
        reproduced = verify_counterexample(args.verify_counterexample)
        print(json.dumps({"reproduced": reproduced, "specification": args.verify_counterexample}, sort_keys=True))
        return 0 if reproduced else 1
    if args.crosscheck_only:
        data = json.loads((args.output_dir / "benchmark_results.json").read_text(encoding="utf-8"))
        report = args.report.read_text(encoding="utf-8")
        passed = crosscheck_report(data, report)
        print(json.dumps({"raw_report_crosscheck": passed}, sort_keys=True))
        return 0 if passed else 1
    result = run_all(args.output_dir, args.report)
    combined = result["policies"][result["gate_policy"]]
    print(
        json.dumps(
            {
                "gate_passed": result["gate"]["passed"],
                "silent_stale_outputs": combined["held_out"]["silent_stale_outputs"],
                "audit_plus_replay_work": combined["audit_plus_replay_work"],
                "full_oracle_work": combined["full_oracle_work"],
                "result": str(args.output_dir / "benchmark_results.json"),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
