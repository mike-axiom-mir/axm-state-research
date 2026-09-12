"""Full-scan, polling, sparse, observed-read, and shared-condition schedulers."""

from __future__ import annotations

import time
import tracemalloc
from dataclasses import asdict, dataclass
from typing import Iterable

from .foundation_loader import deep_size, stable_hash
from .model import Check, Mutation, TrackingState


@dataclass(frozen=True)
class OracleStep:
    mutation: Mutation
    necessary: tuple[str, ...]
    output_changes: dict[str, int | bool]


@dataclass
class OracleTrace:
    initial_outputs: dict[str, int | bool]
    steps: list[OracleStep]
    handler_evaluations: int
    handler_time_ns: int
    wall_time_ns: int
    cpu_time_ns: int
    peak_memory_bytes: int
    logical_hash: str


@dataclass
class ModeResult:
    mode: str
    registered_nodes: int
    mutations: int
    triggered: int
    executed: int
    producing_output_changes: int
    necessary: int
    false_wakes: int
    missed_wakes: int
    mismatch_transitions: int
    condition_probes: int
    negative_probes: int
    negative_probes_avoided: int
    routing_time_ns: int
    handler_time_ns: int
    wall_time_ns: int
    startup_time_ns: int
    total_time_ns: int
    cpu_time_ns: int
    peak_memory_bytes: int
    registry_bytes: int
    startup_handler_evaluations: int
    observed_dependency_changes: int
    dormant_percent: float
    output_equivalence: bool
    final_output_hash: str
    replay_hash: str
    transitions: list[dict]

    def metrics(self, include_transitions: bool = False) -> dict:
        payload = asdict(self)
        if not include_transitions:
            payload.pop("transitions")
        return payload


def _ordered(checks: Iterable[Check]) -> list[Check]:
    return sorted(checks, key=lambda check: check.id)


def build_oracle_trace(
    initial_state: dict[str, int], checks: list[Check], mutations: list[Mutation]
) -> OracleTrace:
    ordered = _ordered(checks)
    state = dict(initial_state)
    initial_outputs = {check.id: check.evaluate(state) for check in ordered}
    outputs = dict(initial_outputs)
    steps: list[OracleStep] = []
    handler_time_ns = 0

    tracemalloc.start()
    wall_start = time.perf_counter_ns()
    cpu_start = time.process_time_ns()
    for mutation in mutations:
        state[mutation.field] = mutation.value
        handler_start = time.perf_counter_ns()
        current = {check.id: check.evaluate(state) for check in ordered}
        handler_time_ns += time.perf_counter_ns() - handler_start
        changes = {
            check_id: value
            for check_id, value in current.items()
            if outputs[check_id] != value
        }
        steps.append(
            OracleStep(
                mutation=mutation,
                necessary=tuple(sorted(changes)),
                output_changes=changes,
            )
        )
        outputs = current
    wall_time_ns = time.perf_counter_ns() - wall_start
    cpu_time_ns = time.process_time_ns() - cpu_start
    _, peak_memory_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    logical = {
        "initial_output_hash": stable_hash(initial_outputs),
        "steps": [
            {
                "mutation": step.mutation.as_dict(),
                "necessary": step.necessary,
                "changes": step.output_changes,
            }
            for step in steps
        ],
        "final_output_hash": stable_hash(outputs),
    }
    return OracleTrace(
        initial_outputs=initial_outputs,
        steps=steps,
        handler_evaluations=len(ordered) * len(mutations),
        handler_time_ns=handler_time_ns,
        wall_time_ns=wall_time_ns,
        cpu_time_ns=cpu_time_ns,
        peak_memory_bytes=peak_memory_bytes,
        logical_hash=stable_hash(logical),
    )


def _declared_index(checks: list[Check]) -> dict[str, tuple[str, ...]]:
    index: dict[str, list[str]] = {}
    for check in checks:
        for field in check.subscriptions:
            index.setdefault(field, []).append(check.id)
    return {field: tuple(sorted(ids)) for field, ids in index.items()}


def _shared_index(
    checks: list[Check],
) -> tuple[dict[tuple[str, ...], tuple[str, ...]], dict[str, tuple[tuple[str, ...], ...]]]:
    groups: dict[tuple[str, ...], list[str]] = {}
    field_index: dict[str, set[tuple[str, ...]]] = {}
    for check in checks:
        signature = tuple(sorted(check.subscriptions))
        groups.setdefault(signature, []).append(check.id)
        for field in signature:
            field_index.setdefault(field, set()).add(signature)
    frozen_groups = {key: tuple(sorted(ids)) for key, ids in groups.items()}
    frozen_index = {
        field: tuple(sorted(signatures)) for field, signatures in field_index.items()
    }
    return frozen_groups, frozen_index


def run_mode(
    mode: str,
    initial_state: dict[str, int],
    checks: list[Check],
    mutations: list[Mutation],
    oracle: OracleTrace,
    capture_transitions: bool = False,
) -> ModeResult:
    if mode not in {"full_scan", "polling", "declared_sparse", "observed", "shared"}:
        raise ValueError(f"unknown mode: {mode}")

    ordered = _ordered(checks)
    by_id = {check.id: check for check in ordered}
    state = dict(initial_state)
    outputs = dict(oracle.initial_outputs)
    expected = dict(oracle.initial_outputs)

    startup_evals = 0
    observed_changes = 0
    observed_reads: dict[str, tuple[str, ...]] = {}
    observed_index: dict[str, set[str]] = {}
    declared_index: dict[str, tuple[str, ...]] = {}
    shared_groups: dict[tuple[str, ...], tuple[str, ...]] = {}
    shared_field_index: dict[str, tuple[tuple[str, ...], ...]] = {}

    total_wall_start = time.perf_counter_ns()
    total_cpu_start = time.process_time_ns()
    registry_start = time.perf_counter_ns()
    if mode == "declared_sparse":
        declared_index = _declared_index(ordered)
        registry = declared_index
    elif mode == "shared":
        shared_groups, shared_field_index = _shared_index(ordered)
        registry = {"groups": shared_groups, "fields": shared_field_index}
    elif mode == "observed":
        for check in ordered:
            view = TrackingState(state)
            value = check.evaluate(view)
            if value != outputs[check.id]:
                raise AssertionError("observed cold start changed handler semantics")
            reads = tuple(sorted(view.reads))
            observed_reads[check.id] = reads
            for field in reads:
                observed_index.setdefault(field, set()).add(check.id)
        startup_evals = len(ordered)
        registry = {"reads": observed_reads, "fields": observed_index}
    else:
        registry = {check.id: check.subscriptions for check in ordered}
    registry_time_ns = time.perf_counter_ns() - registry_start
    registry_bytes = deep_size(registry)

    triggered = 0
    producing = 0
    necessary_total = 0
    false_wakes = 0
    missed_wakes = 0
    mismatches = 0
    condition_probes = 0
    negative_probes = 0
    routing_time_ns = 0
    handler_time_ns = 0
    receipts: list[dict] = []

    tracemalloc.start()
    wall_start = time.perf_counter_ns()
    for transition_index, (mutation, oracle_step) in enumerate(zip(mutations, oracle.steps, strict=True)):
        state[mutation.field] = mutation.value
        necessary = set(oracle_step.necessary)
        necessary_total += len(necessary)

        route_start = time.perf_counter_ns()
        if mode == "full_scan":
            awakened = set(by_id)
        elif mode == "polling":
            awakened = set()
            for check in ordered:
                condition_probes += 1
                if mutation.field in check.subscriptions:
                    awakened.add(check.id)
                else:
                    negative_probes += 1
        elif mode == "declared_sparse":
            awakened = set(declared_index.get(mutation.field, ()))
            condition_probes += 1
        elif mode == "shared":
            signatures = shared_field_index.get(mutation.field, ())
            condition_probes += len(signatures)
            awakened = {
                check_id
                for signature in signatures
                for check_id in shared_groups[signature]
            }
        else:
            awakened = set(observed_index.get(mutation.field, set()))
            condition_probes += 1
        routing_time_ns += time.perf_counter_ns() - route_start

        triggered += len(awakened)
        before = {check_id: outputs[check_id] for check_id in awakened}
        handler_start = time.perf_counter_ns()
        for check_id in sorted(awakened):
            check = by_id[check_id]
            if mode == "observed":
                view = TrackingState(state)
                outputs[check_id] = check.evaluate(view)
                new_reads = tuple(sorted(view.reads))
                old_reads = observed_reads[check_id]
                if new_reads != old_reads:
                    observed_changes += 1
                    for field in old_reads:
                        observed_index[field].discard(check_id)
                    for field in new_reads:
                        observed_index.setdefault(field, set()).add(check_id)
                    observed_reads[check_id] = new_reads
            else:
                outputs[check_id] = check.evaluate(state)
        handler_time_ns += time.perf_counter_ns() - handler_start

        changed = {check_id for check_id in awakened if outputs[check_id] != before[check_id]}
        producing += len(changed)
        missed = necessary - awakened
        false = awakened - necessary
        missed_wakes += len(missed)
        false_wakes += len(false)
        for check_id, value in oracle_step.output_changes.items():
            expected[check_id] = value
        mismatch_ids = tuple(sorted(
            check_id for check_id in expected if outputs[check_id] != expected[check_id]
        ))
        if mismatch_ids:
            mismatches += 1
        if capture_transitions or missed:
            receipts.append(
                {
                    "transition": transition_index,
                    "mutation": mutation.as_dict(),
                    "awakened": sorted(awakened),
                    "necessary": sorted(necessary),
                    "changed": sorted(changed),
                    "missed": sorted(missed),
                    "false_wakes": sorted(false),
                    "mismatched_outputs": list(mismatch_ids),
                    "output_hash": stable_hash(outputs),
                }
            )

    wall_time_ns = time.perf_counter_ns() - wall_start
    total_time_ns = time.perf_counter_ns() - total_wall_start
    cpu_time_ns = time.process_time_ns() - total_cpu_start
    _, peak_memory_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    possible = len(ordered) * len(mutations)
    dormant_percent = 0.0 if not possible else 100.0 * (possible - triggered) / possible
    final_hash = stable_hash(outputs)
    replay_payload = {
        "mode": mode,
        "mutations": [mutation.as_dict() for mutation in mutations],
        "transitions": [
            {
                "transition": receipt["transition"],
                "awakened": receipt["awakened"],
                "necessary": receipt["necessary"],
                "changed": receipt["changed"],
                "missed": receipt["missed"],
                "mismatched_outputs": receipt["mismatched_outputs"],
                "output_hash": receipt["output_hash"],
            }
            for receipt in receipts
        ],
        "final_output_hash": final_hash,
    }
    return ModeResult(
        mode=mode,
        registered_nodes=len(ordered),
        mutations=len(mutations),
        triggered=triggered,
        executed=triggered,
        producing_output_changes=producing,
        necessary=necessary_total,
        false_wakes=false_wakes,
        missed_wakes=missed_wakes,
        mismatch_transitions=mismatches,
        condition_probes=condition_probes,
        negative_probes=negative_probes,
        negative_probes_avoided=0,
        routing_time_ns=routing_time_ns,
        handler_time_ns=handler_time_ns,
        wall_time_ns=wall_time_ns,
        startup_time_ns=registry_time_ns,
        total_time_ns=total_time_ns,
        cpu_time_ns=cpu_time_ns,
        peak_memory_bytes=peak_memory_bytes,
        registry_bytes=registry_bytes,
        startup_handler_evaluations=startup_evals,
        observed_dependency_changes=observed_changes,
        dormant_percent=dormant_percent,
        output_equivalence=mismatches == 0,
        final_output_hash=final_hash,
        replay_hash=stable_hash(replay_payload),
        transitions=receipts,
    )
