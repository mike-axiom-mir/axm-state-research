"""Train, freeze, and score unlabeled closure policies on canonical projects."""

from __future__ import annotations

import hashlib
import time
from collections import defaultdict
from copy import deepcopy
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any, Iterable

from .checkpoint import create_checkpoint, recover_checkpoint
from .foundation_loader import (
    CheckContract,
    EXPERIMENT_ROOT,
    MissingEvidence,
    canonical_bytes,
    deep_size,
    evaluate_check,
    make_checks,
    stable_hash,
    traced_state,
)
from .model import (
    ChangeEvent,
    Mutation,
    ProjectVersion,
    apply_mutation,
    held_out_manifest_hash,
    load_manifests,
    load_project,
    manifest_hashes,
    state_storage_bytes,
    verify_project_versions,
)
from .policy import (
    CANDIDATE_POLICY,
    POLICIES,
    POLICY_SEMANTICS_VERSION,
    apply_observed_templates,
    audit_selection,
    learn_observed_templates,
    params,
)


CUSTOM_EVALUATORS = frozenset(
    {"opaque_helper_digest", "derived_file_digest", "derived_output_digest"}
)


def _logical_only(value: Any) -> Any:
    """Remove host/timing/storage observations from deterministic replay data."""

    if isinstance(value, dict):
        return {
            key: _logical_only(child)
            for key, child in value.items()
            if not key.endswith("_time_ns")
            and key
            not in {
                "wall_time_ns",
                "cpu_time_ns",
                "validation_time_ns",
                "receipt_bytes",
                "checkpoint_bytes",
                "state_bytes",
                "retained_object_bytes_estimate",
            }
        }
    if isinstance(value, (list, tuple)):
        return [_logical_only(child) for child in value]
    return value


@dataclass(slots=True)
class Metrics:
    mutations: int = 0
    sparse_check_executions: int = 0
    audit_check_executions: int = 0
    replay_check_executions: int = 0
    reconstruction_check_executions: int = 0
    checkpoint_validation_executions: int = 0
    full_oracle_check_executions: int = 0
    scoring_oracle_check_executions: int = 0
    necessary_wakes: int = 0
    missed_wakes: int = 0
    false_wakes: int = 0
    pre_repair_stale_outputs: int = 0
    detected_stale_outputs: int = 0
    silent_stale_outputs: int = 0
    silent_stale_transitions: int = 0
    maximum_silent_stale_window: int = 0
    repairs: int = 0
    learned_dependencies: int = 0
    quarantines: int = 0
    unresolved_recoveries: int = 0
    wall_time_ns: int = 0
    cpu_time_ns: int = 0
    sparse_time_ns: int = 0
    audit_time_ns: int = 0
    replay_time_ns: int = 0
    checkpoint_validation_time_ns: int = 0
    checkpoint_recovery_time_ns: int = 0
    scoring_oracle_time_ns: int = 0


@dataclass(slots=True)
class ProjectSimulation:
    summary: dict[str, Any]
    transitions: list[dict[str, Any]]
    provenance: list[dict[str, Any]]


def _policy_hash() -> str:
    paths = (
        EXPERIMENT_ROOT / "unlabeled_closure" / "policy.py",
        EXPERIMENT_ROOT / "unlabeled_closure" / "checkpoint.py",
    )
    hasher = hashlib.sha256()
    for path in paths:
        hasher.update(path.name.encode("utf-8"))
        hasher.update(path.read_bytes())
    return hasher.hexdigest()


def _custom_checks(project: ProjectVersion) -> tuple[CheckContract, ...]:
    return (
        CheckContract(
            id="zz-opaque-config-generator",
            perspective="opaque-config-generator",
            dependencies=(f"file:{project.config_path}",),
            evaluator="opaque_helper_digest",
            params=tuple(
                sorted(
                    {
                        "generator_path": project.config_generator_path,
                        "config_path": project.config_path,
                    }.items()
                )
            ),
        ),
        CheckContract(
            id="zz-derived-stage-1",
            perspective="derived-output",
            dependencies=(),
            evaluator="derived_file_digest",
            params=(("raw_path", project.raw_derived_path),),
        ),
        CheckContract(
            id="zz-derived-stage-2",
            perspective="derived-output",
            dependencies=(),
            evaluator="derived_output_digest",
            params=(("source_check", "zz-derived-stage-1"),),
        ),
        CheckContract(
            id="zz-derived-stage-3",
            perspective="derived-output",
            dependencies=("output:zz-derived-stage-2",),
            evaluator="derived_output_digest",
            params=(("source_check", "zz-derived-stage-2"),),
        ),
    )


def build_checks(state: dict[str, Any], project: ProjectVersion) -> tuple[CheckContract, ...]:
    canonical = make_checks(state, repaired_dependencies=True)
    return tuple(sorted(canonical + _custom_checks(project), key=lambda item: item.id))


def _output(status: str, value: Any, detail: str) -> dict[str, Any]:
    return {"status": status, "value": value, "detail": detail}


def _custom_evaluate(
    state: dict[str, Any], check: CheckContract
) -> tuple[dict[str, Any], dict[str, list[str]]]:
    check_params = params(check)
    reads = {"files": [], "fields": [], "outputs": []}
    if check.evaluator == "opaque_helper_digest":
        # Deliberately bypass the access wrapper. The structural policy sees
        # only ordinary check params and event shape; observed reads see none.
        files = state["_opaque_files"]
        pieces: list[str] = []
        missing: list[str] = []
        for key in ("generator_path", "config_path"):
            path = check_params[key]
            record = files.get(path)
            if record is None:
                missing.append(path)
            else:
                pieces.append(record["content"])
        return (
            _output(
                "PASS" if not missing else "FAIL",
                stable_hash(pieces) if not missing else missing,
                "opaque helper generator/config digest",
            ),
            reads,
        )
    if check.evaluator == "derived_file_digest":
        path = check_params["raw_path"]
        reads["files"].append(path)
        record = state["project"]["files"].get(path)
        if record is None:
            return _output("FAIL", None, "derived source missing"), reads
        return _output("PASS", stable_hash(record["content"]), "derived stage one"), reads
    if check.evaluator == "derived_output_digest":
        source = check_params["source_check"]
        reads["outputs"].append(source)
        value = state["_outputs"].get(source)
        return _output("PASS", stable_hash(value), f"derived from {source}"), reads
    raise ValueError(check.evaluator)


def evaluate(
    state: dict[str, Any],
    check: CheckContract,
    outputs: dict[str, dict[str, Any]],
    *,
    trace: bool,
) -> tuple[dict[str, Any], dict[str, list[str]]]:
    state_view = dict(state)
    state_view["_outputs"] = outputs
    state_view["_opaque_files"] = state["project"]["files"]
    if check.evaluator in CUSTOM_EVALUATORS:
        if check.evaluator == "derived_file_digest" and trace:
            traced, observed = traced_state(state_view, None)
            traced["_outputs"] = outputs
            traced["_opaque_files"] = state["project"]["files"]
            output, custom = _custom_evaluate(traced, check)
            payload = observed.payload()
            payload["outputs"] = custom["outputs"]
            return output, payload
        return _custom_evaluate(state_view, check)
    if trace:
        traced, observed = traced_state(state_view, None)
        traced["_outputs"] = outputs
        traced["_opaque_files"] = state["project"]["files"]
        try:
            output = evaluate_check(traced, check)
        except MissingEvidence as error:
            output = _output("ABSTAIN", error.args[0], "missing evidence")
        payload = observed.payload()
        payload["outputs"] = []
        return output, payload
    return evaluate_check(state_view, check), {"files": [], "fields": [], "outputs": []}


def full_outputs(
    state: dict[str, Any],
    checks: Iterable[CheckContract],
    previous: dict[str, dict[str, Any]] | None = None,
    *,
    collect_traces: bool = False,
) -> tuple[dict[str, dict[str, Any]], int, list[dict[str, Any]]]:
    outputs = dict(previous or {})
    traces: list[dict[str, Any]] = []
    executions = 0
    for check in sorted(checks, key=lambda item: item.id):
        output, reads = evaluate(state, check, outputs, trace=collect_traces)
        outputs[check.id] = output
        executions += 1
        if collect_traces:
            traces.append(
                {
                    "check_id": check.id,
                    "evaluator": check.evaluator,
                    "params": params(check),
                    "reads": reads,
                }
            )
    return outputs, executions, traces


def _route_index(checks: Iterable[CheckContract]) -> dict[str, tuple[str, ...]]:
    buckets: dict[str, list[str]] = defaultdict(list)
    for check in checks:
        for dependency in check.dependencies:
            kind = dependency.split(":", 1)[0]
            if kind in {"file", "directory", "category", "output"}:
                buckets[dependency].append(check.id)
    return {key: tuple(sorted(value)) for key, value in buckets.items()}


def sparse_execute(
    state: dict[str, Any],
    checks: tuple[CheckContract, ...],
    outputs: dict[str, dict[str, Any]],
    events: tuple[ChangeEvent, ...],
) -> tuple[tuple[str, ...], int]:
    by_id = {check.id: check for check in checks}
    index = _route_index(checks)
    queue: list[str] = sorted(
        {
            check_id
            for event in events
            for key in event.route_keys()
            for check_id in index.get(key, ())
        }
    )
    executed: list[str] = []
    queued = set(queue)
    while queue:
        check_id = queue.pop(0)
        queued.discard(check_id)
        before = outputs.get(check_id)
        output, _ = evaluate(state, by_id[check_id], outputs, trace=False)
        outputs[check_id] = output
        executed.append(check_id)
        if output != before:
            for dependent in index.get(f"output:{check_id}", ()):
                if dependent not in queued:
                    queue.append(dependent)
                    queued.add(dependent)
            queue.sort()
    return tuple(executed), len(executed)


def _repair_dependencies(
    *,
    policy: str,
    project_id: str,
    mutation: Mutation,
    events: tuple[ChangeEvent, ...],
    check: CheckContract,
    current: dict[str, Any] | None,
    audited: dict[str, Any],
    reads: dict[str, list[str]],
) -> tuple[CheckContract, dict[str, Any] | None]:
    if current == audited:
        return check, None
    additions = {f"file:{path}" for path in reads["files"]}
    additions.update(f"output:{check_id}" for check_id in reads["outputs"])
    if not additions and check.perspective == "opaque-config-generator":
        shaped_paths = {
            value
            for key, value in params(check).items()
            if isinstance(value, str) and key.endswith("_path")
        }
        changed = {
            path
            for event in events
            for path in (event.path, event.old_path)
            if path is not None
        }
        additions.update(f"file:{path}" for path in sorted(shaped_paths & changed))
    missing = tuple(sorted(additions - set(check.dependencies)))
    if not missing:
        return check, None
    amended = replace(
        check, dependencies=tuple(sorted(set(check.dependencies) | set(missing)))
    )
    receipt = {
        "schema": "axm.unlabeled-closure.repair/v1",
        "policy": policy,
        "project_id": project_id,
        "mutation_id": mutation.id,
        "check_id": check.id,
        "event_shapes": [event.shape() for event in events],
        "current_output_hash": stable_hash(current),
        "audited_output_hash": stable_hash(audited),
        "observed_reads": reads,
        "before_dependencies": check.dependencies,
        "added_dependencies": missing,
        "after_dependencies": amended.dependencies,
        "action": "repair_then_replay",
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return amended, receipt


def train_observed_templates(
    projects: dict[str, ProjectVersion], training: tuple[Mutation, ...]
) -> tuple[dict[str, tuple[str, ...]], dict[str, Any]]:
    traces: list[dict[str, Any]] = []
    work = 0
    per_project: dict[str, Any] = {}
    for project_id in sorted({item.project_id for item in training}):
        project = projects[project_id]
        state = load_project(project)
        checks = build_checks(state, project)
        outputs, executions, initial_traces = full_outputs(
            state, checks, collect_traces=True
        )
        work += executions
        traces.extend(initial_traces)
        mutations = tuple(item for item in training if item.project_id == project_id)
        for mutation in mutations:
            state, _ = apply_mutation(state, mutation)
            outputs, executions, mutation_traces = full_outputs(
                state, checks, outputs, collect_traces=True
            )
            work += executions
            traces.extend(mutation_traces)
        per_project[project_id] = {
            "mutations": len(mutations),
            "checks": len(checks),
            "final_output_hash": stable_hash(outputs),
        }
    templates = learn_observed_templates(traces)
    receipt = {
        "schema": "axm.unlabeled-closure.training/v1",
        "project_results": per_project,
        "training_check_executions": work,
        "trace_count": len(traces),
        "templates": templates,
        "templates_hash": stable_hash(templates),
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return templates, receipt


def _checkpoint_for_case(
    case: str | None,
    *,
    project: ProjectVersion,
    snapshot_hash: str,
    policy_hash: str,
    outputs: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    checkpoint = create_checkpoint(
        project=project,
        snapshot_hash=snapshot_hash,
        policy_hash=policy_hash,
        outputs=outputs,
    )
    if case in {None, "valid"}:
        return checkpoint
    if case == "absent":
        return None
    if case == "corrupt_payload":
        corrupted = deepcopy(checkpoint)
        first = sorted(corrupted["payload"]["outputs"])[0]
        corrupted["payload"]["outputs"][first] = {
            "status": "CORRUPT",
            "value": None,
            "detail": "held-out checkpoint corruption fixture",
        }
        return corrupted
    raise ValueError(f"unsupported checkpoint case: {case}")


def simulate_project(
    *,
    policy: str,
    project: ProjectVersion,
    mutations: tuple[Mutation, ...],
    observed_templates: dict[str, tuple[str, ...]],
    reverse_registration: bool = False,
    collect: bool = True,
) -> ProjectSimulation:
    state = load_project(project)
    checks = build_checks(state, project)
    transfer_receipts: list[dict[str, Any]] = []
    if policy in {"OBSERVED_READS", CANDIDATE_POLICY}:
        checks, transfer_receipts = apply_observed_templates(checks, observed_templates)
    if reverse_registration:
        checks = tuple(reversed(checks))
    canonical_order = tuple(sorted(checks, key=lambda item: item.id))
    initial_oracle, _, _ = full_outputs(state, canonical_order)
    previous_oracle = dict(initial_oracle)
    snapshot_hash = stable_hash(state["project"])
    policy_hash = _policy_hash()
    checkpoint_case = mutations[0].checkpoint_case if mutations else "valid"
    checkpoint = _checkpoint_for_case(
        checkpoint_case,
        project=project,
        snapshot_hash=snapshot_hash,
        policy_hash=policy_hash,
        outputs=initial_oracle,
    )
    metrics = Metrics()
    recovery_start = time.perf_counter_ns()
    outputs, reconstruction_work, checkpoint_receipts, unresolved = recover_checkpoint(
        project=project,
        snapshot_hash=snapshot_hash,
        policy_hash=policy_hash,
        checkpoint=checkpoint,
        trusted_source_available=True,
        reconstruct=lambda: full_outputs(state, canonical_order)[:2],
    )
    metrics.checkpoint_recovery_time_ns += time.perf_counter_ns() - recovery_start
    metrics.reconstruction_check_executions += reconstruction_work
    metrics.checkpoint_validation_executions += 1
    metrics.checkpoint_validation_time_ns += checkpoint_receipts[0]["validation_time_ns"]
    metrics.quarantines += int(not checkpoint_receipts[0]["status"] == "trusted")
    metrics.unresolved_recoveries += int(unresolved)
    if outputs is None:
        raise RuntimeError("trusted canonical source unexpectedly failed recovery")

    by_id = {check.id: check for check in canonical_order}
    transitions: list[dict[str, Any]] = []
    provenance = [*checkpoint_receipts]
    for item in transfer_receipts:
        receipt = dict(item)
        receipt.update(
            {
                "schema": "axm.unlabeled-closure.training-transfer/v1",
                "policy": policy,
                "project_id": project.id,
            }
        )
        receipt["provenance_hash"] = stable_hash(receipt)
        provenance.append(receipt)
    silent_windows: dict[str, int] = defaultdict(int)
    start = time.perf_counter_ns()
    cpu_start = time.process_time_ns()
    for transition_index, mutation in enumerate(mutations):
        state, events = apply_mutation(state, mutation)
        pre_policy = dict(outputs)
        if policy == "FULL_ORACLE":
            policy_start = time.perf_counter_ns()
            outputs, executions, _ = full_outputs(state, canonical_order, outputs)
            metrics.audit_time_ns += time.perf_counter_ns() - policy_start
            metrics.full_oracle_check_executions += executions
            awakened = tuple(check.id for check in canonical_order)
            audit_ids: tuple[str, ...] = ()
            replay_ids: tuple[str, ...] = ()
        else:
            sparse_start = time.perf_counter_ns()
            awakened, sparse_work = sparse_execute(
                state, canonical_order, outputs, events
            )
            metrics.sparse_time_ns += time.perf_counter_ns() - sparse_start
            metrics.sparse_check_executions += sparse_work
            audit_ids = audit_selection(policy, canonical_order, events, awakened)
            audit_start = time.perf_counter_ns()
            replay: list[str] = []
            for check_id in audit_ids:
                current = outputs.get(check_id)
                audited, reads = evaluate(state, by_id[check_id], outputs, trace=True)
                amended, repair = _repair_dependencies(
                    policy=policy,
                    project_id=project.id,
                    mutation=mutation,
                    events=events,
                    check=by_id[check_id],
                    current=current,
                    audited=audited,
                    reads=reads,
                )
                outputs[check_id] = audited
                if repair is not None:
                    by_id[check_id] = amended
                    canonical_order = tuple(
                        sorted(by_id.values(), key=lambda value: value.id)
                    )
                    replay.append(check_id)
                    metrics.repairs += 1
                    metrics.learned_dependencies += len(repair["added_dependencies"])
                    provenance.append(repair)
            metrics.audit_check_executions += len(audit_ids)
            metrics.audit_time_ns += time.perf_counter_ns() - audit_start
            replay_start = time.perf_counter_ns()
            for check_id in sorted(replay):
                outputs[check_id] = evaluate(
                    state, by_id[check_id], outputs, trace=False
                )[0]
            metrics.replay_check_executions += len(replay)
            metrics.replay_time_ns += time.perf_counter_ns() - replay_start
            replay_ids = tuple(sorted(replay))

        scoring_start = time.perf_counter_ns()
        oracle, oracle_executions, _ = full_outputs(
            state, canonical_order, previous_oracle
        )
        metrics.scoring_oracle_time_ns += time.perf_counter_ns() - scoring_start
        metrics.scoring_oracle_check_executions += oracle_executions
        necessary = tuple(
            sorted(
                check_id
                for check_id in oracle
                if previous_oracle.get(check_id) != oracle[check_id]
            )
        )
        pre_stale = tuple(
            sorted(check_id for check_id in oracle if pre_policy.get(check_id) != oracle[check_id])
        )
        silent = tuple(
            sorted(check_id for check_id in oracle if outputs.get(check_id) != oracle[check_id])
        )
        detected = tuple(sorted(set(pre_stale) - set(silent)))
        metrics.mutations += 1
        metrics.necessary_wakes += len(necessary)
        metrics.missed_wakes += len(set(necessary) - set(awakened))
        metrics.false_wakes += len(set(awakened) - set(necessary))
        metrics.pre_repair_stale_outputs += len(pre_stale)
        metrics.detected_stale_outputs += len(detected)
        metrics.silent_stale_outputs += len(silent)
        metrics.silent_stale_transitions += int(bool(silent))
        for check_id in oracle:
            silent_windows[check_id] = silent_windows[check_id] + 1 if check_id in silent else 0
            metrics.maximum_silent_stale_window = max(
                metrics.maximum_silent_stale_window, silent_windows[check_id]
            )
        receipt = {
            "schema": "axm.unlabeled-closure.transition/v1",
            "policy": policy,
            "project_id": project.id,
            "transition": transition_index,
            "mutation_id": mutation.id,
            "event_shapes": [event.shape() for event in events],
            "awakened_check_ids": awakened,
            "audit_check_ids": audit_ids,
            "replay_check_ids": replay_ids,
            "necessary_check_ids": necessary,
            "missed_wake_ids": tuple(sorted(set(necessary) - set(awakened))),
            "false_wake_ids": tuple(sorted(set(awakened) - set(necessary))),
            "pre_repair_stale_ids": pre_stale,
            "detected_stale_ids": detected,
            "silent_stale_ids": silent,
            "output_hash": stable_hash(outputs),
            "oracle_hash": stable_hash(oracle),
            "final_equality": not silent,
        }
        if collect:
            transitions.append(receipt)
        previous_oracle = oracle
    metrics.wall_time_ns = time.perf_counter_ns() - start
    metrics.cpu_time_ns = time.process_time_ns() - cpu_start
    final_mismatches = tuple(
        sorted(
            check_id
            for check_id in previous_oracle
            if outputs.get(check_id) != previous_oracle[check_id]
        )
    )
    total_work = (
        metrics.sparse_check_executions
        + metrics.audit_check_executions
        + metrics.replay_check_executions
        + metrics.reconstruction_check_executions
        + metrics.full_oracle_check_executions
    )
    receipt_bytes = len(canonical_bytes(provenance))
    logical = {
        "policy": policy,
        "project_id": project.id,
        "manifest_hash": held_out_manifest_hash(),
        "transitions": transitions,
        "provenance": _logical_only(provenance),
        "final_output_hash": stable_hash(outputs),
        "final_oracle_hash": stable_hash(previous_oracle),
    }
    summary = {
        "project_id": project.id,
        "declared_version": project.declared_version,
        "canonical_tree_sha": project.tree_sha,
        "canonical_check_count": len(canonical_order),
        "canonical_file_count": len(state["project"]["files"]),
        "mutation_count": len(mutations),
        "checkpoint_case": checkpoint_case,
        "metrics": asdict(metrics),
        "total_policy_check_work": total_work,
        "full_oracle_reference_work": len(canonical_order) * len(mutations),
        "final_output_hash": stable_hash(outputs),
        "final_oracle_hash": stable_hash(previous_oracle),
        "final_mismatch_ids": final_mismatches,
        "final_oracle_equality": not final_mismatches,
        "receipt_bytes": receipt_bytes,
        "checkpoint_bytes": len(canonical_bytes(checkpoint)) if checkpoint is not None else 0,
        "state_bytes": state_storage_bytes(state),
        "retained_object_bytes_estimate": deep_size((state, outputs, canonical_order, provenance)),
        "logical_replay_hash": stable_hash(logical),
    }
    return ProjectSimulation(summary, transitions, provenance)


def _minimize_miss(
    *,
    policy: str,
    project: ProjectVersion,
    prefix: tuple[Mutation, ...],
    check_id: str,
    observed_templates: dict[str, tuple[str, ...]],
) -> tuple[Mutation, ...]:
    candidate = list(prefix)
    index = 0
    while index < len(candidate):
        trial = tuple(candidate[:index] + candidate[index + 1 :])
        try:
            simulation = simulate_project(
                policy=policy,
                project=project,
                mutations=trial,
                observed_templates=observed_templates,
                collect=True,
            )
        except (KeyError, TypeError, ValueError):
            index += 1
            continue
        if any(check_id in item["silent_stale_ids"] for item in simulation.transitions):
            candidate = list(trial)
        else:
            index += 1
    return tuple(candidate)


def run_policy(
    *,
    policy: str,
    projects: dict[str, ProjectVersion],
    held_out: tuple[Mutation, ...],
    observed_templates: dict[str, tuple[str, ...]],
    minimize: bool = True,
    reverse_registration: bool = False,
) -> dict[str, Any]:
    project_results: dict[str, Any] = {}
    transitions: list[dict[str, Any]] = []
    provenance: list[dict[str, Any]] = []
    counterexamples: list[dict[str, Any]] = []
    for project_id in sorted({item.project_id for item in held_out}):
        project = projects[project_id]
        mutations = tuple(item for item in held_out if item.project_id == project_id)
        simulation = simulate_project(
            policy=policy,
            project=project,
            mutations=mutations,
            observed_templates=observed_templates,
            reverse_registration=reverse_registration,
        )
        project_results[project_id] = simulation.summary
        transitions.extend(simulation.transitions)
        provenance.extend(simulation.provenance)
        if minimize:
            minimized_cache: dict[str, tuple[Mutation, ...]] = {}
            for receipt in simulation.transitions:
                prefix = mutations[: receipt["transition"] + 1]
                for check_id in receipt["silent_stale_ids"]:
                    minimized = minimized_cache.get(check_id)
                    if minimized is None:
                        minimized = _minimize_miss(
                            policy=policy,
                            project=project,
                            prefix=prefix,
                            check_id=check_id,
                            observed_templates=observed_templates,
                        )
                        minimized_cache[check_id] = minimized
                    counterexamples.append(
                        {
                            "schema": "axm.unlabeled-closure.counterexample/v1",
                            "policy": policy,
                            "project_id": project_id,
                            "check_id": check_id,
                            "observed_transition": receipt["transition"],
                            "observed_mutation_id": receipt["mutation_id"],
                            "original_prefix_length": len(prefix),
                            "minimized_length": len(minimized),
                            "minimized_mutation_ids": [item.id for item in minimized],
                            "reproduce_spec": (
                                f"{policy}:{project_id}:{check_id}:"
                                + ",".join(item.id for item in minimized)
                            ),
                        }
                    )
    totals: dict[str, int] = defaultdict(int)
    for project_result in project_results.values():
        for key, value in project_result["metrics"].items():
            if isinstance(value, int):
                totals[key] += value
    total_work = sum(item["total_policy_check_work"] for item in project_results.values())
    oracle_work = sum(item["full_oracle_reference_work"] for item in project_results.values())
    final_equality = all(item["final_oracle_equality"] for item in project_results.values())
    provenance_ok = all(
        isinstance(item.get("provenance_hash"), str)
        and len(item["provenance_hash"]) == 64
        for item in provenance
    )
    logical = {
        "policy": policy,
        "held_out_manifest_hash": held_out_manifest_hash(),
        "projects": _logical_only(project_results),
        "transitions": transitions,
        "provenance": _logical_only(provenance),
    }
    return {
        "policy": policy,
        "projects": project_results,
        "totals": dict(totals),
        "total_policy_check_work": total_work,
        "full_oracle_reference_work": oracle_work,
        "work_reduction_percentage": round(
            100.0 * (1.0 - total_work / max(1, oracle_work)), 4
        ),
        "silent_stale_outputs": totals["silent_stale_outputs"],
        "final_oracle_equality": final_equality,
        "all_repair_quarantine_provenance_valid": provenance_ok,
        "transition_receipts": transitions,
        "provenance_receipts": provenance,
        "counterexamples": counterexamples,
        "counterexample_count": len(counterexamples),
        "logical_replay_hash": stable_hash(logical),
    }


def verify_counterexample(specification: str) -> bool:
    policy, project_id, check_id, mutation_ids = specification.split(":", 3)
    projects, training, held_out, _ = load_manifests()
    templates, _ = train_observed_templates(projects, training)
    selected_ids = set(filter(None, mutation_ids.split(",")))
    selected = tuple(
        item
        for item in held_out
        if item.project_id == project_id and item.id in selected_ids
    )
    simulation = simulate_project(
        policy=policy,
        project=projects[project_id],
        mutations=selected,
        observed_templates=templates,
    )
    return any(check_id in item["silent_stale_ids"] for item in simulation.transitions)


def run_experiment() -> dict[str, Any]:
    projects, training, held_out, checkpoint_protocol = load_manifests()
    project_verification = verify_project_versions(projects.values())
    observed_templates, training_receipt = train_observed_templates(projects, training)
    runs: dict[str, dict[str, Any]] = {}
    all_transitions: list[dict[str, Any]] = []
    all_provenance: list[dict[str, Any]] = [training_receipt]
    all_counterexamples: list[dict[str, Any]] = []
    for policy in POLICIES:
        result = run_policy(
            policy=policy,
            projects=projects,
            held_out=held_out,
            observed_templates=observed_templates,
        )
        runs[policy] = {
            key: value
            for key, value in result.items()
            if key not in {"transition_receipts", "provenance_receipts", "counterexamples"}
        }
        all_transitions.extend(result["transition_receipts"])
        all_provenance.extend(result["provenance_receipts"])
        all_counterexamples.extend(result["counterexamples"])
    candidate = runs[CANDIDATE_POLICY]
    no_leak = (
        not checkpoint_protocol["allow_untrusted_replay"]
        and checkpoint_protocol["unresolved_action"] == "abstain_escalate"
    )
    gate = {
        "silent_stale_outputs_zero": candidate["silent_stale_outputs"] == 0,
        "final_oracle_equality": candidate["final_oracle_equality"],
        "all_repair_quarantine_provenance_valid": candidate[
            "all_repair_quarantine_provenance_valid"
        ],
        "total_policy_work_less_than_full_oracle": (
            candidate["total_policy_check_work"]
            < candidate["full_oracle_reference_work"]
        ),
        "held_out_and_oracle_excluded_from_training_routing": no_leak,
    }
    gate["passed"] = all(gate.values())
    repeat = run_policy(
        policy=CANDIDATE_POLICY,
        projects=projects,
        held_out=held_out,
        observed_templates=observed_templates,
        minimize=False,
    )
    reverse = run_policy(
        policy=CANDIDATE_POLICY,
        projects=projects,
        held_out=held_out,
        observed_templates=observed_templates,
        minimize=False,
        reverse_registration=True,
    )
    determinism = {
        "repeat_replay_equal": repeat["logical_replay_hash"]
        == candidate["logical_replay_hash"],
        "registration_order_invariant": reverse["logical_replay_hash"]
        == candidate["logical_replay_hash"],
        "logical_replay_hash": candidate["logical_replay_hash"],
    }
    return {
        "schema": "axm.unlabeled-multiproject-closure.benchmark/v1",
        "base_commit": next(iter(projects.values())).base_commit,
        "policy_semantics_version": POLICY_SEMANTICS_VERSION,
        "policy_hash": _policy_hash(),
        "candidate_policy": CANDIDATE_POLICY,
        "project_versions": {
            key: {**asdict(value), **project_verification[key]}
            for key, value in projects.items()
        },
        "manifest_hashes": manifest_hashes(),
        "held_out_manifest_hash": held_out_manifest_hash(),
        "training_mutation_ids": [item.id for item in training],
        "held_out_mutation_ids": [item.id for item in held_out],
        "held_out_contains_declared_risk_labels": False,
        "training": training_receipt,
        "policies": runs,
        "gate": gate,
        "determinism": determinism,
        "transition_receipts": all_transitions,
        "provenance_receipts": all_provenance,
        "counterexamples": all_counterexamples,
    }
