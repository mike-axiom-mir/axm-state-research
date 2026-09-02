"""Deliberately naive but behaviorally fair full-scan comparison runtime."""

from __future__ import annotations

import json
import time
from dataclasses import replace
from typing import Any, Iterable

from .canonical import canonical_bytes, stable_hash
from .contracts import Event, NodeContract, ProposedDelta, Receipt
from .runtime import RunResult, StateFloorRuntime, apply_input_changes, merge_proposals


class NaiveSpecialistRuntime:
    """Every node receives a decoded full-state + full-history packet every cycle.

    All nodes are evaluated even when irrelevant. A node still honors its own
    declared subscription, which keeps output semantics equivalent to the sparse
    runtime instead of rigging the baseline with spurious output.
    """

    def __init__(self, nodes: Iterable[NodeContract], partition_count: int = 128):
        self.nodes = tuple(sorted(nodes, key=lambda node: node.id))
        self.partition_count = partition_count

    def run(
        self,
        initial_state: dict[str, Any],
        changes: Iterable[tuple[str, Any]],
        *,
        history_context: list[dict[str, Any]] | None = None,
        max_iterations: int = 8,
    ) -> RunResult:
        wall_start = time.perf_counter_ns()
        cpu_start = time.process_time_ns()
        state, events, next_sequence = apply_input_changes(initial_state, changes)
        full_history = list(history_context or [])
        receipts: list[Receipt] = []
        iterations = 0
        specialist_evaluations = 0
        handler_invocations = 0
        duplicated_context_bytes = 0
        scan_ns = 0
        merge_ns = 0
        accepted = 0
        deduplicated = 0
        conflicts = 0
        unresolved = 0
        triggered: set[str] = set()
        producing: set[str] = set()
        changing: set[str] = set()

        while events and iterations < max_iterations:
            iterations += 1
            cycle_history = full_history + [
                {
                    "sequence": event.sequence,
                    "event_type": event.event_type,
                    "path": event.path,
                    "before": event.before,
                    "after": event.after,
                    "source": event.source,
                }
                for event in events
            ]
            packet_bytes = canonical_bytes({"state": state, "history": cycle_history})
            cycle_state_hash = stable_hash(state)
            proposals: list[ProposedDelta] = []
            cycle_receipt_start = len(receipts)
            scan_start = time.perf_counter_ns()
            for node in self.nodes:
                specialist_evaluations += 1
                duplicated_context_bytes += len(packet_bytes)
                packet = json.loads(packet_bytes)
                private_state = packet["state"]
                matching = [
                    event
                    for event in events
                    if any(subscription in event.route_keys(self.partition_count) for subscription in node.subscriptions)
                ]
                for event in matching:
                    triggered.add(node.id)
                    deltas, receipt = StateFloorRuntime._execute(
                        node, event, private_state, state_hash=cycle_state_hash
                    )
                    handler_invocations += 1
                    receipts.append(receipt)
                    if deltas:
                        producing.add(node.id)
                        proposals.extend(deltas)
            scan_ns += time.perf_counter_ns() - scan_start

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
            changing.update(node_id for node_id, _path in outcome.changed_tokens)
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
            "specialist_evaluations": specialist_evaluations,
            "triggered_nodes_unique": len(triggered),
            "nodes_producing_deltas_unique": len(producing),
            "nodes_changing_state_unique": len(changing),
            "handler_invocations": handler_invocations,
            "accepted_state_deltas": accepted,
            "deduplicated_deltas": deduplicated,
            "conflict_objects_created": conflicts,
            "unresolved_conflicts_created": unresolved,
            "stabilization_iterations": iterations,
            "quiescent": not events,
            "full_scan_and_copy_time_ns": scan_ns,
            "merge_time_ns": merge_ns,
            "handler_time_ns": sum(receipt.execution_time_ns for receipt in receipts),
            "cpu_time_ns": cpu_ns,
            "wall_time_ns": wall_ns,
            "duplicated_context_bytes_cumulative": duplicated_context_bytes,
            "final_state_bytes": len(canonical_bytes(state)),
            "max_iterations_reached": bool(events),
        }
        return RunResult(state, stable_hash(state), receipts, metrics)
