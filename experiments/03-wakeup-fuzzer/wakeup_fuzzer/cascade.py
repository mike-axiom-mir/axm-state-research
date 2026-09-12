"""Bounded positive-token cascade and oscillation guard fixture."""

from __future__ import annotations

import time

from .foundation_loader import stable_hash


def run_cascade(stage_count: int) -> dict:
    if stage_count < 1:
        raise ValueError("stage count must be positive")

    polling_token = 0
    polling_probes = 0
    polling_active = 0
    polling_iterations = 0
    start = time.perf_counter_ns()
    while polling_token < stage_count:
        polling_iterations += 1
        next_token = polling_token
        for stage in range(stage_count):
            polling_probes += 1
            if stage == polling_token:
                polling_active += 1
                next_token = stage + 1
        polling_token = next_token
    polling_ns = time.perf_counter_ns() - start

    routed_token = 0
    routed_lookups = 0
    routed_active = 0
    routed_iterations = 0
    start = time.perf_counter_ns()
    while routed_token < stage_count:
        routed_iterations += 1
        stage = routed_token
        routed_lookups += 1
        routed_active += 1
        routed_token = stage + 1
    routed_ns = time.perf_counter_ns() - start

    logical = {
        "stage_count": stage_count,
        "final_token": routed_token,
        "polling_probes": polling_probes,
        "routed_lookups": routed_lookups,
        "active_steps": routed_active,
        "quiescence_iterations": routed_iterations,
    }
    return {
        **logical,
        "polling_active_steps": polling_active,
        "polling_negative_probes": polling_probes - polling_active,
        "polling_wall_time_ns": polling_ns,
        "routed_wall_time_ns": routed_ns,
        "condition_probes_avoided": polling_probes - routed_lookups,
        "output_equivalence": polling_token == routed_token == stage_count,
        "replay_hash": stable_hash(logical),
    }


def run_oscillation_fixture(max_iterations: int = 20) -> dict:
    token = "A"
    seen: dict[str, int] = {}
    trace: list[str] = []
    status = "max_iterations"
    for iteration in range(max_iterations):
        signature = stable_hash({"token": token})
        if signature in seen:
            status = "oscillation_detected"
            break
        seen[signature] = iteration
        trace.append(token)
        token = "B" if token == "A" else "A"
    return {
        "status": status,
        "iterations": len(trace),
        "trace": trace,
        "cycle_start_iteration": seen.get(stable_hash({"token": token})),
        "stopped_before_limit": status == "oscillation_detected",
        "replay_hash": stable_hash({"status": status, "trace": trace}),
    }
