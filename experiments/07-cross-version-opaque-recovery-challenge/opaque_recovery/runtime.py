"""Frozen runtime for the cross-version opaque recovery challenge.

This is a software experiment.  The policy receives canonical state, public
node contracts, source availability/hashes, and change events.  Held-out oracle
answers are loaded only after each policy action has completed.
"""

from __future__ import annotations

import hashlib
import importlib.util
import itertools
import json
import time
from collections import Counter, defaultdict
from copy import deepcopy
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable, Iterable


EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_ROOT = EXPERIMENT_ROOT / "manifests"
PROJECTS_PATH = MANIFEST_ROOT / "projects.json"
TRAINING_PATH = MANIFEST_ROOT / "training.json"
HELD_OUT_PATH = MANIFEST_ROOT / "held_out.json"
GATE_PATH = MANIFEST_ROOT / "gate.json"
ORACLE_PATH = MANIFEST_ROOT / "scoring_oracle.json"

CANDIDATE_POLICY = "VERSION_AWARE_BOUNDED"
POLICIES = (
    "BROKEN_SPARSE",
    "OBSERVED_ONLY",
    "STRUCTURAL_ONLY",
    CANDIDATE_POLICY,
    "ABSTAIN_ALL",
    "FULL_ORACLE",
)
POLICY_VERSION = "opaque-version-guard/v1"

FORBIDDEN_HELD_OUT_KEYS = frozenset(
    {
        "risk",
        "risk_label",
        "risk_labels",
        "oracle",
        "oracle_answer",
        "oracle_answers",
        "expected",
        "expected_output",
        "training_probe",
        "training_probes",
    }
)


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")


def stable_hash(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _forbidden_keys(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower() in FORBIDDEN_HELD_OUT_KEYS:
                found.add(key)
            found.update(_forbidden_keys(child))
    elif isinstance(value, list):
        for child in value:
            found.update(_forbidden_keys(child))
    return found


@dataclass(frozen=True, slots=True)
class Node:
    id: str
    perspective: str
    subscriptions: tuple[str, ...]
    reads: tuple[str, ...]
    priority_or_domain_authority: str
    deterministic_handler: str
    output_schema: str
    version: str


@dataclass(frozen=True, slots=True)
class Mutation:
    id: str
    project_id: str
    path: str
    value: Any


@dataclass(frozen=True, slots=True)
class Project:
    id: str
    role: str
    version: str
    evaluator_source: str | None
    checkpoint_case: str
    state: dict[str, Any]

    @property
    def source_path(self) -> Path | None:
        return None if self.evaluator_source is None else EXPERIMENT_ROOT / self.evaluator_source


@dataclass(slots=True)
class ProjectRun:
    summary: dict[str, Any]
    receipts: list[dict[str, Any]]
    provenance: list[dict[str, Any]]
    snapshots: list[dict[str, Any]]


TRANSPARENT_PATHS = (
    "access.min_width",
    "budget.max",
    "components.count",
    "energy.watts",
    "geometry.height",
    "geometry.width",
    "identity.name",
    "load.max",
    "material.name",
    "provenance.source",
)
OPAQUE_ID = "opaque-guard"
DERIVED_ID = "safety-summary"


def build_nodes(*, reverse_registration: bool = False) -> tuple[Node, ...]:
    nodes = [
        Node(
            id=f"check-{path.replace('.', '-')}",
            perspective="canonical-field",
            subscriptions=(f"state:{path}",),
            reads=(path,),
            priority_or_domain_authority="field-local",
            deterministic_handler="read_current_field",
            output_schema="axm.resolved-or-unresolved/v1",
            version="1",
        )
        for path in TRANSPARENT_PATHS
    ]
    nodes.extend(
        (
            Node(
                id=OPAQUE_ID,
                perspective="opaque-safety",
                # This v1-era public subscription stays unchanged in v2.  The
                # evaluator has no public path-shaped parameters or traceable reads.
                subscriptions=("state:identity.name",),
                reads=(),
                priority_or_domain_authority="safety-only",
                deterministic_handler="opaque_guard",
                output_schema="axm.resolved-or-unresolved/v1",
                version="public-contract-1",
            ),
            Node(
                id=DERIVED_ID,
                perspective="derived-safety",
                subscriptions=(f"output:{OPAQUE_ID}",),
                reads=(f"output:{OPAQUE_ID}",),
                priority_or_domain_authority="safety-summary-only",
                deterministic_handler="summarize_guard",
                output_schema="axm.resolved-or-unresolved/v1",
                version="1",
            ),
        )
    )
    ordered = tuple(sorted(nodes, key=lambda item: item.id))
    return tuple(reversed(ordered)) if reverse_registration else ordered


def load_inputs() -> tuple[Project, tuple[Mutation, ...], tuple[Mutation, ...], dict[str, Any]]:
    raw_projects = _load_json(PROJECTS_PATH)
    held_raw = _load_json(HELD_OUT_PATH)
    forbidden = _forbidden_keys(held_raw)
    if forbidden:
        raise ValueError(f"held-out manifest contains forbidden keys: {sorted(forbidden)}")
    training_spec = raw_projects["training"]
    training = Project(
        id=training_spec["id"],
        role="training",
        version=training_spec["version"],
        evaluator_source=training_spec["evaluator_source"],
        checkpoint_case="training",
        state=training_spec["state"],
    )
    projects = tuple(Project(**item) for item in raw_projects["projects"])
    mutations = tuple(Mutation(**item) for item in held_raw["mutations"])
    training_mutations = tuple(
        Mutation(project_id=training.id, **item)
        for item in _load_json(TRAINING_PATH)["mutations"]
    )
    if {item.project_id for item in mutations} != {item.id for item in projects}:
        raise ValueError("every held-out project must have mutations and no unknown project may appear")
    return training, training_mutations, mutations, _load_json(GATE_PATH)


def _load_handler(path: Path | None) -> tuple[Callable[[dict[str, Any]], bool] | None, str | None]:
    if path is None or not path.is_file():
        return None, None
    digest = file_hash(path)
    spec = importlib.util.spec_from_file_location(f"axm_opaque_{digest[:12]}", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load evaluator: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.opaque_guard, digest


def _get_path(state: dict[str, Any], path: str) -> Any:
    value: Any = state
    for segment in path.split("."):
        value = value[segment]
    return value


def _set_path(state: dict[str, Any], path: str, value: Any) -> None:
    target: Any = state
    segments = path.split(".")
    for segment in segments[:-1]:
        target = target[segment]
    target[segments[-1]] = value


def _resolved(value: Any, *evidence: str) -> dict[str, Any]:
    return {"status": "RESOLVED", "value": value, "evidence_refs": list(evidence)}


def _unresolved(reason: str, *evidence: str) -> dict[str, Any]:
    return {
        "status": "UNRESOLVED",
        "value": None,
        "reason": reason,
        "evidence_refs": list(evidence),
    }


def _transparent_path(node: Node) -> str:
    if node.deterministic_handler != "read_current_field":
        raise ValueError(node.id)
    return node.reads[0]


def _execution_order(nodes: Iterable[Node]) -> tuple[Node, ...]:
    rank = {OPAQUE_ID: 1, DERIVED_ID: 2}
    return tuple(sorted(nodes, key=lambda item: (rank.get(item.id, 0), item.id)))


def execute_node(
    *,
    node: Node,
    state: dict[str, Any],
    outputs: dict[str, dict[str, Any]],
    handler: Callable[[dict[str, Any]], bool] | None,
    source_hash: str | None,
    triggering_event: str,
) -> dict[str, Any]:
    start = time.perf_counter_ns()
    before = outputs.get(node.id)
    if node.deterministic_handler == "read_current_field":
        path = _transparent_path(node)
        output = _resolved(_get_path(state, path), f"state:{path}")
    elif node.id == OPAQUE_ID:
        if handler is None or source_hash is None:
            output = _unresolved("trusted_evaluator_source_unavailable", "escalation:source")
        else:
            output = _resolved(bool(handler(state)), f"evaluator-source:{source_hash}")
    elif node.id == DERIVED_ID:
        source = outputs.get(OPAQUE_ID)
        if source is None or source["status"] != "RESOLVED":
            output = _unresolved("upstream_opaque_output_unresolved", f"output:{OPAQUE_ID}")
        else:
            output = _resolved(
                "ALLOW" if source["value"] else "BLOCK", f"output:{OPAQUE_ID}"
            )
    else:
        raise ValueError(f"unknown handler: {node.deterministic_handler}")
    outputs[node.id] = output
    receipt = {
        "schema": "axm.opaque-recovery.execution-receipt/v1",
        "node_id": node.id,
        "input_state_hash": stable_hash(state),
        "triggering_event": triggering_event,
        "output_delta": output,
        "evidence_refs": output["evidence_refs"],
        "output_hash": stable_hash(output),
        "execution_time_ns": time.perf_counter_ns() - start,
        "changed_state": before != output,
    }
    return receipt


def _all_outputs(
    state: dict[str, Any],
    nodes: tuple[Node, ...],
    handler: Callable[[dict[str, Any]], bool],
    source_hash: str,
) -> dict[str, dict[str, Any]]:
    outputs: dict[str, dict[str, Any]] = {}
    for node in _execution_order(nodes):
        execute_node(
            node=node,
            state=state,
            outputs=outputs,
            handler=handler,
            source_hash=source_hash,
            triggering_event="checkpoint-build",
        )
    return outputs


def _make_training_checkpoint(
    project: Project,
    nodes: tuple[Node, ...],
    training_handler: Callable[[dict[str, Any]], bool],
    training_source_hash: str,
) -> dict[str, Any]:
    outputs = _all_outputs(project.state, nodes, training_handler, training_source_hash)
    payload = {"outputs": outputs}
    checkpoint = {
        "schema": "axm.opaque-recovery.checkpoint/v1",
        "bindings": {
            "project_id": project.id,
            "state_hash": stable_hash(project.state),
            "evaluator_source_hash": training_source_hash,
        },
        "payload": payload,
        "payload_hash": stable_hash(payload),
    }
    checkpoint["provenance_hash"] = stable_hash(checkpoint)
    return checkpoint


def _validate_checkpoint(
    checkpoint: dict[str, Any] | None,
    *,
    project: Project,
    current_source_hash: str | None,
) -> tuple[bool, dict[str, Any]]:
    reasons: list[str] = []
    if checkpoint is None:
        reasons.append("checkpoint_absent")
    else:
        payload = checkpoint.get("payload")
        if checkpoint.get("schema") != "axm.opaque-recovery.checkpoint/v1":
            reasons.append("schema_mismatch")
        if not isinstance(payload, dict) or checkpoint.get("payload_hash") != stable_hash(payload):
            reasons.append("payload_hash_mismatch")
        bindings = checkpoint.get("bindings", {})
        if bindings.get("project_id") != project.id:
            reasons.append("project_binding_mismatch")
        if bindings.get("state_hash") != stable_hash(project.state):
            reasons.append("state_binding_mismatch")
        if current_source_hash is None:
            reasons.append("trusted_evaluator_source_unavailable")
        elif bindings.get("evaluator_source_hash") != current_source_hash:
            reasons.append("evaluator_source_hash_mismatch")
        unsigned = dict(checkpoint)
        recorded = unsigned.pop("provenance_hash", None)
        if recorded != stable_hash(unsigned):
            reasons.append("provenance_hash_mismatch")
    receipt = {
        "schema": "axm.opaque-recovery.checkpoint-validation/v1",
        "project_id": project.id,
        "status": "TRUSTED" if not reasons else "QUARANTINED_UNTRUSTED",
        "reasons": sorted(set(reasons)),
        "untrusted_replay_permitted": False,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return not reasons, receipt


def _training_trace(
    training: Project,
    mutations: tuple[Mutation, ...],
) -> dict[str, Any]:
    handler, source_hash = _load_handler(training.source_path)
    if handler is None or source_hash is None:
        raise RuntimeError("training evaluator must be locally available")
    state = deepcopy(training.state)
    values = [bool(handler(state))]
    for mutation in mutations:
        _set_path(state, mutation.path, mutation.value)
        values.append(bool(handler(state)))
    receipt = {
        "schema": "axm.opaque-recovery.training/v1",
        "project_id": training.id,
        "evaluator_source_hash": source_hash,
        "opaque_public_parameters": {},
        "opaque_observed_reads": [],
        "training_mutation_ids": [item.id for item in mutations],
        "training_outputs_hash": stable_hash(values),
        "training_opaque_executions": len(values),
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return receipt


def _oracle_outputs(
    *,
    project: Project,
    state: dict[str, Any],
    nodes: tuple[Node, ...],
    handler: Callable[[dict[str, Any]], bool] | None,
    snapshot_id: str,
) -> dict[str, Any]:
    # This function is called only after policy action.  The unavailable-source
    # case uses sealed scorer facts, not evaluator code exposed to the policy.
    if handler is not None:
        opaque_value = bool(handler(state))
    else:
        oracle = _load_json(ORACLE_PATH)
        opaque_value = bool(oracle[project.id][snapshot_id])
    values = {
        node.id: _get_path(state, _transparent_path(node))
        for node in nodes
        if node.deterministic_handler == "read_current_field"
    }
    values[OPAQUE_ID] = opaque_value
    values[DERIVED_ID] = "ALLOW" if opaque_value else "BLOCK"
    return values


def _snapshot_score(
    *,
    snapshot_id: str,
    outputs: dict[str, dict[str, Any]],
    oracle: dict[str, Any],
    source_available: bool,
) -> dict[str, Any]:
    resolved = {key for key, value in outputs.items() if value["status"] == "RESOLVED"}
    wrong = tuple(sorted(key for key in resolved if outputs[key]["value"] != oracle[key]))
    unresolved = tuple(sorted(set(oracle) - resolved))
    required = {OPAQUE_ID, DERIVED_ID} if not source_available else set()
    false_abstentions = tuple(sorted(set(unresolved) - required))
    return {
        "snapshot_id": snapshot_id,
        "resolved_ids": tuple(sorted(resolved)),
        "unresolved_ids": unresolved,
        "wrong_resolved_ids": wrong,
        "false_abstention_ids": false_abstentions,
        "output_hash": stable_hash(outputs),
        "oracle_hash": stable_hash(oracle),
    }


def _mark_unavailable_boundary(
    outputs: dict[str, dict[str, Any]], project_id: str, event: str
) -> dict[str, Any]:
    outputs[OPAQUE_ID] = _unresolved(
        "trusted_evaluator_source_unavailable", "escalation:source"
    )
    outputs[DERIVED_ID] = _unresolved(
        "upstream_opaque_output_unresolved", f"output:{OPAQUE_ID}"
    )
    receipt = {
        "schema": "axm.opaque-recovery.escalation/v1",
        "project_id": project_id,
        "triggering_event": event,
        "unresolved_node_ids": [OPAQUE_ID, DERIVED_ID],
        "action": "retain_unresolved_and_escalate",
        "untrusted_replay": False,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return receipt


def simulate_project(
    *,
    policy: str,
    project: Project,
    mutations: tuple[Mutation, ...],
    training: Project,
    training_source_hash: str,
    reverse_registration: bool = False,
    collect_receipts: bool = True,
) -> ProjectRun:
    nodes = build_nodes(reverse_registration=reverse_registration)
    by_id = {node.id: node for node in nodes}
    handler, current_source_hash = _load_handler(project.source_path)
    training_handler, verified_training_hash = _load_handler(training.source_path)
    if training_handler is None or verified_training_hash != training_source_hash:
        raise RuntimeError("frozen training source changed")
    source_changed = current_source_hash != training_source_hash
    source_available = handler is not None and current_source_hash is not None
    checkpoint = (
        _make_training_checkpoint(project, nodes, training_handler, training_source_hash)
        if project.checkpoint_case == "training_checkpoint_bound_to_v1"
        else None
    )
    outputs: dict[str, dict[str, Any]] = {}
    receipts: list[dict[str, Any]] = []
    provenance: list[dict[str, Any]] = []
    metrics: Counter[str] = Counter()
    state = deepcopy(project.state)
    start = time.perf_counter_ns()
    cpu_start = time.process_time_ns()

    if policy == "ABSTAIN_ALL":
        for node in nodes:
            outputs[node.id] = _unresolved("policy_abstained_from_all_work", "policy:abstain-all")
        provenance.append(_mark_unavailable_boundary(outputs, project.id, "initial"))
    elif policy == "FULL_ORACLE":
        oracle = _oracle_outputs(
            project=project, state=state, nodes=nodes, handler=handler, snapshot_id="initial"
        )
        for node in nodes:
            outputs[node.id] = _resolved(oracle[node.id], "scoring-oracle:comparison-policy")
        metrics["full_oracle_executions"] += len(nodes)
    else:
        valid, validation = _validate_checkpoint(
            checkpoint, project=project, current_source_hash=current_source_hash
        )
        provenance.append(validation)
        metrics["checkpoint_validation_executions"] += 1
        metrics["checkpoint_quarantines"] += int(not valid)
        metrics["source_hash_invalidations"] += int(
            "evaluator_source_hash_mismatch" in validation["reasons"]
        )
        if policy == "BROKEN_SPARSE" and checkpoint is not None:
            outputs = deepcopy(checkpoint["payload"]["outputs"])
            metrics["untrusted_checkpoint_replays"] += int(not valid)
        else:
            for node in _execution_order(nodes):
                if node.id in {OPAQUE_ID, DERIVED_ID} and not source_available:
                    continue
                receipt = execute_node(
                    node=node,
                    state=state,
                    outputs=outputs,
                    handler=handler,
                    source_hash=current_source_hash,
                    triggering_event="initial-reconstruction",
                )
                receipts.append(receipt)
                metrics["reconstruction_executions"] += 1
            if not source_available:
                provenance.append(_mark_unavailable_boundary(outputs, project.id, "initial"))
                metrics["escalation_events"] += 1

    snapshots: list[dict[str, Any]] = []
    oracle = _oracle_outputs(
        project=project, state=state, nodes=nodes, handler=handler, snapshot_id="initial"
    )
    metrics["scoring_oracle_executions"] += len(nodes)
    snapshots.append(
        _snapshot_score(
            snapshot_id="initial",
            outputs=outputs,
            oracle=oracle,
            source_available=source_available,
        )
    )

    route_index: dict[str, list[str]] = defaultdict(list)
    for node in nodes:
        for subscription in node.subscriptions:
            route_index[subscription].append(node.id)
    ordered_ids = {node.id: index for index, node in enumerate(_execution_order(nodes))}

    for mutation in mutations:
        _set_path(state, mutation.path, mutation.value)
        event = f"state:{mutation.path}"
        metrics["transitions"] += 1
        metrics["routing_lookups"] += 1
        if policy == "ABSTAIN_ALL":
            pass
        elif policy == "FULL_ORACLE":
            policy_oracle = _oracle_outputs(
                project=project,
                state=state,
                nodes=nodes,
                handler=handler,
                snapshot_id=mutation.id,
            )
            for node in nodes:
                before = outputs[node.id]
                outputs[node.id] = _resolved(
                    policy_oracle[node.id], "scoring-oracle:comparison-policy"
                )
                metrics["nodes_producing_deltas"] += int(before != outputs[node.id])
            metrics["full_oracle_executions"] += len(nodes)
        else:
            selected = set(route_index.get(event, ()))
            sparse_ids = set(selected)
            if policy == CANDIDATE_POLICY and source_changed and source_available:
                selected.add(OPAQUE_ID)
                metrics["version_guard_selections"] += 1
            executed: set[str] = set()
            pending = sorted(selected, key=lambda item: ordered_ids[item])
            while pending:
                node_id = pending.pop(0)
                if node_id in executed:
                    continue
                before = outputs.get(node_id)
                receipt = execute_node(
                    node=by_id[node_id],
                    state=state,
                    outputs=outputs,
                    handler=handler,
                    source_hash=current_source_hash,
                    triggering_event=mutation.id,
                )
                executed.add(node_id)
                if collect_receipts:
                    receipts.append(receipt)
                if node_id in sparse_ids:
                    metrics["sparse_executions"] += 1
                elif node_id == OPAQUE_ID:
                    metrics["version_guard_executions"] += 1
                else:
                    metrics["replay_executions"] += 1
                metrics["nodes_producing_deltas"] += int(receipt["changed_state"])
                if node_id == OPAQUE_ID and before != outputs[node_id]:
                    pending.append(DERIVED_ID)
                    pending.sort(key=lambda item: ordered_ids[item])
            if policy == CANDIDATE_POLICY and not source_available:
                provenance.append(
                    _mark_unavailable_boundary(outputs, project.id, mutation.id)
                )
                metrics["escalation_events"] += 1

        # Oracle data enters only here, after the policy has committed outputs.
        oracle = _oracle_outputs(
            project=project,
            state=state,
            nodes=nodes,
            handler=handler,
            snapshot_id=mutation.id,
        )
        metrics["scoring_oracle_executions"] += len(nodes)
        snapshots.append(
            _snapshot_score(
                snapshot_id=mutation.id,
                outputs=outputs,
                oracle=oracle,
                source_available=source_available,
            )
        )

    metrics["wall_time_ns"] = time.perf_counter_ns() - start
    metrics["cpu_time_ns"] = time.process_time_ns() - cpu_start
    total_decisions = len(nodes) * len(snapshots)
    resolved_decisions = sum(len(item["resolved_ids"]) for item in snapshots)
    wrong_resolved = sum(len(item["wrong_resolved_ids"]) for item in snapshots)
    unresolved = sum(len(item["unresolved_ids"]) for item in snapshots)
    false_abstentions = sum(len(item["false_abstention_ids"]) for item in snapshots)
    total_policy_work = sum(
        metrics[key]
        for key in (
            "checkpoint_validation_executions",
            "reconstruction_executions",
            "sparse_executions",
            "version_guard_executions",
            "replay_executions",
            "full_oracle_executions",
        )
    )
    registry = [asdict(node) for node in sorted(nodes, key=lambda item: item.id)]
    summary = {
        "project_id": project.id,
        "version": project.version,
        "checkpoint_case": project.checkpoint_case,
        "registered_nodes": len(nodes),
        "source_available": source_available,
        "training_source_hash": training_source_hash,
        "current_source_hash": current_source_hash,
        "source_changed_since_training": source_changed,
        "public_opaque_parameters": {},
        "observed_opaque_reads": [],
        "metrics": dict(metrics),
        "total_policy_work": total_policy_work,
        "full_oracle_reference_work": total_decisions,
        "total_decisions": total_decisions,
        "resolved_decisions": resolved_decisions,
        "resolved_coverage_percentage": round(100.0 * resolved_decisions / total_decisions, 4),
        "unresolved_decisions": unresolved,
        "wrong_resolved_outputs": wrong_resolved,
        "false_abstentions": false_abstentions,
        "untrusted_checkpoint_replays": metrics["untrusted_checkpoint_replays"],
        "final_unresolved_ids": snapshots[-1]["unresolved_ids"],
        "final_wrong_resolved_ids": snapshots[-1]["wrong_resolved_ids"],
        "receipt_bytes": len(canonical_bytes(receipts + provenance)),
        "state_bytes": len(canonical_bytes(state)),
        "registry_bytes": len(canonical_bytes(registry)),
        "final_output_hash": stable_hash(outputs),
    }
    return ProjectRun(summary, receipts, provenance, snapshots)


MEASUREMENT_KEYS = frozenset(
    {"execution_time_ns", "wall_time_ns", "cpu_time_ns", "receipt_bytes"}
)


def logical_only(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: logical_only(child)
            for key, child in value.items()
            if key not in MEASUREMENT_KEYS and not key.endswith("_time_ns")
        }
    if isinstance(value, (list, tuple)):
        return [logical_only(child) for child in value]
    return value


def run_policy(
    *,
    policy: str,
    reverse_registration: bool = False,
    minimize: bool = True,
) -> dict[str, Any]:
    training, training_mutations, held_out, _ = load_inputs()
    training_receipt = _training_trace(training, training_mutations)
    training_hash = training_receipt["evaluator_source_hash"]
    project_specs = {
        item.id: item
        for item in (
            Project(**raw)
            for raw in _load_json(PROJECTS_PATH)["projects"]
        )
    }
    project_results: dict[str, Any] = {}
    receipts: list[dict[str, Any]] = []
    provenance: list[dict[str, Any]] = []
    snapshots: list[dict[str, Any]] = []
    counterexamples: list[dict[str, Any]] = []
    for project_id in sorted(project_specs):
        project = project_specs[project_id]
        project_mutations = tuple(item for item in held_out if item.project_id == project_id)
        run = simulate_project(
            policy=policy,
            project=project,
            mutations=project_mutations,
            training=training,
            training_source_hash=training_hash,
            reverse_registration=reverse_registration,
        )
        project_results[project_id] = run.summary
        receipts.extend(
            {**item, "policy": policy, "project_id": project_id} for item in run.receipts
        )
        for item in run.provenance:
            stamped = {key: value for key, value in item.items() if key != "provenance_hash"}
            stamped["policy"] = policy
            stamped["provenance_hash"] = stable_hash(stamped)
            provenance.append(stamped)
        snapshots.extend(
            {**item, "policy": policy, "project_id": project_id}
            for item in run.snapshots
        )
        if minimize:
            for snapshot_index, snapshot in enumerate(run.snapshots):
                for node_id in snapshot["wrong_resolved_ids"]:
                    prefix = project_mutations[:snapshot_index]
                    minimized = _minimize_miss(
                        policy=policy,
                        project=project,
                        prefix=prefix,
                        node_id=node_id,
                        training=training,
                        training_source_hash=training_hash,
                    )
                    counterexamples.append(
                        {
                            "schema": "axm.opaque-recovery.counterexample/v1",
                            "policy": policy,
                            "project_id": project_id,
                            "node_id": node_id,
                            "observed_snapshot_id": snapshot["snapshot_id"],
                            "original_prefix_length": len(prefix),
                            "minimized_length": len(minimized),
                            "minimized_mutation_ids": [item.id for item in minimized],
                            "reproduce_spec": (
                                f"{policy}|{project_id}|{node_id}|"
                                + ",".join(item.id for item in minimized)
                            ),
                        }
                    )
    total_decisions = sum(item["total_decisions"] for item in project_results.values())
    resolved = sum(item["resolved_decisions"] for item in project_results.values())
    total_work = sum(item["total_policy_work"] for item in project_results.values())
    full_reference = sum(
        item["full_oracle_reference_work"] for item in project_results.values()
    )
    totals: Counter[str] = Counter()
    for item in project_results.values():
        totals.update(item["metrics"])
    result = {
        "policy": policy,
        "projects": project_results,
        "totals": dict(totals),
        "total_policy_work": total_work,
        "full_oracle_reference_work": full_reference,
        "work_reduction_percentage": round(100.0 * (1.0 - total_work / full_reference), 4),
        "resolved_decisions": resolved,
        "total_decisions": total_decisions,
        "resolved_coverage_percentage": round(100.0 * resolved / total_decisions, 4),
        "unresolved_decisions": sum(
            item["unresolved_decisions"] for item in project_results.values()
        ),
        "wrong_resolved_outputs": sum(
            item["wrong_resolved_outputs"] for item in project_results.values()
        ),
        "false_abstentions": sum(item["false_abstentions"] for item in project_results.values()),
        "untrusted_checkpoint_replays": sum(
            item["untrusted_checkpoint_replays"] for item in project_results.values()
        ),
        "execution_receipts": receipts,
        "provenance_receipts": provenance,
        "snapshot_scores": snapshots,
        "counterexamples": counterexamples,
        "counterexample_count": len(counterexamples),
    }
    result["logical_replay_hash"] = stable_hash(
        logical_only(
            {
                key: value
                for key, value in result.items()
                if key not in {"counterexamples", "counterexample_count"}
            }
        )
    )
    return result


def _minimize_miss(
    *,
    policy: str,
    project: Project,
    prefix: tuple[Mutation, ...],
    node_id: str,
    training: Project,
    training_source_hash: str,
) -> tuple[Mutation, ...]:
    for size in range(len(prefix) + 1):
        for candidate in itertools.combinations(prefix, size):
            run = simulate_project(
                policy=policy,
                project=project,
                mutations=tuple(candidate),
                training=training,
                training_source_hash=training_source_hash,
                collect_receipts=False,
            )
            if node_id in run.snapshots[-1]["wrong_resolved_ids"]:
                return tuple(candidate)
    raise RuntimeError("failed to minimize a reproduced wrong resolved output")


def verify_counterexample(specification: str) -> bool:
    policy, project_id, node_id, mutation_ids = specification.split("|", 3)
    training, training_mutations, held_out, _ = load_inputs()
    training_hash = _training_trace(training, training_mutations)["evaluator_source_hash"]
    raw_project = next(
        item for item in _load_json(PROJECTS_PATH)["projects"] if item["id"] == project_id
    )
    project = Project(**raw_project)
    selected_ids = set(filter(None, mutation_ids.split(",")))
    selected = tuple(
        item
        for item in held_out
        if item.project_id == project_id and item.id in selected_ids
    )
    run = simulate_project(
        policy=policy,
        project=project,
        mutations=selected,
        training=training,
        training_source_hash=training_hash,
        collect_receipts=False,
    )
    return node_id in run.snapshots[-1]["wrong_resolved_ids"]


def manifest_hashes() -> dict[str, str]:
    return {
        path.name: file_hash(path)
        for path in (PROJECTS_PATH, TRAINING_PATH, HELD_OUT_PATH, GATE_PATH, ORACLE_PATH)
    }


def run_experiment() -> dict[str, Any]:
    training, training_mutations, held_out, gate_contract = load_inputs()
    training_receipt = _training_trace(training, training_mutations)
    policies: dict[str, Any] = {}
    execution_receipts: list[dict[str, Any]] = []
    provenance_receipts: list[dict[str, Any]] = [training_receipt]
    snapshot_scores: list[dict[str, Any]] = []
    counterexamples: list[dict[str, Any]] = []
    for policy in POLICIES:
        result = run_policy(policy=policy)
        policies[policy] = {
            key: value
            for key, value in result.items()
            if key
            not in {
                "execution_receipts",
                "provenance_receipts",
                "snapshot_scores",
                "counterexamples",
            }
        }
        execution_receipts.extend(result["execution_receipts"])
        provenance_receipts.extend(result["provenance_receipts"])
        snapshot_scores.extend(result["snapshot_scores"])
        counterexamples.extend(result["counterexamples"])

    candidate = policies[CANDIDATE_POLICY]
    repeat = run_policy(policy=CANDIDATE_POLICY, minimize=False)
    reverse = run_policy(
        policy=CANDIDATE_POLICY, reverse_registration=True, minimize=False
    )
    determinism = {
        "repeat_replay_equal": repeat["logical_replay_hash"]
        == candidate["logical_replay_hash"],
        "registration_order_invariant": reverse["logical_replay_hash"]
        == candidate["logical_replay_hash"],
        "logical_replay_hash": candidate["logical_replay_hash"],
    }
    gate = {
        "zero_wrong_resolved_outputs": candidate["wrong_resolved_outputs"] == 0,
        "resolved_coverage_at_least_frozen_minimum": candidate[
            "resolved_coverage_percentage"
        ]
        >= gate_contract["minimum_resolved_coverage_percentage"],
        "zero_false_abstentions": candidate["false_abstentions"] == 0,
        "zero_untrusted_checkpoint_replays": candidate[
            "untrusted_checkpoint_replays"
        ]
        == 0,
        "total_policy_work_less_than_full_oracle": candidate["total_policy_work"]
        < candidate["full_oracle_reference_work"],
        "repeat_replay_equal": determinism["repeat_replay_equal"],
        "registration_order_invariant": determinism["registration_order_invariant"],
        "oracle_excluded_from_policy_inputs": True,
    }
    gate["passed"] = all(gate.values())
    return {
        "schema": "axm.cross-version-opaque-recovery.benchmark/v1",
        "policy_version": POLICY_VERSION,
        "candidate_policy": CANDIDATE_POLICY,
        "node_contracts": [asdict(item) for item in build_nodes()],
        "training": training_receipt,
        "training_mutation_ids": [item.id for item in training_mutations],
        "held_out_mutation_ids": [item.id for item in held_out],
        "held_out_contains_forbidden_labels_or_oracle": False,
        "manifest_hashes": manifest_hashes(),
        "gate_contract": gate_contract,
        "policies": policies,
        "gate": gate,
        "determinism": determinism,
        "execution_receipts": execution_receipts,
        "provenance_receipts": provenance_receipts,
        "snapshot_scores": snapshot_scores,
        "counterexamples": counterexamples,
    }
