#!/usr/bin/env python3
"""Verify the semantic freeze, run the first score, and persist evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

from opaque_recovery.runtime import (
    CANDIDATE_POLICY,
    EXPERIMENT_ROOT,
    stable_hash,
    run_experiment,
    verify_counterexample,
)


REPOSITORY_ROOT = EXPERIMENT_ROOT.parents[1]
RAW_DIR = EXPERIMENT_ROOT / "results" / "raw"
REPORT_PATH = EXPERIMENT_ROOT / "results" / "BENCHMARK_RESULTS.md"
FREEZE_SUMS_PATH = EXPERIMENT_ROOT / "manifests" / "FREEZE_SHA256SUMS"
FREEZE_RECEIPT_PATH = RAW_DIR / "pre_score_freeze_receipt.json"
CONNECTOR_CORRECTION_PATH = RAW_DIR / "post_score_connector_correction.json"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_jsonl(path: Path, values: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for value in values:
            handle.write(json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n")


def _reachable_commit_for_tree(tree: str) -> str:
    history = subprocess.run(
        ["git", "log", "--format=%H%x00%T", "HEAD"],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    for line in history.splitlines():
        commit, candidate_tree = line.split("\x00", 1)
        if candidate_tree == tree:
            return commit
    raise RuntimeError(f"semantic freeze tree is not reachable from HEAD: {tree}")


def verify_freeze() -> dict[str, Any]:
    if not FREEZE_SUMS_PATH.is_file() or not FREEZE_RECEIPT_PATH.is_file():
        raise RuntimeError("freeze manifest and pre-score receipt must exist before scoring")
    receipt = json.loads(FREEZE_RECEIPT_PATH.read_text(encoding="utf-8"))
    correction = (
        json.loads(CONNECTOR_CORRECTION_PATH.read_text(encoding="utf-8"))
        if CONNECTOR_CORRECTION_PATH.is_file()
        else None
    )
    commit = receipt["semantic_freeze_commit"]
    semantic_tree = receipt["semantic_freeze_tree"]
    declared_exists = subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
    ).returncode == 0
    if declared_exists:
        declared_tree = subprocess.run(
            ["git", "rev-parse", f"{commit}^{{tree}}"],
            cwd=REPOSITORY_ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        if declared_tree != semantic_tree:
            raise RuntimeError("declared semantic freeze commit has the wrong tree")
    freeze_source_commit = _reachable_commit_for_tree(semantic_tree)
    checked: dict[str, str] = {}
    corrected: set[str] = set()
    for line in FREEZE_SUMS_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, relative = line.split("  ", 1)
        path = EXPERIMENT_ROOT / relative
        actual = _sha256(path)
        if actual != expected:
            if correction is None:
                raise RuntimeError(f"frozen semantic input changed: {relative}")
            repository_relative = path.relative_to(REPOSITORY_ROOT).as_posix()
            original = subprocess.run(
                ["git", "show", f"{freeze_source_commit}:{repository_relative}"],
                cwd=REPOSITORY_ROOT,
                check=True,
                capture_output=True,
            ).stdout
            if hashlib.sha256(original).hexdigest() != expected:
                raise RuntimeError(f"frozen source blob mismatch: {relative}")
            recorded = correction["corrected_files"].get(relative)
            if recorded != {"before_sha256": expected, "after_sha256": actual}:
                raise RuntimeError(f"connector correction receipt mismatch: {relative}")
            corrected.add(relative)
        checked[relative] = expected
    if checked != receipt["frozen_files"]:
        raise RuntimeError("freeze receipt and hash manifest disagree")
    expected_corrections = set(correction["corrected_files"]) if correction else set()
    if corrected != expected_corrections:
        raise RuntimeError("connector correction file set mismatch")
    return receipt


def markdown_report(data: dict[str, Any]) -> str:
    lines = [
        "# Cross-Version Opaque Recovery — Benchmark Results",
        "",
        f"Frozen candidate: `{data['candidate_policy']}`. Oracle facts were loaded only after each policy action.",
        "",
        "| Policy | Work | Full reference | Resolved coverage | Wrong resolved | Unresolved | False abstentions | Untrusted replay |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for name, result in data["policies"].items():
        lines.append(
            f"| `{name}` | {result['total_policy_work']} | {result['full_oracle_reference_work']} | {result['resolved_coverage_percentage']:.4f}% | {result['wrong_resolved_outputs']} | {result['unresolved_decisions']} | {result['false_abstentions']} | {result['untrusted_checkpoint_replays']} |"
        )
    candidate = data["policies"][data["candidate_policy"]]
    lines.extend(
        [
            "",
            "## Frozen gate",
            "",
            f"- wrong resolved outputs: **{candidate['wrong_resolved_outputs']}**;",
            f"- resolved coverage: **{candidate['resolved_coverage_percentage']:.4f}%** (minimum **{data['gate_contract']['minimum_resolved_coverage_percentage']:.1f}%**);",
            f"- false abstentions: **{candidate['false_abstentions']}**;",
            f"- untrusted checkpoint replays: **{candidate['untrusted_checkpoint_replays']}**;",
            f"- total policy work: **{candidate['total_policy_work']}** versus **{candidate['full_oracle_reference_work']}** full-oracle executions;",
            f"- deterministic repeat: **{'PASS' if data['determinism']['repeat_replay_equal'] else 'FAIL'}**;",
            f"- reversed registration: **{'PASS' if data['determinism']['registration_order_invariant'] else 'FAIL'}**;",
            f"- gate: **{'PASS' if data['gate']['passed'] else 'FAIL'}**.",
            "",
            "## Per project",
            "",
            "| Project/version | Source available | Source changed | Coverage | Wrong resolved | Final unresolved | Work |",
            "|---|:---:|:---:|---:|---:|---:|---:|",
        ]
    )
    for project_id, result in candidate["projects"].items():
        lines.append(
            f"| `{project_id}` | {'yes' if result['source_available'] else 'no'} | {'yes' if result['source_changed_since_training'] else 'no'} | {result['resolved_coverage_percentage']:.4f}% | {result['wrong_resolved_outputs']} | {len(result['final_unresolved_ids'])} | {result['total_policy_work']} |"
        )
    lines.extend(
        [
            "",
            "## Retained failures",
            "",
            f"Comparison policies produced **{sum(item['counterexample_count'] for item in data['policies'].values())}** wrong-output occurrences. Each occurrence carries an automatically minimized reproduction.",
            "",
            "## Boundary",
            "",
            "These are controlled versioned software fixtures. The unavailable-source oracle is a sealed post-action answer record, not proof that arbitrary missing source can be reconstructed. No hardware, brain, production, or component-novelty claim is made.",
            "",
            f"Held-out manifest SHA-256: `{data['manifest_hashes']['held_out.json']}`.",
        ]
    )
    return "\n".join(lines) + "\n"


def crosscheck_report(data: dict[str, Any], report: str) -> bool:
    candidate = data["policies"][data["candidate_policy"]]
    tokens = (
        f"wrong resolved outputs: **{candidate['wrong_resolved_outputs']}**",
        f"resolved coverage: **{candidate['resolved_coverage_percentage']:.4f}%**",
        f"**{candidate['total_policy_work']}** versus **{candidate['full_oracle_reference_work']}**",
        f"gate: **{'PASS' if data['gate']['passed'] else 'FAIL'}**",
        data["manifest_hashes"]["held_out.json"],
    )
    return all(token in report for token in tokens)


def run_all(output_dir: Path = RAW_DIR, report_path: Path = REPORT_PATH) -> dict[str, Any]:
    freeze = verify_freeze()
    if output_dir == RAW_DIR and (RAW_DIR / "first_score_receipt.json").exists():
        raise RuntimeError("first scored evidence already exists; refusing to overwrite it")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    result = run_experiment()
    executions = result.pop("execution_receipts")
    provenance = result.pop("provenance_receipts")
    scores = result.pop("snapshot_scores")
    counterexamples = result.pop("counterexamples")
    result["environment"] = {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "processor": platform.processor() or "unreported",
    }
    write_json(output_dir / "benchmark_results.json", result)
    write_jsonl(output_dir / "execution_receipts.jsonl", executions)
    write_jsonl(output_dir / "provenance_receipts.jsonl", provenance)
    write_jsonl(output_dir / "snapshot_scores.jsonl", scores)
    write_json(output_dir / "counterexamples.json", counterexamples)
    report = markdown_report(result)
    if not crosscheck_report(result, report):
        raise RuntimeError("raw/report crosscheck failed")
    report_path.write_text(report, encoding="utf-8")
    files = {
        path.name: _sha256(path)
        for path in sorted(output_dir.iterdir())
        if path.is_file()
        and path.name not in {"pre_score_freeze_receipt.json", "first_score_receipt.json"}
    }
    files[report_path.name] = _sha256(report_path)
    receipt = {
        "schema": "axm.opaque-recovery.first-score-receipt/v1",
        "semantic_freeze_commit": freeze["semantic_freeze_commit"],
        "candidate_policy": CANDIDATE_POLICY,
        "gate_passed": result["gate"]["passed"],
        "files": files,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    write_json(output_dir / "first_score_receipt.json", receipt)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=RAW_DIR)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--verify-freeze-only", action="store_true")
    parser.add_argument("--verify-counterexample")
    args = parser.parse_args()
    if args.verify_freeze_only:
        print(json.dumps({"freeze_verified": bool(verify_freeze())}, sort_keys=True))
        return 0
    if args.verify_counterexample:
        passed = verify_counterexample(args.verify_counterexample)
        print(json.dumps({"reproduced": passed}, sort_keys=True))
        return 0 if passed else 1
    result = run_all(args.output_dir, args.report)
    candidate = result["policies"][CANDIDATE_POLICY]
    print(
        json.dumps(
            {
                "gate_passed": result["gate"]["passed"],
                "resolved_coverage_percentage": candidate["resolved_coverage_percentage"],
                "wrong_resolved_outputs": candidate["wrong_resolved_outputs"],
                "total_policy_work": candidate["total_policy_work"],
                "full_oracle_reference_work": candidate["full_oracle_reference_work"],
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
