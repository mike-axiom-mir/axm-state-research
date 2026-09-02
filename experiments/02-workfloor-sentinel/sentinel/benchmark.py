"""Run the semantic invalidation experiment and emit raw/readable evidence."""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path
from typing import Any

from .checks import make_checks
from .foundation_loader import (
    FOUNDATION_ARCHIVE_SHA256,
    FOUNDATION_VERSION,
    canonical_bytes,
    deep_size,
    stable_hash,
)
from .runtime import (
    SemanticInvalidationRuntime,
    duplicated_packet_full_scan,
    full_scan_outputs,
)
from .snapshot import load_project_snapshot
from .trace import make_adversarial_trace


def _rss_bytes() -> int | None:
    try:
        for line in Path("/proc/self/status").read_text(encoding="utf-8").splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) * 1024
    except OSError:
        return None
    return None


def _logical_step(step: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "change_id",
        "path",
        "necessary_check_ids",
        "awakened_check_ids",
        "missed_check_ids",
        "false_wakeup_ids",
        "sparse_output_mismatch_ids",
    )
    return {key: step[key] for key in keys}


def run_trace_variant(
    *,
    repaired_dependencies: bool,
    include_duplicated_baseline: bool = True,
    receipt_path: Path | None = None,
    reverse_registration: bool = False,
) -> dict[str, Any]:
    state = load_project_snapshot()
    checks = make_checks(state, repaired_dependencies=repaired_dependencies)
    if reverse_registration:
        checks = tuple(reversed(checks))
    runtime = SemanticInvalidationRuntime(checks)
    initialization_start = time.perf_counter_ns()
    state, initial_batch = runtime.initialize(state)
    initialization_ns = time.perf_counter_ns() - initialization_start
    initialized_state_bytes = len(canonical_bytes(state))
    previous_oracle = initial_batch.outputs
    trace = make_adversarial_trace(state)
    history: list[dict[str, Any]] = []
    steps: list[dict[str, Any]] = []
    all_receipts: list[dict[str, Any]] = []
    total_duplicate_bytes = 0

    for sequence, change in enumerate(trace):
        transition = runtime.transition(state, change, sequence)
        oracle = full_scan_outputs(transition.state, runtime.checks)
        necessary = sorted(
            check_id
            for check_id in previous_oracle
            if previous_oracle[check_id] != oracle.outputs[check_id]
        )
        awakened = set(transition.awakened_ids)
        missed = sorted(set(necessary) - awakened)
        false_wakeups = sorted(awakened - set(necessary))
        sparse_mismatches = sorted(
            check_id
            for check_id, output in oracle.outputs.items()
            if transition.state["check_results"].get(check_id) != output
        )

        history.append(
            {
                "sequence": sequence,
                "change_id": change.id,
                "operation": change.operation,
                "path": change.path,
                "description": change.description,
            }
        )
        duplicated_ns: int | None = None
        duplicated_equivalent: bool | None = None
        duplicated_bytes = 0
        if include_duplicated_baseline:
            duplicated, duplicated_bytes = duplicated_packet_full_scan(
                transition.state, runtime.checks, history
            )
            duplicated_ns = duplicated.wall_time_ns
            duplicated_equivalent = duplicated.outputs == oracle.outputs
            total_duplicate_bytes += duplicated_bytes

        for receipt in transition.receipts:
            record = receipt.deterministic_payload()
            record["execution_time_ns"] = receipt.execution_time_ns
            record["change_id"] = change.id
            all_receipts.append(record)

        steps.append(
            {
                "sequence": sequence,
                "change_id": change.id,
                "description": change.description,
                "operation": change.operation,
                "path": change.path,
                "route_keys": transition.event.route_keys(),
                "necessary_check_ids": necessary,
                "awakened_check_ids": list(transition.awakened_ids),
                "missed_check_ids": missed,
                "false_wakeup_ids": false_wakeups,
                "necessary_count": len(necessary),
                "awakened_count": len(transition.awakened_ids),
                "missed_count": len(missed),
                "false_wakeup_count": len(false_wakeups),
                "changed_receipt_count": sum(receipt.changed_output for receipt in transition.receipts),
                "sparse_output_mismatch_ids": sparse_mismatches,
                "sparse_output_equivalent_to_oracle": not sparse_mismatches,
                "duplicated_output_equivalent_to_oracle": duplicated_equivalent,
                "sparse_routing_time_ns": transition.routing_time_ns,
                "sparse_execution_and_merge_time_ns": transition.execution_and_merge_time_ns,
                "shared_snapshot_full_scan_time_ns": oracle.wall_time_ns,
                "duplicated_packet_full_scan_time_ns": duplicated_ns,
                "duplicated_packet_bytes": duplicated_bytes,
            }
        )
        state = transition.state
        previous_oracle = oracle.outputs

    if receipt_path is not None:
        with receipt_path.open("w", encoding="utf-8") as handle:
            for receipt in all_receipts:
                handle.write(json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n")

    missed_total = sum(step["missed_count"] for step in steps)
    false_total = sum(step["false_wakeup_count"] for step in steps)
    awakened_total = sum(step["awakened_count"] for step in steps)
    logical_payload = {
        "repaired_dependencies": repaired_dependencies,
        "steps": [_logical_step(step) for step in steps],
        "final_check_results": state["check_results"],
    }
    sparse_total_ns = sum(
        step["sparse_routing_time_ns"] + step["sparse_execution_and_merge_time_ns"]
        for step in steps
    )
    shared_total_ns = sum(step["shared_snapshot_full_scan_time_ns"] for step in steps)
    duplicated_total_ns = sum(step["duplicated_packet_full_scan_time_ns"] or 0 for step in steps)
    return {
        "repaired_dependencies": repaired_dependencies,
        "registered_checks": len(runtime.checks),
        "perspective_count": len({check.perspective for check in runtime.checks}),
        "dependency_key_count": len(runtime.router),
        "initial_pass_count": sum(output["status"] == "PASS" for output in initial_batch.outputs.values()),
        "initial_fail_count": sum(output["status"] == "FAIL" for output in initial_batch.outputs.values()),
        "initialization_time_ns": initialization_ns,
        "registry_router_bytes_estimate": deep_size((runtime.checks, runtime.router)),
        "initialized_state_bytes": initialized_state_bytes,
        "final_state_bytes": len(canonical_bytes(state)),
        "steps": steps,
        "totals": {
            "trace_changes": len(steps),
            "necessary_wakeups": sum(step["necessary_count"] for step in steps),
            "sparse_wakeups": awakened_total,
            "missed_wakeups": missed_total,
            "false_wakeups": false_total,
            "false_wakeup_percentage_of_sparse": round(100.0 * false_total / max(1, awakened_total), 4),
            "sparse_evaluation_reduction_vs_full_scan_percentage": round(
                100.0 * (1.0 - awakened_total / (len(runtime.checks) * len(steps))), 4
            ),
            "sparse_routing_time_ns": sum(step["sparse_routing_time_ns"] for step in steps),
            "sparse_execution_and_merge_time_ns": sum(step["sparse_execution_and_merge_time_ns"] for step in steps),
            "sparse_total_time_ns": sparse_total_ns,
            "shared_snapshot_full_scan_time_ns": shared_total_ns,
            "duplicated_packet_full_scan_time_ns": duplicated_total_ns,
            "shared_full_scan_over_sparse_ratio": round(shared_total_ns / max(1, sparse_total_ns), 4),
            "duplicated_full_scan_over_sparse_ratio": round(duplicated_total_ns / max(1, sparse_total_ns), 4),
            "duplicated_packet_bytes": total_duplicate_bytes,
            "final_sparse_output_equivalent_to_oracle": state["check_results"] == previous_oracle,
        },
        "final_sparse_check_results_hash": stable_hash(state["check_results"]),
        "final_oracle_check_results_hash": stable_hash(previous_oracle),
        "logical_replay_hash": stable_hash(logical_payload),
        "process_rss_after_variant_bytes": _rss_bytes(),
    }


def _markdown_report(data: dict[str, Any]) -> str:
    buggy = data["dependency_bug_run"]
    repaired = data["repaired_run"]
    lines = [
        "# AXM Workfloor Sentinel — Results",
        "",
        "This experiment watches the real AXM State Floor source snapshot while applying seven recorded adversarial changes in memory.",
        "",
        "| Variant | Checks | Perspectives | Sparse wakeups | Necessary | Missed | False | Final oracle equivalence |",
        "|---|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, run in (("Known dependency bug", buggy), ("Repaired dependency map", repaired)):
        totals = run["totals"]
        lines.append(
            f"| {name} | {run['registered_checks']} | {run['perspective_count']} | {totals['sparse_wakeups']} | {totals['necessary_wakeups']} | {totals['missed_wakeups']} | {totals['false_wakeups']} | {'PASS' if totals['final_sparse_output_equivalent_to_oracle'] else 'FAIL'} |"
        )
    lines.extend(
        [
            "",
            "## Repaired trace",
            "",
            "| Change | Awakened | Necessary | Missed | False | Sparse = oracle |",
            "|---|---:|---:|---:|---:|:---:|",
        ]
    )
    for step in repaired["steps"]:
        lines.append(
            f"| {step['change_id']} | {step['awakened_count']} | {step['necessary_count']} | {step['missed_count']} | {step['false_wakeup_count']} | {'PASS' if step['sparse_output_equivalent_to_oracle'] else 'FAIL'} |"
        )
    totals = repaired["totals"]
    lines.extend(
        [
            "",
            "## Performance totals",
            "",
            f"- Sparse routing: {totals['sparse_routing_time_ns'] / 1_000_000:.3f} ms",
            f"- Sparse execution + merge: {totals['sparse_execution_and_merge_time_ns'] / 1_000_000:.3f} ms",
            f"- Shared-snapshot full scan: {totals['shared_snapshot_full_scan_time_ns'] / 1_000_000:.3f} ms",
            f"- Duplicated-packet full scan: {totals['duplicated_packet_full_scan_time_ns'] / 1_000_000:.3f} ms",
            f"- Shared full scan / sparse: {totals['shared_full_scan_over_sparse_ratio']:.2f}×",
            f"- Duplicated full scan / sparse: {totals['duplicated_full_scan_over_sparse_ratio']:.2f}×",
            f"- Cumulative duplicated packet bytes: {totals['duplicated_packet_bytes']:,}",
            "",
            "## Boundary",
            "",
            "The project files are real foundation source. The seven changes are deterministic adversarial fixtures applied only in memory, not an organic Git history. Zero misses applies only to this check registry and trace.",
        ]
    )
    return "\n".join(lines) + "\n"


def run_suite(output_dir: str | Path = "results", replay_runs: int = 3) -> dict[str, Any]:
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    suite_start = time.perf_counter_ns()
    rss_at_suite_start = _rss_bytes()
    buggy = run_trace_variant(
        repaired_dependencies=False,
        receipt_path=destination / "receipts_dependency_bug.jsonl",
    )
    repaired = run_trace_variant(
        repaired_dependencies=True,
        receipt_path=destination / "receipts_repaired.jsonl",
    )
    replay_hashes = [repaired["logical_replay_hash"]]
    for _ in range(max(1, replay_runs) - 1):
        replay = run_trace_variant(
            repaired_dependencies=True,
            include_duplicated_baseline=False,
        )
        replay_hashes.append(replay["logical_replay_hash"])
    reversed_registration = run_trace_variant(
        repaired_dependencies=True,
        include_duplicated_baseline=False,
        reverse_registration=True,
    )
    data = {
        "schema": "axm.workfloor-sentinel-results/v1",
        "environment": {
            "platform": platform.platform(),
            "python": sys.version,
            "logical_cpus": os.cpu_count(),
            "process_rss_at_start_bytes": rss_at_suite_start,
        },
        "foundation": {
            "name": "AXM State Floor",
            "version": FOUNDATION_VERSION,
            "source_archive_sha256": FOUNDATION_ARCHIVE_SHA256,
        },
        "configuration": {
            "replay_runs": max(1, replay_runs),
            "change_trace_kind": "deterministic adversarial fixtures applied in memory to a real project snapshot",
            "oracle": "recompute every registered check against a shared immutable snapshot",
        },
        "dependency_bug_run": buggy,
        "repaired_run": repaired,
        "determinism": {
            "logical_replay_hashes": replay_hashes,
            "repeated_replay_success": len(set(replay_hashes)) == 1,
            "reversed_registration_hash": reversed_registration["logical_replay_hash"],
            "registration_order_invariance_success": reversed_registration["logical_replay_hash"] == repaired["logical_replay_hash"],
        },
        "suite_wall_time_ns": time.perf_counter_ns() - suite_start,
    }
    (destination / "sentinel_results.json").write_text(
        json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (destination / "SENTINEL_RESULTS.md").write_text(_markdown_report(data), encoding="utf-8")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Run AXM Workfloor Sentinel")
    parser.add_argument("--output-dir", default="results")
    parser.add_argument("--replay-runs", type=int, default=3)
    arguments = parser.parse_args()
    result = run_suite(arguments.output_dir, arguments.replay_runs)
    print(
        json.dumps(
            {
                "checks": result["repaired_run"]["registered_checks"],
                "buggy_misses": result["dependency_bug_run"]["totals"]["missed_wakeups"],
                "repaired_misses": result["repaired_run"]["totals"]["missed_wakeups"],
                "results": str(Path(arguments.output_dir) / "sentinel_results.json"),
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
