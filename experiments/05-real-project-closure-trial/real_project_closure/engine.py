"""Train/freeze/held-out closure policies over the canonical 242 checks."""

from __future__ import annotations

import time
from collections import defaultdict
from copy import deepcopy
from dataclasses import asdict, dataclass, replace
from typing import Any, Iterable

from .foundation_loader import (
    CheckContract,
    apply_file_change,
    evaluate_check,
    load_project_snapshot,
    make_checks,
    stable_hash,
)
from .model import (
    MissingEvidence,
    Mutation,
    apply_faults,
    held_out_manifest_hash,
    load_fixture,
    materialize_change,
    traced_state,
)


POLICIES = (
    "BROKEN_NO_AUDIT",
    "DECLARED_RISK",
    "OBSERVED_READS",
    "COMBINED_RISK_OBSERVED",
    "FULL_ORACLE",
)

RISK_PERSPECTIVES = {
    "claim": frozenset({"claim-boundary"}),
    "raw_results": frozenset({"cross-file-consistency", "measurement", "schema", "serialization"}),
    "config": frozenset({"configuration", "identity", "license", "runtime"}),
    "license": frozenset({"license"}),
    "new_file": frozenset({"documentation", "serialization", "syntax"}),
}


@dataclass(slots=True)
class PhaseMetrics:
    mutations: int = 0
    sparse_check_executions: int = 0
    audit_check_executions: int = 0
    replay_check_executions: int = 0
    full_oracle_check_executions: int = 0
    oracle_measurement_executions: int = 0
    necessary_wakes: int = 0
    awakened_checks: int = 0
    missed_wakes: int = 0
    false_wakes: int = 0
    pre_repair_stale_transitions: int = 0
    pre_repair_stale_outputs: int = 0
    detected_stale_outputs: int = 0
    silent_stale_transitions: int = 0
    silent_stale_outputs: int = 0
    maximum_silent_stale_window: int = 0
    learned_edges: int = 0
    learned_fields: int = 0
    repairs: int = 0
    repairs_with_provenance: int = 0
    quarantines: int = 0
    unresolved_items: int = 0
    abstentions: int = 0
    wall_time_ns: int = 0
    cpu_time_ns: int = 0
    sparse_work_time_ns: int = 0
    audit_work_time_ns: int = 0
    replay_work_time_ns: int = 0
    oracle_measurement_time_ns: int = 0


@dataclass(slots=True)
class Simulation:
    result: dict[str, Any]
    transitions: list[dict[str, Any]]
    repairs: list[dict[str, Any]]


def _evaluate(
    state: dict[str, Any],
    check: CheckContract,
    permitted: frozenset[str] | None,
    *,
    full_access: bool,
) -> tuple[dict[str, Any], dict[str, list[str]], bool]:
    view, trace = traced_state(state, None if full_access else permitted)
    abstained = False
    try:
        output = evaluate_check(view, check)
    except MissingEvidence as error:
        abstained = True
        token = error.args[0]
        output = {
            "status": "ABSTAIN",
            "value": token,
            "detail": "permitted evidence slice omitted a file-record field",
        }
    return output, trace.payload(), abstained


def _all_outputs(
    state: dict[str, Any], checks: Iterable[CheckContract]
) -> tuple[dict[str, dict[str, Any]], int]:
    start = time.perf_counter_ns()
    outputs = {
        check.id: _evaluate(state, check, None, full_access=True)[0]
        for check in sorted(checks, key=lambda item: item.id)
    }
    return outputs, time.perf_counter_ns() - start


def _route_index(checks: Iterable[CheckContract]) -> dict[str, tuple[str, ...]]:
    buckets: dict[str, list[str]] = defaultdict(list)
    for check in checks:
        for dependency in check.dependencies:
            if dependency.split(":", 1)[0] not in {"file", "category", "directory"}:
                continue
            buckets[dependency].append(check.id)
    return {key: tuple(sorted(value)) for key, value in buckets.items()}


def _route(event: Any, checks: Iterable[CheckContract]) -> tuple[str, ...]:
    index = _route_index(checks)
    awakened: set[str] = set()
    for key in event.route_keys():
        awakened.update(index.get(key, ()))
    return tuple(sorted(awakened))


def _risk_selection(mutation: Mutation, checks: Iterable[CheckContract]) -> tuple[str, ...]:
    perspectives: set[str] = set()
    for tag in mutation.risk_tags:
        perspectives.update(RISK_PERSPECTIVES.get(tag, ()))
    return tuple(sorted(check.id for check in checks if check.perspective in perspectives))


def _dependency_covers(
    dependency: str, path: str, state: dict[str, Any]
) -> bool:
    kind, value = dependency.split(":", 1)
    if kind == "file":
        return value == path
    if kind == "category":
        record = state["project"]["files"].get(path)
        return record is not None and record["category"] == value
    if kind == "directory":
        prefix = "" if value == "." else value.rstrip("/") + "/"
        return path.startswith(prefix)
    return False


def _invalid_dependencies(check: CheckContract) -> tuple[str, ...]:
    return tuple(
        dependency
        for dependency in check.dependencies
        if dependency.split(":", 1)[0] not in {"file", "category", "directory"}
    )


def _repair_from_audit(
    *,
    policy: str,
    phase: str,
    transition: int,
    mutation: Mutation,
    state: dict[str, Any],
    check: CheckContract,
    current_output: dict[str, Any],
    audited_output: dict[str, Any],
    reads: dict[str, list[str]],
    permitted: frozenset[str] | None,
    allow_proactive: bool,
    quarantined: set[str],
) -> tuple[CheckContract, frozenset[str] | None, dict[str, Any] | None]:
    invalid = _invalid_dependencies(check)
    mismatch = current_output != audited_output
    missing_edges = tuple(
        f"file:{path}"
        for path in reads["files"]
        if not any(_dependency_covers(dep, path, state) for dep in check.dependencies)
    )
    missing_fields = (
        tuple(token for token in reads["fields"] if token not in permitted)
        if permitted is not None
        else ()
    )
    can_learn = mismatch or allow_proactive
    learned_edges = missing_edges if can_learn else ()
    learned_fields = missing_fields if can_learn else ()
    before = {
        "dependencies": check.dependencies,
        "permitted_fields": None if permitted is None else tuple(sorted(permitted)),
    }
    action: str | None = None
    after_check = check
    after_permitted = permitted
    if learned_edges:
        after_check = replace(
            after_check,
            dependencies=tuple(sorted(set(after_check.dependencies) | set(learned_edges))),
        )
        action = "repair_then_replay"
    if learned_fields:
        after_permitted = frozenset(set(after_permitted or ()) | set(learned_fields))
        action = "repair_then_replay"
    quarantine = False
    if invalid and check.id not in quarantined:
        quarantine = True
        quarantined.add(check.id)
        action = action or "quarantine_unresolved_metadata"
    if action is None:
        return check, permitted, None
    after = {
        "dependencies": after_check.dependencies,
        "permitted_fields": None if after_permitted is None else tuple(sorted(after_permitted)),
    }
    receipt = {
        "schema": "axm.real-project-closure.repair-receipt/v1",
        "policy": policy,
        "phase": phase,
        "transition": transition,
        "mutation_id": mutation.id,
        "check_id": check.id,
        "input_state_hash": stable_hash(state),
        "current_output_hash": stable_hash(current_output),
        "audited_output_hash": stable_hash(audited_output),
        "observed_reads": reads,
        "missing_edges": learned_edges,
        "missing_fields": learned_fields,
        "invalid_dependencies": invalid,
        "before": before,
        "after": after,
        "action": action,
        "quarantine": quarantine,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return after_check, after_permitted, receipt


def _phase(
    *,
    policy: str,
    phase_name: str,
    mutations: tuple[Mutation, ...],
    state: dict[str, Any],
    outputs: dict[str, dict[str, Any]],
    checks: tuple[CheckContract, ...],
    permitted: dict[str, frozenset[str] | None],
    previous_oracle: dict[str, dict[str, Any]],
    quarantined: set[str],
    collect: bool,
) -> tuple[
    dict[str, Any],
    dict[str, dict[str, Any]],
    tuple[CheckContract, ...],
    dict[str, frozenset[str] | None],
    dict[str, dict[str, Any]],
    PhaseMetrics,
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    metrics = PhaseMetrics()
    transition_receipts: list[dict[str, Any]] = []
    repair_receipts: list[dict[str, Any]] = []
    silent_windows: dict[str, int] = defaultdict(int)
    phase_wall_start = time.perf_counter_ns()
    phase_cpu_start = time.process_time_ns()
    for transition, mutation in enumerate(mutations):
        change = materialize_change(state, mutation)
        state, event = apply_file_change(state, change, transition)
        by_id = {check.id: check for check in checks}
        awakened = tuple(check.id for check in checks) if policy == "FULL_ORACLE" else _route(event, checks)
        sparse_before = time.perf_counter_ns()
        abstentions = 0
        if policy == "FULL_ORACLE":
            policy_outputs, policy_elapsed = _all_outputs(state, checks)
            metrics.full_oracle_check_executions += len(checks)
            metrics.audit_work_time_ns += policy_elapsed
            outputs.update(policy_outputs)
            sparse_elapsed = 0
        else:
            for check_id in awakened:
                output, _, abstained = _evaluate(
                    state, by_id[check_id], permitted[check_id], full_access=False
                )
                outputs[check_id] = output
                abstentions += int(abstained)
            sparse_elapsed = time.perf_counter_ns() - sparse_before
            metrics.sparse_check_executions += len(awakened)
            metrics.sparse_work_time_ns += sparse_elapsed
        metrics.abstentions += abstentions
        pre_audit_outputs = dict(outputs)

        audit_selected: set[str] = set()
        if policy in {"DECLARED_RISK", "COMBINED_RISK_OBSERVED"}:
            audit_selected.update(_risk_selection(mutation, checks))
        if phase_name == "training" and policy in {"OBSERVED_READS", "COMBINED_RISK_OBSERVED"}:
            audit_selected.update(mutation.training_probes)
        if phase_name == "held_out" and policy in {"OBSERVED_READS", "COMBINED_RISK_OBSERVED"}:
            # File/config reads learned during training are already represented
            # in the frozen router. Trace only checks that actually awakened.
            audit_selected.update(awakened)
        if policy == "FULL_ORACLE":
            audit_selected.clear()

        audit_start = time.perf_counter_ns()
        audited_values: dict[str, dict[str, Any]] = {}
        audited_reads: dict[str, dict[str, list[str]]] = {}
        for check_id in sorted(audit_selected):
            audited_values[check_id], audited_reads[check_id], _ = _evaluate(
                state, by_id[check_id], None, full_access=True
            )
        audit_elapsed = time.perf_counter_ns() - audit_start
        metrics.audit_check_executions += len(audit_selected)
        metrics.audit_work_time_ns += audit_elapsed

        replay_ids: set[str] = set()
        amended = dict(by_id)
        for check_id in sorted(audit_selected):
            allow_proactive = phase_name == "training" and check_id in mutation.training_probes
            next_check, next_permitted, receipt = _repair_from_audit(
                policy=policy,
                phase=phase_name,
                transition=transition,
                mutation=mutation,
                state=state,
                check=amended[check_id],
                current_output=outputs[check_id],
                audited_output=audited_values[check_id],
                reads=audited_reads[check_id],
                permitted=permitted[check_id],
                allow_proactive=allow_proactive,
                quarantined=quarantined,
            )
            amended[check_id] = next_check
            permitted[check_id] = next_permitted
            if receipt is not None:
                repair_receipts.append(receipt)
                if receipt["missing_edges"] or receipt["missing_fields"]:
                    replay_ids.add(check_id)
                    metrics.repairs += 1
                    metrics.repairs_with_provenance += int(bool(receipt["provenance_hash"]))
                    metrics.learned_edges += len(receipt["missing_edges"])
                    metrics.learned_fields += len(receipt["missing_fields"])
                if receipt["quarantine"]:
                    metrics.quarantines += 1
                    metrics.unresolved_items += 1
            outputs[check_id] = audited_values[check_id]
        checks = tuple(sorted(amended.values(), key=lambda item: item.id))
        by_id = {check.id: check for check in checks}

        replay_start = time.perf_counter_ns()
        for check_id in sorted(replay_ids):
            outputs[check_id] = _evaluate(
                state, by_id[check_id], permitted[check_id], full_access=False
            )[0]
        replay_elapsed = time.perf_counter_ns() - replay_start
        metrics.replay_check_executions += len(replay_ids)
        metrics.replay_work_time_ns += replay_elapsed

        oracle, oracle_elapsed = _all_outputs(state, checks)
        metrics.oracle_measurement_time_ns += oracle_elapsed
        metrics.oracle_measurement_executions += len(checks)
        necessary = tuple(
            sorted(check_id for check_id in previous_oracle if previous_oracle[check_id] != oracle[check_id])
        )
        post_mismatches = tuple(
            sorted(check_id for check_id in oracle if outputs.get(check_id) != oracle[check_id])
        )
        pre_mismatch_ids = tuple(
            sorted(
                check_id
                for check_id in oracle
                if pre_audit_outputs.get(check_id) != oracle[check_id]
            )
        )
        detected = tuple(sorted(set(pre_mismatch_ids) - set(post_mismatches)))
        false_wakes = tuple(sorted(set(awakened) - set(necessary)))
        missed_wakes = tuple(sorted(set(necessary) - set(awakened)))
        metrics.mutations += 1
        metrics.necessary_wakes += len(necessary)
        metrics.awakened_checks += len(awakened)
        metrics.missed_wakes += len(missed_wakes)
        metrics.false_wakes += len(false_wakes)
        metrics.pre_repair_stale_transitions += int(bool(pre_mismatch_ids))
        metrics.pre_repair_stale_outputs += len(pre_mismatch_ids)
        metrics.detected_stale_outputs += len(detected)
        metrics.silent_stale_transitions += int(bool(post_mismatches))
        metrics.silent_stale_outputs += len(post_mismatches)
        for check_id in oracle:
            if check_id in post_mismatches:
                silent_windows[check_id] += 1
                metrics.maximum_silent_stale_window = max(
                    metrics.maximum_silent_stale_window, silent_windows[check_id]
                )
            else:
                silent_windows[check_id] = 0
        receipt = {
            "schema": "axm.real-project-closure.transition-receipt/v1",
            "policy": policy,
            "phase": phase_name,
            "transition": transition,
            "mutation_id": mutation.id,
            "path": mutation.path,
            "risk_tags": mutation.risk_tags,
            "input_event_hash": stable_hash({"mutation": mutation.public_payload(), "event": event}),
            "awakened_check_ids": awakened,
            "audit_check_ids": tuple(sorted(audit_selected)),
            "replay_check_ids": tuple(sorted(replay_ids)),
            "necessary_check_ids": necessary,
            "missed_wake_ids": missed_wakes,
            "false_wake_ids": false_wakes,
            "pre_repair_stale_ids": pre_mismatch_ids,
            "detected_stale_ids": detected,
            "silent_stale_ids": post_mismatches,
            "output_hash": stable_hash(outputs),
            "oracle_hash": stable_hash(oracle),
            "final_equality": not post_mismatches,
        }
        if collect:
            transition_receipts.append(receipt)
        previous_oracle = oracle
    metrics.wall_time_ns = time.perf_counter_ns() - phase_wall_start
    metrics.cpu_time_ns = time.process_time_ns() - phase_cpu_start
    return (
        state,
        outputs,
        checks,
        permitted,
        previous_oracle,
        metrics,
        transition_receipts,
        repair_receipts,
    )


def _simulate(
    policy: str,
    held_out_subset: tuple[Mutation, ...] | None = None,
    *,
    reverse_registration: bool = False,
    collect: bool = True,
) -> Simulation:
    if policy not in POLICIES:
        raise ValueError(policy)
    raw_fixture, training, held_out, faults = load_fixture()
    if held_out_subset is not None:
        held_out = held_out_subset
    initial_state = load_project_snapshot()
    canonical_checks = make_checks(initial_state, repaired_dependencies=True)
    if len(canonical_checks) != 242:
        raise RuntimeError(f"expected the canonical 242 checks, found {len(canonical_checks)}")
    if reverse_registration:
        canonical_checks = tuple(reversed(canonical_checks))
    checks, permitted, _ = apply_faults(canonical_checks, faults)
    state = deepcopy(initial_state)
    outputs, initialization_oracle_time = _all_outputs(state, checks)
    previous_oracle = dict(outputs)
    quarantined: set[str] = set()
    (
        state,
        outputs,
        checks,
        permitted,
        previous_oracle,
        training_metrics,
        training_transitions,
        training_repairs,
    ) = _phase(
        policy=policy,
        phase_name="training",
        mutations=training,
        state=state,
        outputs=outputs,
        checks=checks,
        permitted=permitted,
        previous_oracle=previous_oracle,
        quarantined=quarantined,
        collect=collect,
    )
    frozen_metadata = {
        check.id: {
            "dependencies": check.dependencies,
            "permitted_fields": None if permitted[check.id] is None else tuple(sorted(permitted[check.id])),
        }
        for check in sorted(checks, key=lambda item: item.id)
    }
    frozen_metadata_hash = stable_hash(frozen_metadata)
    # Every policy begins the frozen challenge from the same verified output
    # checkpoint. Only metadata learned from training crosses this boundary.
    outputs = dict(previous_oracle)
    (
        state,
        outputs,
        checks,
        permitted,
        final_oracle,
        held_metrics,
        held_transitions,
        held_repairs,
    ) = _phase(
        policy=policy,
        phase_name="held_out",
        mutations=held_out,
        state=state,
        outputs=outputs,
        checks=checks,
        permitted=permitted,
        previous_oracle=previous_oracle,
        quarantined=quarantined,
        collect=collect,
    )
    final_mismatches = tuple(
        sorted(check_id for check_id in final_oracle if outputs.get(check_id) != final_oracle[check_id])
    )
    full_oracle_work = len(canonical_checks) * len(held_out)
    audit_replay_work = (
        held_metrics.audit_check_executions
        + held_metrics.replay_check_executions
        + held_metrics.full_oracle_check_executions
    )
    gate = {
        "silent_stale_outputs_zero": held_metrics.silent_stale_outputs == 0,
        "final_oracle_equality": not final_mismatches,
        "all_repairs_retain_provenance": (
            held_metrics.repairs == held_metrics.repairs_with_provenance
            and training_metrics.repairs == training_metrics.repairs_with_provenance
        ),
        "audit_plus_replay_less_than_full_oracle": audit_replay_work < full_oracle_work,
    }
    gate["passed"] = all(gate.values())
    logical_payload = {
        "policy": policy,
        "held_out_manifest_hash": held_out_manifest_hash(raw_fixture),
        "frozen_metadata_hash": frozen_metadata_hash,
        "training": training_transitions,
        "held_out": held_transitions,
        "repairs": training_repairs + held_repairs,
        "final_output_hash": stable_hash(outputs),
        "final_oracle_hash": stable_hash(final_oracle),
    }
    result = {
        "policy": policy,
        "canonical_check_count": len(canonical_checks),
        "canonical_evaluator_count": len({check.evaluator for check in canonical_checks}),
        "training_mutation_count": len(training),
        "held_out_mutation_count": len(held_out),
        "held_out_manifest_hash": held_out_manifest_hash(raw_fixture),
        "frozen_metadata_hash": frozen_metadata_hash,
        "training": asdict(training_metrics),
        "held_out": asdict(held_metrics),
        "full_oracle_work": full_oracle_work,
        "audit_plus_replay_work": audit_replay_work,
        "audit_replay_work_reduction_percentage": round(
            100.0 * (1.0 - audit_replay_work / max(1, full_oracle_work)), 4
        ),
        "learned_edge_total": training_metrics.learned_edges + held_metrics.learned_edges,
        "learned_field_total": training_metrics.learned_fields + held_metrics.learned_fields,
        "quarantine_total": training_metrics.quarantines + held_metrics.quarantines,
        "unresolved_item_total": training_metrics.unresolved_items + held_metrics.unresolved_items,
        "final_output_hash": stable_hash(outputs),
        "final_oracle_hash": stable_hash(final_oracle),
        "final_mismatch_ids": final_mismatches,
        "initialization_oracle_time_ns": initialization_oracle_time,
        "gate": gate,
        "logical_replay_hash": stable_hash(logical_payload),
    }
    return Simulation(
        result=result,
        transitions=training_transitions + held_transitions,
        repairs=training_repairs + held_repairs,
    )


def _minimize_miss(
    policy: str,
    prefix: tuple[Mutation, ...],
    check_id: str,
) -> tuple[Mutation, ...]:
    candidate = list(prefix)
    index = 0
    while index < len(candidate):
        trial = tuple(candidate[:index] + candidate[index + 1 :])
        try:
            simulation = _simulate(policy, trial, collect=True)
        except (KeyError, TypeError, ValueError):
            index += 1
            continue
        held_receipts = [item for item in simulation.transitions if item["phase"] == "held_out"]
        reproduced = any(check_id in item["silent_stale_ids"] for item in held_receipts)
        if reproduced:
            candidate = list(trial)
        else:
            index += 1
    return tuple(candidate)


def run_policy(
    policy: str,
    *,
    reverse_registration: bool = False,
    minimize: bool = True,
) -> Simulation:
    simulation = _simulate(policy, reverse_registration=reverse_registration, collect=True)
    if not minimize:
        return simulation
    _, _, held_out, _ = load_fixture()
    counterexamples: list[dict[str, Any]] = []
    minimized_by_check: dict[str, tuple[Mutation, ...]] = {}
    for receipt in simulation.transitions:
        if receipt["phase"] != "held_out":
            continue
        prefix = held_out[: receipt["transition"] + 1]
        for check_id in receipt["silent_stale_ids"]:
            minimized = minimized_by_check.get(check_id)
            if minimized is None:
                minimized = _minimize_miss(policy, prefix, check_id)
                minimized_by_check[check_id] = minimized
            counterexamples.append(
                {
                    "schema": "axm.real-project-closure.counterexample/v1",
                    "policy": policy,
                    "observed_transition": receipt["transition"],
                    "observed_mutation_id": receipt["mutation_id"],
                    "check_id": check_id,
                    "original_prefix_length": len(prefix),
                    "minimized_length": len(minimized),
                    "minimized_mutation_ids": tuple(item.id for item in minimized),
                    "reproduce_command": (
                        "python3 run_benchmarks.py --verify-counterexample "
                        f"{policy}:{check_id}:" + ",".join(item.id for item in minimized)
                    ),
                }
            )
    simulation.result["counterexample_count"] = len(counterexamples)
    simulation.result["counterexamples"] = counterexamples
    return simulation


def verify_counterexample(specification: str) -> bool:
    policy, check_id, mutation_ids = specification.split(":", 2)
    _, _, held_out, _ = load_fixture()
    wanted = tuple(item for item in held_out if item.id in set(filter(None, mutation_ids.split(","))))
    simulation = _simulate(policy, wanted, collect=True)
    return any(
        check_id in receipt["silent_stale_ids"]
        for receipt in simulation.transitions
        if receipt["phase"] == "held_out"
    )


def run_experiment() -> dict[str, Any]:
    raw_fixture, training, held_out, faults = load_fixture()
    runs: dict[str, dict[str, Any]] = {}
    transitions: list[dict[str, Any]] = []
    repairs: list[dict[str, Any]] = []
    counterexamples: list[dict[str, Any]] = []
    for policy in POLICIES:
        simulation = run_policy(policy)
        runs[policy] = simulation.result
        transitions.extend(simulation.transitions)
        repairs.extend(simulation.repairs)
        counterexamples.extend(simulation.result["counterexamples"])
    repeat = run_policy("COMBINED_RISK_OBSERVED", minimize=False)
    reversed_run = run_policy(
        "COMBINED_RISK_OBSERVED", reverse_registration=True, minimize=False
    )
    combined = runs["COMBINED_RISK_OBSERVED"]
    determinism = {
        "repeat_replay_equal": repeat.result["logical_replay_hash"] == combined["logical_replay_hash"],
        "registration_order_invariant": (
            reversed_run.result["logical_replay_hash"] == combined["logical_replay_hash"]
        ),
        "logical_replay_hash": combined["logical_replay_hash"],
    }
    return {
        "schema": "axm.real-project-closure.benchmark/v1",
        "seed": raw_fixture["seed"],
        "canonical_source": "../02-workfloor-sentinel (imported, not copied)",
        "canonical_check_count": 242,
        "training_mutation_ids": [item.id for item in training],
        "held_out_mutation_ids": [item.id for item in held_out],
        "held_out_manifest_hash": held_out_manifest_hash(raw_fixture),
        "faults": [asdict(item) for item in faults],
        "policies": runs,
        "gate_policy": "COMBINED_RISK_OBSERVED",
        "gate": combined["gate"],
        "determinism": determinism,
        "transition_receipts": transitions,
        "repair_receipts": repairs,
        "counterexamples": counterexamples,
    }
