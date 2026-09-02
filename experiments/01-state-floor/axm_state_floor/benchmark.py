"""Controlled benchmark and evidence-file generator."""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
import tracemalloc
from pathlib import Path
from typing import Any

from .baseline import NaiveSpecialistRuntime
from .canonical import canonical_bytes, deep_size, to_plain
from .nodes import FAMILIES, generate_nodes
from .runtime import StateFloorRuntime
from .state_history import run_state_vs_history
from .world import make_initial_state, make_standard_changes


def _rss_bytes() -> int | None:
    try:
        for line in Path("/proc/self/status").read_text(encoding="utf-8").splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) * 1024
    except OSError:
        return None
    return None


def _history_context(length: int = 48) -> list[dict[str, Any]]:
    return [
        {
            "sequence": index,
            "event": "prior_measurement" if index % 3 else "prior_material_observation",
            "value": (index * 37) % 997,
            "source": f"fixture:{index % 5}",
        }
        for index in range(length)
    ]


def _measure(callable_run):
    tracemalloc.start()
    result = callable_run()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return result, current, peak


def _environment() -> dict[str, Any]:
    return {
        "platform": platform.platform(),
        "python": sys.version,
        "logical_cpus": os.cpu_count(),
        "process_rss_at_suite_start_bytes": _rss_bytes(),
        "timing_clock": "time.perf_counter_ns",
        "cpu_clock": "time.process_time_ns",
        "memory_method": "tracemalloc peak plus Linux VmRSS snapshot and recursive Python retained-size estimate",
    }


def _receipt_record(receipt) -> dict[str, Any]:
    record = receipt.replay_payload()
    record["execution_time_ns"] = receipt.execution_time_ns
    return to_plain(record)


def benchmark_scale(scale: int, output_dir: Path, replay_runs: int) -> dict[str, Any]:
    startup_start = time.perf_counter_ns()
    nodes = generate_nodes(scale)
    runtime = StateFloorRuntime(nodes)
    startup_ns = time.perf_counter_ns() - startup_start
    registry_bytes = deep_size((runtime.nodes, runtime.router))
    state = make_initial_state()
    changes = make_standard_changes()

    sparse, sparse_current, sparse_peak = _measure(lambda: runtime.run(state, changes))
    baseline_runtime = NaiveSpecialistRuntime(nodes)
    baseline, baseline_current, baseline_peak = _measure(
        lambda: baseline_runtime.run(state, changes, history_context=_history_context())
    )

    replay_hashes = [sparse.final_state_hash]
    replay_fingerprints = [sparse.replay_fingerprint()]
    for _ in range(max(1, replay_runs) - 1):
        replay = runtime.run(state, changes)
        replay_hashes.append(replay.final_state_hash)
        replay_fingerprints.append(replay.replay_fingerprint())
    reverse = runtime.run(state, changes, order_strategy="reverse")

    receipt_path = output_dir / f"receipts_{scale}.jsonl"
    with receipt_path.open("w", encoding="utf-8") as handle:
        for receipt in sparse.receipts:
            handle.write(json.dumps(_receipt_record(receipt), sort_keys=True, separators=(",", ":")) + "\n")

    sparse_metrics = dict(sparse.metrics)
    sparse_metrics.update(
        {
            "tracemalloc_current_bytes": sparse_current,
            "tracemalloc_peak_bytes": sparse_peak,
            "process_rss_after_run_bytes": _rss_bytes(),
            "registry_and_router_retained_bytes": registry_bytes,
            "bytes_per_registered_node_estimate": round(registry_bytes / scale, 3),
            "startup_time_ns": startup_ns,
            "replay_runs": max(1, replay_runs),
            "deterministic_replay_success": len(set(replay_hashes)) == 1 and len(set(replay_fingerprints)) == 1,
            "execution_order_invariance_success": reverse.final_state_hash == sparse.final_state_hash,
            "replay_final_state_hashes": replay_hashes,
            "replay_fingerprints": replay_fingerprints,
            "reverse_order_final_state_hash": reverse.final_state_hash,
            "receipt_file": receipt_path.name,
        }
    )
    baseline_metrics = dict(baseline.metrics)
    baseline_metrics.update(
        {
            "tracemalloc_current_bytes": baseline_current,
            "tracemalloc_peak_bytes": baseline_peak,
            "process_rss_after_run_bytes": _rss_bytes(),
        }
    )

    return {
        "scale": scale,
        "registered_vs_triggered_vs_changing": {
            "registered": scale,
            "triggered": sparse.metrics["triggered_nodes_unique"],
            "producing_deltas": sparse.metrics["nodes_producing_deltas_unique"],
            "changing_state": sparse.metrics["nodes_changing_state_unique"],
        },
        "sparse": sparse_metrics,
        "naive_baseline": baseline_metrics,
        "comparison": {
            "final_state_output_equivalence": sparse.final_state_hash == baseline.final_state_hash,
            "sparse_final_state_hash": sparse.final_state_hash,
            "baseline_final_state_hash": baseline.final_state_hash,
            "wall_time_ratio_baseline_over_sparse": round(
                baseline.metrics["wall_time_ns"] / max(1, sparse.metrics["wall_time_ns"]), 4
            ),
            "specialist_evaluation_reduction_percentage": round(
                100.0
                * (1.0 - sparse.metrics["node_executions"] / max(1, baseline.metrics["specialist_evaluations"])),
                4,
            ),
            "baseline_duplicated_context_bytes": baseline.metrics["duplicated_context_bytes_cumulative"],
            "sparse_duplicated_context_bytes": 0,
            "note": "Sparse runtime shares a guarded read-only state view; zero here means no per-node context serialization, not zero memory traffic.",
        },
    }


def _markdown_report(data: dict[str, Any]) -> str:
    lines = [
        "# AXM State Floor — Benchmark Results",
        "",
        "Generated from raw `benchmark_results.json`; durations are single-process Python measurements on the recorded host.",
        "",
        "| Registered | Triggered | Changing | Dormant | Sparse wall ms | Naive wall ms | Naive / sparse | Replay | Order invariant | Output equivalent |",
        "|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|:---:|",
    ]
    for run in data["scaling_runs"]:
        sparse = run["sparse"]
        baseline = run["naive_baseline"]
        comparison = run["comparison"]
        lines.append(
            "| {scale:,} | {triggered:,} | {changing:,} | {dormant:.2f}% | {sparse_ms:.3f} | {baseline_ms:.3f} | {ratio:.2f}× | {replay} | {order} | {equivalent} |".format(
                scale=run["scale"],
                triggered=run["registered_vs_triggered_vs_changing"]["triggered"],
                changing=run["registered_vs_triggered_vs_changing"]["changing_state"],
                dormant=sparse["dormant_percentage"],
                sparse_ms=sparse["wall_time_ns"] / 1_000_000,
                baseline_ms=baseline["wall_time_ns"] / 1_000_000,
                ratio=comparison["wall_time_ratio_baseline_over_sparse"],
                replay="PASS" if sparse["deterministic_replay_success"] else "FAIL",
                order="PASS" if sparse["execution_order_invariance_success"] else "FAIL",
                equivalent="PASS" if comparison["final_state_output_equivalence"] else "FAIL",
            )
        )
    history = data["state_vs_history"]
    lines.extend(
        [
            "",
            "## State versus history",
            "",
            f"- Generated cases: {history['cases']:,}",
            f"- Plain current-state mismatches: {history['full_history_vs_current_state_mismatches']:,}",
            f"- Enriched-state mismatches: {history['full_history_vs_enriched_state_mismatches']:,}",
            f"- Lost information: {', '.join(history['lost_information_reasons'])}",
            "",
            "## Interpretation boundary",
            "",
            "These results demonstrate this implementation and workload only. They do not establish general AI replacement, hardware-level execution, universal state sufficiency, or cross-language/cross-machine determinism.",
        ]
    )
    return "\n".join(lines) + "\n"


def run_benchmark_suite(
    output_dir: str | Path = "results",
    scales: tuple[int, ...] = (10, 100, 1000, 10000),
    replay_runs: int = 3,
) -> dict[str, Any]:
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    suite_start = time.time()
    data = {
        "schema": "axm.state-floor-benchmark/v1",
        "experiment_version": "0.1.0",
        "environment": _environment(),
        "configuration": {
            "scales": scales,
            "replay_runs": replay_runs,
            "perspective_families": len(FAMILIES),
            "partition_count": 128,
            "history_events_in_naive_packet": 48,
            "baseline_fairness": "same nodes, handlers, inputs, subscriptions, merge gate, and expected final output; baseline scans and deserializes a full packet for every node each cycle",
        },
        "state_vs_history": run_state_vs_history(),
        "scaling_runs": [],
    }
    for scale in scales:
        data["scaling_runs"].append(benchmark_scale(scale, destination, replay_runs))
    data["suite_wall_time_seconds"] = round(time.time() - suite_start, 6)
    (destination / "benchmark_results.json").write_text(
        json.dumps(to_plain(data), indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (destination / "BENCHMARK_RESULTS.md").write_text(_markdown_report(data), encoding="utf-8")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Run AXM State Floor controlled benchmarks")
    parser.add_argument("--output-dir", default="results")
    parser.add_argument("--scales", nargs="+", type=int, default=[10, 100, 1000, 10000])
    parser.add_argument("--replay-runs", type=int, default=3)
    arguments = parser.parse_args()
    results = run_benchmark_suite(arguments.output_dir, tuple(arguments.scales), arguments.replay_runs)
    print(json.dumps({
        "result_file": str(Path(arguments.output_dir) / "benchmark_results.json"),
        "suite_wall_time_seconds": results["suite_wall_time_seconds"],
        "scales": arguments.scales,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
