"""Comparison orchestration and deterministic failure minimization."""

from __future__ import annotations

from dataclasses import asdict

from .engine import build_oracle_trace, run_mode
from .fixtures import generate_mutations, make_fixture
from .foundation_loader import stable_hash
from .model import Check, Mutation


MODES = ("full_scan", "polling", "declared_sparse", "observed", "shared")


def run_comparison(
    node_count: int = 256,
    mutation_count: int = 100,
    seed: int = 20260902,
    broken: bool = False,
    capture_transitions: bool = False,
    reverse_registration: bool = False,
) -> dict:
    initial_state, checks = make_fixture(node_count=node_count, seed=seed, broken=broken)
    if reverse_registration:
        checks.reverse()
    mutations = generate_mutations(
        initial_state,
        mutation_count,
        seed=seed + 1,
        force_omission_trigger=broken,
    )
    oracle = build_oracle_trace(initial_state, checks, mutations)
    results = {
        mode: run_mode(
            mode,
            initial_state,
            checks,
            mutations,
            oracle,
            capture_transitions=capture_transitions,
        )
        for mode in MODES
    }
    polling_negative = results["polling"].negative_probes
    for mode, result in results.items():
        if mode in {"declared_sparse", "observed", "shared"}:
            result.negative_probes_avoided = max(
                0, polling_negative - result.negative_probes
            )

    logical = {
        "seed": seed,
        "broken": broken,
        "initial_state_hash": stable_hash(initial_state),
        "mutation_hash": stable_hash([mutation.as_dict() for mutation in mutations]),
        "oracle_hash": oracle.logical_hash,
        "mode_hashes": {mode: result.replay_hash for mode, result in results.items()},
    }
    return {
        "schema": "axm.wakeup-fuzzer.comparison/v1",
        "seed": seed,
        "broken_subscription_variant": broken,
        "node_count": node_count,
        "mutation_count": mutation_count,
        "initial_state_hash": logical["initial_state_hash"],
        "mutation_hash": logical["mutation_hash"],
        "oracle": {
            "handler_evaluations": oracle.handler_evaluations,
            "handler_time_ns": oracle.handler_time_ns,
            "wall_time_ns": oracle.wall_time_ns,
            "cpu_time_ns": oracle.cpu_time_ns,
            "peak_memory_bytes": oracle.peak_memory_bytes,
            "logical_hash": oracle.logical_hash,
        },
        "modes": {
            mode: result.metrics(include_transitions=capture_transitions)
            for mode, result in results.items()
        },
        "comparison_replay_hash": stable_hash(logical),
    }


def sparse_failure(
    initial_state: dict[str, int], checks: list[Check], mutations: list[Mutation]
) -> bool:
    oracle = build_oracle_trace(initial_state, checks, mutations)
    result = run_mode("declared_sparse", initial_state, checks, mutations, oracle)
    return result.missed_wakes > 0


def minimize_mutation_sequence(
    initial_state: dict[str, int], checks: list[Check], mutations: list[Mutation]
) -> list[Mutation]:
    """Deterministic ddmin: remove chunks while at least one missed wake remains."""

    candidate = list(mutations)
    if not sparse_failure(initial_state, checks, candidate):
        raise ValueError("input sequence does not reproduce a sparse-routing failure")
    granularity = 2
    while len(candidate) >= 2:
        chunk_size = (len(candidate) + granularity - 1) // granularity
        reduced = False
        for start in range(0, len(candidate), chunk_size):
            trial = candidate[:start] + candidate[start + chunk_size :]
            if trial and sparse_failure(initial_state, checks, trial):
                candidate = trial
                granularity = max(2, granularity - 1)
                reduced = True
                break
        if not reduced:
            if granularity >= len(candidate):
                break
            granularity = min(len(candidate), granularity * 2)
    return candidate


def build_counterexample(seed: int = 20260902, original_size: int = 32) -> dict:
    state, checks = make_fixture(node_count=64, seed=seed, broken=True)
    mutations = generate_mutations(
        state,
        original_size,
        seed=seed + 7,
        force_omission_trigger=True,
    )
    minimized = minimize_mutation_sequence(state, checks, mutations)
    oracle = build_oracle_trace(state, checks, minimized)
    sparse = run_mode("declared_sparse", state, checks, minimized, oracle, True)
    observed = run_mode("observed", state, checks, minimized, oracle, True)
    return {
        "schema": "axm.wakeup-fuzzer.counterexample/v1",
        "seed": seed,
        "broken_check": asdict(checks[0]),
        "original_sequence_size": len(mutations),
        "minimized_sequence_size": len(minimized),
        "minimized_mutations": [mutation.as_dict() for mutation in minimized],
        "failure_preserved": sparse.missed_wakes > 0,
        "declared_sparse": sparse.metrics(include_transitions=True),
        "observed": observed.metrics(include_transitions=True),
    }
