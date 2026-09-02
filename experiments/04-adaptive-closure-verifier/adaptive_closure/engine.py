"""Sparse policies, bounded audits, explicit repair, rollback, and replay."""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass

from .foundation_loader import stable_hash
from .model import Event, MissingEvidence, Node, SliceView, generate_events, make_fixture


POLICIES = ("NO_AUDIT", "FIXED_INTERVAL", "SEEDED_SAMPLE", "RISK_ADAPTIVE", "FULL_ORACLE", "OBSERVED_RECONCILE")


@dataclass
class Metrics:
    policy: str
    transitions: int = 0
    handler_executions: int = 0
    audit_handler_executions: int = 0
    startup_trace_handler_executions: int = 0
    audits: int = 0
    full_audits: int = 0
    detections: int = 0
    detection_latency_transitions: int = 0
    maximum_damage_window: int = 0
    corrupted_output_transitions: int = 0
    corrupted_outputs: int = 0
    rollback_events: int = 0
    replay_handler_executions: int = 0
    learned_edges: int = 0
    learned_fields: int = 0
    quarantines: int = 0
    abstentions: int = 0
    unresolved_items: int = 0
    undetected_self_heals: int = 0
    observed_read_set_changes: int = 0
    proactive_reconciliations: int = 0
    final_equality: bool = False
    wall_time_ns: int = 0
    policy_work_time_ns: int = 0
    oracle_measurement_time_ns: int = 0


def _index(nodes: list[Node]) -> dict[str, tuple[str, ...]]:
    found: dict[str, list[str]] = {}
    for node in nodes:
        for field in node.declared:
            found.setdefault(field, []).append(node.id)
    return {field: tuple(sorted(ids)) for field, ids in found.items()}


def _values(state: dict[str, int], outputs: dict[str, int | str]) -> dict[str, int]:
    values = dict(state)
    values.update({f"@{key}": value for key, value in outputs.items() if isinstance(value, int)})
    return values


def _evaluate(node: Node, state: dict[str, int], outputs: dict[str, int | str], full: bool = False) -> tuple[int | str, tuple[str, ...]]:
    view = SliceView(_values(state, outputs), None if full else frozenset(node.permitted))
    try:
        value = node.evaluate(view)
    except MissingEvidence as exc:
        value = f"ABSTAIN:missing:{exc.args[0]}"
    return value, tuple(sorted(view.reads))


def full_outputs(state: dict[str, int], nodes: list[Node]) -> tuple[dict[str, int | str], int]:
    outputs: dict[str, int | str] = {node.id: 0 for node in nodes}
    evaluations = 0
    for _ in range(len(nodes) + 1):
        changed = False
        for node in nodes:
            value, _ = _evaluate(node, state, outputs, full=True)
            evaluations += 1
            if outputs.get(node.id) != value:
                outputs[node.id] = value
                changed = True
        if not changed:
            return outputs, evaluations
    raise RuntimeError("fixture did not quiesce")


def _initial_sparse(state: dict[str, int], nodes: list[Node]) -> dict[str, int | str]:
    outputs: dict[str, int | str] = {node.id: 0 for node in nodes}
    # Settle the tiny dependency chain before the measured event sequence.
    for _ in range(len(nodes)):
        changed = False
        for node in nodes:
            value, _ = _evaluate(node, state, outputs)
            if outputs[node.id] != value:
                outputs[node.id] = value
                changed = True
        if not changed:
            break
    return outputs


def _apply_sparse(state: dict[str, int], outputs: dict[str, int | str], nodes: list[Node], event: Event) -> tuple[int, list[dict]]:
    by_id = {node.id: node for node in nodes}
    index = _index(nodes)
    queue = list(index.get(event.field, ()))
    executed = 0
    receipts: list[dict] = []
    while queue:
        node_id = queue.pop(0)
        node = by_id[node_id]
        before = outputs[node_id]
        value, reads = _evaluate(node, state, outputs)
        executed += 1
        outputs[node_id] = value
        receipts.append({"node": node_id, "reads": reads, "before": before, "after": value})
        if value != before:
            queue.extend(candidate for candidate in index.get(f"@{node_id}", ()) if candidate not in queue)
            queue.sort()
    return executed, receipts


def _audit_selection(policy: str, transition: int, nodes: list[Node], event: Event, seen_shapes: set[str], last_full: int, receipts: list[dict], seed: int) -> tuple[str, ...]:
    ids = tuple(sorted(node.id for node in nodes))
    if policy == "NO_AUDIT":
        return ()
    if policy == "FULL_ORACLE":
        return ids
    if policy == "FIXED_INTERVAL":
        return ids if (transition + 1) % 25 == 0 else ()
    if policy == "OBSERVED_RECONCILE":
        return ids if (transition + 1) % 20 == 0 else tuple(sorted({r["node"] for r in receipts}))
    if policy == "SEEDED_SAMPLE":
        # One deterministic node per four transitions; sampling can leave a
        # residual wrong interval and is intentionally not upgraded to proof.
        if transition % 4:
            return ()
        token = int(stable_hash({"seed": seed, "transition": transition})[:12], 16)
        return (ids[token % len(ids)],)
    # Declared risk only: new event shape, verification age, high-authority
    # execution, or an explicit abstention. Oracle mismatch is not a signal.
    awakened = {r["node"] for r in receipts}
    by_id = {node.id: node for node in nodes}
    abstained = any(str(r["after"]).startswith("ABSTAIN:") for r in receipts)
    high_authority = any(by_id[node_id].authority >= 3 for node_id in awakened)
    if event.shape not in seen_shapes or transition - last_full >= 12 or abstained or high_authority:
        return ids
    return ()


def _repair(nodes: list[Node], selected: tuple[str, ...], state: dict[str, int], outputs: dict[str, int | str], oracle: dict[str, int | str], receipts: list[dict], metrics: Metrics, transition: int, unresolved_seen: set[str]) -> tuple[list[Node], list[dict]]:
    amended = {node.id: node for node in nodes}
    evidence: list[dict] = []
    receipt_reads = {receipt["node"]: receipt["reads"] for receipt in receipts}
    for node_id in selected:
        node = amended[node_id]
        current = outputs[node_id]
        if node_id in unresolved_seen and current == oracle[node_id]:
            continue
        if current == oracle[node_id] and not str(current).startswith("ABSTAIN:"):
            continue
        _, actual_reads = _evaluate(node, state, oracle, full=True)
        missing_edges = sorted(set(actual_reads) - set(node.declared))
        missing_fields = sorted(set(actual_reads) - set(node.permitted))
        before = {"declared": node.declared, "permitted": node.permitted}
        for field in missing_edges:
            node = node.with_edge(field)
            metrics.learned_edges += 1
        for field in missing_fields:
            node = node.with_field(field)
            metrics.learned_fields += 1
        safely_repaired = bool(missing_edges or missing_fields) and oracle[node_id] != "ABSTAIN:invalid_dormant_value"
        if not safely_repaired:
            metrics.quarantines += 1
            metrics.unresolved_items += 1
            unresolved_seen.add(node_id)
        amended[node_id] = node
        metrics.detections += 1
        evidence.append({
            "transition": transition, "node": node_id, "current": current,
            "oracle": oracle[node_id], "runtime_reads": receipt_reads.get(node_id, ()),
            "traced_reads": actual_reads, "missing_edges": missing_edges,
            "missing_fields": missing_fields, "before": before,
            "after": {"declared": node.declared, "permitted": node.permitted},
            "action": "repair_then_replay" if safely_repaired else "quarantine_unresolved",
        })
    return sorted(amended.values(), key=lambda node: node.id), evidence


def run_policy(policy: str, events: list[Event], faults: frozenset[str], seed: int = 20260902, capture: bool = False, reverse_registration: bool = False) -> dict:
    if policy not in POLICIES:
        raise ValueError(policy)
    initial_state, nodes = make_fixture(faults)
    events = [
        Event(event.field, 4, event.shape)
        if "dormant" not in faults and event.field == "dormant_value" and event.value < 0
        else event
        for event in events
    ]
    if reverse_registration:
        nodes = list(reversed(nodes))
    state = dict(initial_state)
    # Genesis is the first verified checkpoint. Faulty routing/slices are
    # allowed to corrupt it only after a relevant event, never retroactively.
    outputs, _ = full_outputs(state, nodes)
    metrics = Metrics(policy)
    metrics.abstentions = sum(str(value).startswith("ABSTAIN:") for value in outputs.values())
    seen_shapes: set[str] = set()
    last_full = -1
    checkpoint = (0, dict(state), dict(outputs))
    first_wrong: int | None = None
    evidence: list[dict] = []
    unresolved_seen: set[str] = set()
    observed_sets: dict[str, tuple[str, ...]] = {}
    if policy == "OBSERVED_RECONCILE":
        amended = {node.id: node for node in nodes}
        for node in nodes:
            _, reads = _evaluate(node, state, outputs, full=True)
            observed_sets[node.id] = reads
            missing_edges = sorted(set(reads) - set(node.declared))
            missing_fields = sorted(set(reads) - set(node.permitted))
            if missing_edges or missing_fields:
                before = {"declared": node.declared, "permitted": node.permitted}
                for field in missing_edges:
                    node = node.with_edge(field)
                    metrics.learned_edges += 1
                for field in missing_fields:
                    node = node.with_field(field)
                    metrics.learned_fields += 1
                amended[node.id] = node
                metrics.detections += 1
                metrics.proactive_reconciliations += 1
                evidence.append({
                    "transition": -1, "node": node.id, "current": outputs[node.id],
                    "oracle": _evaluate(node, state, outputs, full=True)[0],
                    "runtime_reads": reads, "traced_reads": reads,
                    "missing_edges": missing_edges, "missing_fields": missing_fields,
                    "before": before,
                    "after": {"declared": node.declared, "permitted": node.permitted},
                    "action": "observed_read_cold_start_reconciliation",
                })
        metrics.startup_trace_handler_executions = len(nodes)
        metrics.audit_handler_executions += len(nodes)
        nodes = sorted(amended.values(), key=lambda node: node.id)
        outputs = _initial_sparse(state, nodes)
    logical: list[dict] = []
    start = time.perf_counter_ns()
    for transition, event in enumerate(events):
        state[event.field] = event.value
        executed, receipts = _apply_sparse(state, outputs, nodes, event)
        metrics.handler_executions += executed
        metrics.transitions += 1
        oracle_start = time.perf_counter_ns()
        oracle, _ = full_outputs(state, nodes)
        metrics.oracle_measurement_time_ns += time.perf_counter_ns() - oracle_start
        mismatched = tuple(sorted(key for key in oracle if outputs.get(key) != oracle[key]))
        if mismatched:
            metrics.corrupted_output_transitions += 1
            metrics.corrupted_outputs += len(mismatched)
            if first_wrong is None:
                first_wrong = transition
        metrics.abstentions += sum(str(r["after"]).startswith("ABSTAIN:") for r in receipts)
        selected = _audit_selection(policy, transition, nodes, event, seen_shapes, last_full, receipts, seed)
        if selected:
            metrics.audits += 1
            metrics.audit_handler_executions += len(selected)
            by_id = {node.id: node for node in nodes}
            # Perform the selected audit handlers; comparison uses their
            # deterministic values. The always-on offline oracle below remains
            # benchmark instrumentation and is accounted separately.
            audit_reads: dict[str, tuple[str, ...]] = {}
            for node_id in selected:
                _, reads = _evaluate(by_id[node_id], state, oracle, full=True)
                audit_reads[node_id] = reads
            if policy == "OBSERVED_RECONCILE":
                amended = dict(by_id)
                for node_id, reads in audit_reads.items():
                    prior = observed_sets.get(node_id, ())
                    if reads != prior:
                        metrics.observed_read_set_changes += 1
                        node = amended[node_id]
                        missing_edges = sorted(set(reads) - set(node.declared))
                        missing_fields = sorted(set(reads) - set(node.permitted))
                        if missing_edges or missing_fields:
                            before = {"declared": node.declared, "permitted": node.permitted}
                            for field in missing_edges:
                                node = node.with_edge(field)
                                metrics.learned_edges += 1
                            for field in missing_fields:
                                node = node.with_field(field)
                                metrics.learned_fields += 1
                            amended[node_id] = node
                            metrics.detections += 1
                            metrics.proactive_reconciliations += 1
                            evidence.append({
                                "transition": transition, "node": node_id,
                                "current": outputs[node_id], "oracle": oracle[node_id],
                                "runtime_reads": reads, "traced_reads": reads,
                                "missing_edges": missing_edges, "missing_fields": missing_fields,
                                "before": before,
                                "after": {"declared": node.declared, "permitted": node.permitted},
                                "action": "observed_read_reconciliation",
                            })
                    observed_sets[node_id] = reads
                nodes = sorted(amended.values(), key=lambda node: node.id)
            if len(selected) == len(nodes):
                metrics.full_audits += 1
            nodes, found = _repair(nodes, selected, state, outputs, oracle, receipts, metrics, transition, unresolved_seen)
            if found:
                if first_wrong is not None:
                    latency = transition - first_wrong + 1
                    metrics.detection_latency_transitions += latency
                    metrics.maximum_damage_window = max(metrics.maximum_damage_window, latency)
                evidence.extend(found)
                # Roll back to last fully verified checkpoint and replay the
                # bounded suffix using only recorded events and amended metadata.
                checkpoint_index, state = checkpoint[0], dict(checkpoint[1])
                # A repaired permitted slice can invalidate the old cached
                # output even at the checkpoint. Re-materialize deterministically
                # under the amended contract before replay; count the work.
                outputs = _initial_sparse(state, nodes)
                metrics.replay_handler_executions += len(nodes)
                for replay_event in events[checkpoint_index : transition + 1]:
                    state[replay_event.field] = replay_event.value
                    replayed, _ = _apply_sparse(state, outputs, nodes, replay_event)
                    metrics.replay_handler_executions += replayed
                    metrics.rollback_events += 1
                first_wrong = None
                oracle_start = time.perf_counter_ns()
                oracle, _ = full_outputs(state, nodes)
                metrics.oracle_measurement_time_ns += time.perf_counter_ns() - oracle_start
            if len(selected) == len(nodes) and outputs == oracle:
                if first_wrong is not None:
                    metrics.undetected_self_heals += 1
                    first_wrong = None
                checkpoint = (transition + 1, dict(state), dict(outputs))
                last_full = transition
        seen_shapes.add(event.shape)
        if capture:
            logical.append({"transition": transition, "event": event.as_dict(), "selected": selected, "mismatched": mismatched, "output_hash": stable_hash(outputs)})
    oracle_start = time.perf_counter_ns()
    final_oracle, _ = full_outputs(state, nodes)
    metrics.oracle_measurement_time_ns += time.perf_counter_ns() - oracle_start
    metrics.final_equality = outputs == final_oracle
    metrics.wall_time_ns = time.perf_counter_ns() - start
    metrics.policy_work_time_ns = metrics.wall_time_ns - metrics.oracle_measurement_time_ns
    payload = asdict(metrics)
    payload.update({
        "faults": sorted(faults), "final_output_hash": stable_hash(outputs),
        "oracle_output_hash": stable_hash(final_oracle), "evidence": evidence,
        "replay_hash": stable_hash({"policy": policy, "events": [e.as_dict() for e in events], "logical": logical, "evidence": evidence, "final": outputs}),
    })
    if capture:
        payload["transition_receipts"] = logical
    return payload


def run_suite(transition_count: int, seed: int = 20260902, capture: bool = False) -> dict:
    events = generate_events(transition_count, seed)
    faults = frozenset(("direct", "indirect", "slice", "branch", "dormant"))
    return {policy: run_policy(policy, events, faults, seed, capture) for policy in POLICIES}
