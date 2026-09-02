#!/usr/bin/env python3
"""Run the frozen first score, persist evidence, and verify reproductions."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

from unlabeled_closure.engine import CANDIDATE_POLICY, run_experiment, verify_counterexample
from unlabeled_closure.foundation_loader import EXPERIMENT_ROOT, REPOSITORY_ROOT, stable_hash


RAW_DIR = EXPERIMENT_ROOT / "results" / "raw"
REPORT_PATH = EXPERIMENT_ROOT / "results" / "BENCHMARK_RESULTS.md"
FREEZE_SUMS_PATH = EXPERIMENT_ROOT / "manifests" / "FREEZE_SHA256SUMS"
FREEZE_RECEIPT_PATH = RAW_DIR / "pre_score_freeze_receipt.json"
WHITESPACE_CORRECTION_PATH = RAW_DIR / "post_score_whitespace_correction_receipt.json"


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_jsonl(path: Path, values: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for value in values:
            handle.write(json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_freeze() -> dict[str, Any]:
    if not FREEZE_SUMS_PATH.is_file() or not FREEZE_RECEIPT_PATH.is_file():
        raise RuntimeError("pre-score SHA-256 manifest and receipt must exist before scoring")
    receipt = json.loads(FREEZE_RECEIPT_PATH.read_text(encoding="utf-8"))
    correction = (
        json.loads(WHITESPACE_CORRECTION_PATH.read_text(encoding="utf-8"))
        if WHITESPACE_CORRECTION_PATH.is_file()
        else None
    )
    checked: dict[str, str] = {}
    corrected: dict[str, str] = {}
    for line in FREEZE_SUMS_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, relative = line.split("  ", 1)
        path = EXPERIMENT_ROOT / relative
        actual = _sha256(path)
        if actual != expected:
            if correction is None:
                raise RuntimeError(f"frozen input changed without a correction receipt: {relative}")
            repository_relative = path.relative_to(REPOSITORY_ROOT).as_posix()
            original = subprocess.run(
                ["git", "show", f"{receipt['semantic_freeze_commit']}:{repository_relative}"],
                cwd=REPOSITORY_ROOT,
                check=True,
                capture_output=True,
            ).stdout
            if hashlib.sha256(original).hexdigest() != expected:
                raise RuntimeError(f"semantic freeze blob hash mismatch: {relative}")
            normalized = original.rstrip(b"\n") + b"\n"
            if path.read_bytes() != normalized:
                raise RuntimeError(f"post-score change is not EOF-only normalization: {relative}")
            recorded = correction["corrected_files"].get(relative)
            if recorded != {"before_sha256": expected, "after_sha256": actual}:
                raise RuntimeError(f"whitespace correction receipt mismatch: {relative}")
            corrected[relative] = actual
        checked[relative] = expected
    if receipt["frozen_files"] != checked:
        raise RuntimeError("pre-score receipt differs from SHA-256 manifest")
    if correction is not None and set(corrected) != set(correction["corrected_frozen_files"]):
        raise RuntimeError("whitespace correction frozen-file set mismatch")
    commit = receipt["semantic_freeze_commit"]
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, "HEAD"],
        cwd=REPOSITORY_ROOT,
        check=True,
    )
    return receipt


def markdown_report(data: dict[str, Any]) -> str:
    lines = [
        "# Unlabeled Multi-Project Closure — Benchmark Results",
        "",
        f"The frozen candidate is `{data['candidate_policy']}`. The scoring oracle runs after policy decisions and is timed separately.",
        "",
        "| Policy | Sparse | Audit | Replay | Reconstruction | Total work | Full reference | Silent stale | Final equality | Gate reference |",
        "|---|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|",
    ]
    for policy, result in data["policies"].items():
        totals = result["totals"]
        lines.append(
            f"| `{policy}` | {totals.get('sparse_check_executions', 0)} | {totals.get('audit_check_executions', 0) + totals.get('full_oracle_check_executions', 0)} | {totals.get('replay_check_executions', 0)} | {totals.get('reconstruction_check_executions', 0)} | {result['total_policy_check_work']} | {result['full_oracle_reference_work']} | {result['silent_stale_outputs']} | {'PASS' if result['final_oracle_equality'] else 'FAIL'} | {'candidate' if policy == data['candidate_policy'] else 'comparison'} |"
        )
    candidate = data["policies"][data["candidate_policy"]]
    lines.extend(
        [
            "",
            "## Frozen gate",
            "",
            f"- silent stale outputs: **{candidate['silent_stale_outputs']}**;",
            f"- final oracle equality: **{'PASS' if candidate['final_oracle_equality'] else 'FAIL'}**;",
            f"- repair/quarantine provenance: **{'PASS' if candidate['all_repair_quarantine_provenance_valid'] else 'FAIL'}**;",
            f"- total policy work: **{candidate['total_policy_check_work']}** versus **{candidate['full_oracle_reference_work']}** full-oracle check executions;",
            f"- gate: **{'PASS' if data['gate']['passed'] else 'FAIL'}**.",
            "",
            "## Transfer and checkpoint behavior",
            "",
            "| Held-out project/version | Checkpoint | Checks | Mutations | Total policy work | Full reference | Silent stale | Equality |",
            "|---|---|---:|---:|---:|---:|---:|:---:|",
        ]
    )
    for project_id, result in candidate["projects"].items():
        lines.append(
            f"| `{project_id}` | `{result['checkpoint_case']}` | {result['canonical_check_count']} | {result['mutation_count']} | {result['total_policy_check_work']} | {result['full_oracle_reference_work']} | {result['metrics']['silent_stale_outputs']} | {'PASS' if result['final_oracle_equality'] else 'FAIL'} |"
        )
    totals = candidate["totals"]
    lines.extend(
        [
            "",
            "Checkpoint validation/recovery work is included above as reconstruction check executions. The candidate recorded "
            f"{totals.get('quarantines', 0)} checkpoint quarantines and {totals.get('unresolved_recoveries', 0)} unresolved recoveries. "
            f"Offline scoring used {totals.get('scoring_oracle_check_executions', 0)} executions and {totals.get('scoring_oracle_time_ns', 0) / 1_000_000:.3f} ms.",
            "",
            "## Determinism and retained misses",
            "",
            f"Repeated replay: **{'PASS' if data['determinism']['repeat_replay_equal'] else 'FAIL'}**. Reversed registration/order: **{'PASS' if data['determinism']['registration_order_invariant'] else 'FAIL'}**.",
            "",
            f"Failing comparison policies produced {sum(item['counterexample_count'] for item in data['policies'].values())} retained miss occurrences. Every occurrence has a minimized reproduction in `counterexamples.json`.",
            "",
            "## Boundary",
            "",
            "This is a frozen controlled challenge over named canonical repository subtrees and in-memory mutations. It makes no component-novelty, production, AI, model-weight, substrate, or cross-machine claim.",
        ]
    )
    return "\n".join(lines) + "\n"


def crosscheck_report(data: dict[str, Any], report: str) -> bool:
    candidate = data["policies"][data["candidate_policy"]]
    required = (
        f"silent stale outputs: **{candidate['silent_stale_outputs']}**",
        f"**{candidate['total_policy_check_work']}** versus **{candidate['full_oracle_reference_work']}**",
        f"gate: **{'PASS' if data['gate']['passed'] else 'FAIL'}**",
        data["held_out_manifest_hash"],
    )
    # The manifest hash is carried by JSON/receipt, while the generated report
    # keeps its table readable. Add it as an evidence line for exact crosscheck.
    return all(token in report for token in required[:-1]) and data["held_out_manifest_hash"] in report


def run_all(output_dir: Path = RAW_DIR, report_path: Path = REPORT_PATH) -> dict[str, Any]:
    freeze = verify_freeze()
    if output_dir == RAW_DIR and (output_dir / "first_score_receipt.json").exists():
        raise RuntimeError("first scored evidence already exists; refusing to overwrite it")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    evidence = run_experiment()
    transitions = evidence.pop("transition_receipts")
    provenance = evidence.pop("provenance_receipts")
    counterexamples = evidence.pop("counterexamples")
    evidence["environment"] = {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "processor": platform.processor() or "unreported",
    }
    write_json(output_dir / "benchmark_results.json", evidence)
    write_jsonl(output_dir / "transition_receipts.jsonl", transitions)
    write_jsonl(output_dir / "provenance_receipts.jsonl", provenance)
    write_json(output_dir / "counterexamples.json", counterexamples)
    checkpoint_receipts = [
        item for item in provenance if "checkpoint" in item.get("schema", "")
    ]
    write_json(output_dir / "checkpoint_receipts.json", checkpoint_receipts)
    report = markdown_report(evidence)
    report += f"\nHeld-out manifest SHA-256: `{evidence['held_out_manifest_hash']}`.\n"
    if not crosscheck_report(evidence, report):
        raise RuntimeError("generated report/raw crosscheck failed")
    report_path.write_text(report, encoding="utf-8")
    files = {
        path.name: _sha256(path)
        for path in sorted(output_dir.iterdir())
        if path.is_file()
        and path.name not in {"pre_score_freeze_receipt.json", "first_score_receipt.json"}
    }
    files[report_path.name] = _sha256(report_path)
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    receipt = {
        "schema": "axm.unlabeled-closure.first-score-receipt/v1",
        "semantic_freeze_commit": freeze["semantic_freeze_commit"],
        "pre_score_receipt_commit": head,
        "held_out_manifest_hash": evidence["held_out_manifest_hash"],
        "policy_hash": evidence["policy_hash"],
        "candidate_policy": evidence["candidate_policy"],
        "gate_passed": evidence["gate"]["passed"],
        "files": files,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    write_json(output_dir / "first_score_receipt.json", receipt)
    return evidence


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=RAW_DIR)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--verify-counterexample")
    parser.add_argument("--verify-freeze-only", action="store_true")
    parser.add_argument("--crosscheck-only", action="store_true")
    args = parser.parse_args()
    if args.verify_counterexample:
        reproduced = verify_counterexample(args.verify_counterexample)
        print(json.dumps({"reproduced": reproduced, "specification": args.verify_counterexample}, sort_keys=True))
        return 0 if reproduced else 1
    if args.verify_freeze_only:
        print(json.dumps({"freeze_verified": bool(verify_freeze())}, sort_keys=True))
        return 0
    if args.crosscheck_only:
        data = json.loads((args.output_dir / "benchmark_results.json").read_text(encoding="utf-8"))
        report = args.report.read_text(encoding="utf-8")
        passed = crosscheck_report(data, report)
        print(json.dumps({"raw_report_crosscheck": passed}, sort_keys=True))
        return 0 if passed else 1
    result = run_all(args.output_dir, args.report)
    candidate = result["policies"][result["candidate_policy"]]
    print(
        json.dumps(
            {
                "gate_passed": result["gate"]["passed"],
                "silent_stale_outputs": candidate["silent_stale_outputs"],
                "total_policy_check_work": candidate["total_policy_check_work"],
                "full_oracle_reference_work": candidate["full_oracle_reference_work"],
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
