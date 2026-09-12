"""Sparse deterministic scheduler, receipt production, and merge gate."""

from __future__ import annotations

import time
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass, replace
from typing import Any, Iterable

from .canonical import PermittedStateView, canonical_bytes, get_path, set_path, stable_hash
from .contracts import Event, NodeContract, ProposedDelta, Receipt
from .nodes import execute_handler


@dataclass(slots=True)
class MergeOutcome:
    state: dict[str, Any]
    events: list[Event]
    accepted_deltas: int
    deduplicated_deltas: int
    conflict_objects_created: int
    unresolved_conflicts_created: int
    changed_tokens: set[tuple[str, str]]


@dataclass(slots=True)
class RunResult:
    final_state: dict[str, Any]
    final_state_hash: str
    receipts: list[Receipt]
    metrics: dict[str, Any]

    def replay_fingerprint(self) -> str:
        payloads = sorted(
            (receipt.replay_payload() for receipt in self.receipts),
            key=lambda item: (item["node_id"], stable_hash(item["triggering_event"]), item["output_hash"]),
        )
        return stable_hash({"final_state_hash": self.final_state_hash, "receipts": payloads})


def event_type_for_path(path: str) -> str:
    if path.startswith("object.dimensions"):
        return "dimensions_changed"
    if path.startswith("object.material"):
        return "material_changed"
    if path.startswith("object.design_load"):
        return "load_changed"
    if path.startswith("object.energy"):
        return "energy_changed"
    if path.startswith("object.accessibility"):
        return "accessibility_changed"
    if path.startswith("object.components"):
        return "components_changed"
    if path.startswith("object.provenance"):
        return "provenance_changed"
    if path.startswith("object.mass"):
        return "mass_changed"
    if path.startswith("object.cost"):
        return "cost_changed"
    if path.startswith("object.geometry"):
        return "geometry_changed"
    if path.startswith("object.intended_use"):
        return "intended_use_changed"
    if path.startswith("derived"):
        return "derived_changed"
    if path.startswith("assessments"):
        return "assessment_changed"
    if path.startswith("tests"):
        return "test_changed"
    if path.startswith("recommendations"):
        return "recommendation_changed"
    return f"{path.split('.', 1)[0]}_changed"


def path_domain(path: str) -> str:
    mapping = {
        "derived.cost_estimate_cents": "cost",
        "derived.volume_mm3": "dimensions",
        "derived.dimensions_valid": "dimensions",
        "derived.material_compatible": "material",
        "assessments": "structural",
        "tests": "testing",
        "recommendations": "recommendations",
    }
    exact = mapping.get(path)
    if exact:
        return exact
    root = path.split(".", 1)[0]
    return mapping.get(root, root)


def apply_input_changes(
    initial_state: dict[str, Any], changes: Iterable[tuple[str, Any]]
) -> tuple[dict[str, Any], list[Event], int]:
    state = deepcopy(initial_state)
    events: list[Event] = []
    sequence = 0
    for path, value in changes:
        before = deepcopy(get_path(state, path))
        if before == value:
            continue
        set_path(state, path, deepcopy(value))
        events.append(
            Event(
                sequence=sequence,
                event_type=event_type_for_path(path),
                path=path,
                before=before,
                after=deepcopy(value),
                source="input",
            )
        )
        sequence += 1
    return state, events, sequence


def merge_proposals(
    state: dict[str, Any], proposals: list[ProposedDelta], next_sequence: int
) -> MergeOutcome:
    new_state = deepcopy(state)
    groups: dict[str, list[ProposedDelta]] = defaultdict(list)
    for proposal in proposals:
        if proposal.operation != "set":
            raise ValueError(f"unsupported delta operation: {proposal.operation}")
        groups[proposal.path].append(proposal)

    new_events: list[Event] = []
    accepted = 0
    deduplicated = 0
    conflict_objects_created = 0
    unresolved_conflicts_created = 0
    changed_tokens: set[tuple[str, str]] = set()

    for path in sorted(groups):
        path_proposals = sorted(groups[path], key=lambda item: (item.node_id, stable_hash(item.value)))
        by_value: dict[str, list[ProposedDelta]] = defaultdict(list)
        for proposal in path_proposals:
            by_value[stable_hash(proposal.value)].append(proposal)

        chosen_group: list[ProposedDelta] | None = None
        status = "NO_CONFLICT"
        if len(by_value) == 1:
            chosen_group = next(iter(by_value.values()))
            deduplicated += max(0, len(chosen_group) - 1)
        else:
            domain = path_domain(path)
            authoritative = [proposal for proposal in path_proposals if proposal.authority_domain == domain]
            if authoritative:
                maximum = max(proposal.authority_rank for proposal in authoritative)
                top = [proposal for proposal in authoritative if proposal.authority_rank == maximum]
                top_values = {stable_hash(proposal.value) for proposal in top}
                if len(top_values) == 1:
                    chosen_hash = next(iter(top_values))
                    chosen_group = by_value[chosen_hash]
                    status = "RESOLVED_BY_DOMAIN_AUTHORITY"
            conflict_payload = {
                "path": path,
                "domain": domain,
                "status": status if chosen_group is not None else "UNRESOLVED",
                "selected_value": chosen_group[0].value if chosen_group is not None else None,
                "proposals": [proposal.deterministic_payload() for proposal in path_proposals],
            }
            conflict_id = stable_hash(conflict_payload)
            conflict_path = f"_meta.conflicts.{conflict_id}"
            if get_path(new_state, conflict_path) is None:
                set_path(new_state, conflict_path, conflict_payload)
                conflict_objects_created += 1
                if chosen_group is None:
                    unresolved_conflicts_created += 1
                    set_path(
                        new_state,
                        f"_meta.escalations.{conflict_id}",
                        {"kind": "UNRESOLVED_CONFLICT", "conflict_id": conflict_id, "path": path},
                    )

        if chosen_group is None:
            continue

        chosen = chosen_group[0]
        before = deepcopy(get_path(new_state, path))
        provenance = [
            {
                "node_id": item.node_id,
                "evidence_refs": item.evidence_refs,
                "confidence": item.confidence,
                "proposal_hash": stable_hash(item.deterministic_payload()),
            }
            for item in chosen_group
        ]
        set_path(new_state, f"_meta.provenance.{path}", provenance)
        if before == chosen.value:
            continue
        set_path(new_state, path, deepcopy(chosen.value))
        changed_tokens.add((chosen.node_id, path))
        accepted += 1
        new_events.append(
            Event(
                sequence=next_sequence,
                event_type=event_type_for_path(path),
                path=path,
                before=before,
                after=deepcopy(chosen.value),
                source=f"merge:{chosen.node_id}",
            )
        )
        next_sequence += 1

    return MergeOutcome(
        state=new_state,
        events=new_events,
        accepted_deltas=accepted,
        deduplicated_deltas=deduplicated,
        conflict_objects_created=conflict_objects_created,
        unresolved_conflicts_created=unresolved_conflicts_created,
        changed_tokens=changed_tokens,
    )


class StateFloorRuntime:
    def __init__(self, nodes: Iterable[NodeContract], partition_count: int = 128):
        ordered = sorted(nodes, key=lambda node: node.id)
        if len({node.id for node in ordered}) != len(ordered):
            raise ValueError("node ids must be unique")
        self.nodes = tuple(ordered)
        self.partition_count = partition_count
        self.router: dict[str, tuple[NodeContract, ...]] = {}
        buckets: dict[str, list[NodeContract]] = defaultdict(list)
        for node in self.nodes:
            for subscription in node.subscriptions:
                buckets[subscription].append(node)
        self.router = {
            key: tuple(sorted(bucket, key=lambda node: node.id))
            for key, bucket in buckets.items()
        }

    def _route(self, events: list[Event], order_strategy: str) -> list[tuple[NodeContract, Event]]:
        invocations: dict[tuple[str, str], tuple[NodeContract, Event]] = {}
        for event in events:
            for key in event.route_keys(self.partition_count):
                for node in self.router.get(key, ()):
                    invocations[(node.id, event.deterministic_id())] = (node, event)
        ordered = sorted(
            invocations.values(),
            key=lambda pair: (pair[0].id, pair[1].sequence, pair[1].deterministic_id()),
        )
        if order_strategy == "reverse":
            ordered.reverse()
        elif order_strategy != "id":
            raise ValueError(f"unknown execution order: {order_strategy}")
        return ordered

    @staticmethod
    def _execute(
        node: NodeContract,
        event: Event,
        state: dict[str, Any],
        *,
        state_hash: str | None = None,
    ) -> tuple[list[ProposedDelta], Receipt]:
        state_hash = state_hash or stable_hash(state)
        view = PermittedStateView(state, node.reads)
        start = time.perf_counter_ns()
        deltas = execute_handler(node, view, event)
        elapsed = time.perf_counter_ns() - start
        output_payload = [delta.deterministic_payload() for delta in deltas]
        evidence = tuple(sorted({ref for delta in deltas for ref in delta.evidence_refs}))
        receipt = Receipt(
            node_id=node.id,
            input_state_hash=state_hash,
            triggering_event={
                "id": event.deterministic_id(),
                "sequence": event.sequence,
                "event_type": event.event_type,
                "path": event.path,
                "source": event.source,
            },
            output_delta=tuple(output_payload),
            evidence_refs=evidence,
            output_hash=stable_hash(output_payload),
            execution_time_ns=elapsed,
            changed_state=False,
        )
        return deltas, receipt

    def run(
        self,
        initial_state: dict[str, Any],
        changes: Iterable[tuple[str, Any]],
        *,
        order_strategy: str = "id",
        max_iterations: int = 8,
        mutation_guard: bool = True,
    ) -> RunResult:
        wall_start = time.perf_counter_ns()
        cpu_start = time.process_time_ns()
        state, events, next_sequence = apply_input_changes(initial_state, changes)
        receipts: list[Receipt] = []
        iterations = 0
        route_ns = 0
        merge_ns = 0
        total_invocations = 0
        accepted = 0
        deduplicated = 0
        conflicts = 0
        unresolved = 0
        triggered_node_ids: set[str] = set()
        producing_node_ids: set[str] = set()
        changing_node_ids: set[str] = set()

        while events and iterations < max_iterations:
            iterations += 1
            cycle_state_hash = stable_hash(state)
            route_start = time.perf_counter_ns()
            invocations = self._route(events, order_strategy)
            route_ns += time.perf_counter_ns() - route_start
            proposals: list[ProposedDelta] = []
            cycle_receipt_start = len(receipts)
            for node, event in invocations:
                triggered_node_ids.add(node.id)
                deltas, receipt = self._execute(node, event, state, state_hash=cycle_state_hash)
                total_invocations += 1
                receipts.append(receipt)
                if deltas:
                    producing_node_ids.add(node.id)
                    proposals.extend(deltas)
            if mutation_guard and stable_hash(state) != cycle_state_hash:
                raise RuntimeError("deterministic handler mutated canonical state")

            merge_start = time.perf_counter_ns()
            outcome = merge_proposals(state, proposals, next_sequence)
            merge_ns += time.perf_counter_ns() - merge_start
            state = outcome.state
            next_sequence += len(outcome.events)
            events = outcome.events
            accepted += outcome.accepted_deltas
            deduplicated += outcome.deduplicated_deltas
            conflicts += outcome.conflict_objects_created
            unresolved += outcome.unresolved_conflicts_created
            changing_node_ids.update(node_id for node_id, _path in outcome.changed_tokens)
            for index in range(cycle_receipt_start, len(receipts)):
                receipt = receipts[index]
                changed = any(
                    (receipt.node_id, delta["path"]) in outcome.changed_tokens
                    for delta in receipt.output_delta
                )
                if changed:
                    receipts[index] = replace(receipt, changed_state=True)

        wall_ns = time.perf_counter_ns() - wall_start
        cpu_ns = time.process_time_ns() - cpu_start
        metrics = {
            "registered_nodes": len(self.nodes),
            "triggered_nodes_unique": len(triggered_node_ids),
            "nodes_producing_deltas_unique": len(producing_node_ids),
            "nodes_changing_state_unique": len(changing_node_ids),
            "node_executions": total_invocations,
            "accepted_state_deltas": accepted,
            "deduplicated_deltas": deduplicated,
            "conflict_objects_created": conflicts,
            "unresolved_conflicts_created": unresolved,
            "stabilization_iterations": iterations,
            "quiescent": not events,
            "routing_time_ns": route_ns,
            "merge_time_ns": merge_ns,
            "handler_time_ns": sum(receipt.execution_time_ns for receipt in receipts),
            "cpu_time_ns": cpu_ns,
            "wall_time_ns": wall_ns,
            "dormant_nodes": len(self.nodes) - len(triggered_node_ids),
            "dormant_percentage": round(100.0 * (len(self.nodes) - len(triggered_node_ids)) / len(self.nodes), 6),
            "final_state_bytes": len(canonical_bytes(state)),
            "max_iterations_reached": bool(events),
        }
        return RunResult(state, stable_hash(state), receipts, metrics)
