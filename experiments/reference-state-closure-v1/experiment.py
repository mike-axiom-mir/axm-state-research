#!/usr/bin/env python3
"""Deterministic three-engine probe for reference-state closure.

This is a software model, not a claim about neural MoE hardware. Engine A is a
dense oracle. Engine B executes dependency-reachable bodies and maintains a
derived reference summary. Engine C uses the same wake set as B but drops one
sleeping reference contribution as a negative control.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
DEFAULT_FIXTURE = HERE / "fixture.json"
FIXTURE_SCHEMA = "axm.reference-state-closure.fixture.v1"
REPORT_SCHEMA = "axm.reference-state-closure.report.v1"


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def load_fixture(path: Path = DEFAULT_FIXTURE) -> dict[str, Any]:
    fixture = json.loads(path.read_text(encoding="utf-8"))
    validate_fixture(fixture)
    return fixture


def _require_int(value: Any, field: str, *, minimum: int | None = None) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field} must be an integer")
    if minimum is not None and value < minimum:
        raise ValueError(f"{field} must be >= {minimum}")
    return value


def validate_fixture(fixture: dict[str, Any]) -> None:
    if fixture.get("schema") != FIXTURE_SCHEMA:
        raise ValueError(f"fixture schema must be {FIXTURE_SCHEMA}")
    nodes = fixture.get("nodes")
    if not isinstance(nodes, list) or len(nodes) < 2:
        raise ValueError("fixture must define at least two nodes")

    ids: set[str] = set()
    signals: set[str] = set()
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise ValueError(f"nodes[{index}] must be an object")
        node_id = node.get("id")
        signal = node.get("signal")
        if not isinstance(node_id, str) or not node_id or node_id in ids:
            raise ValueError(f"nodes[{index}].id must be a unique non-empty string")
        if not isinstance(signal, str) or not signal or signal in signals:
            raise ValueError(f"nodes[{index}].signal must be unique")
        ids.add(node_id)
        signals.add(signal)
        _require_int(node.get("scale"), f"nodes[{index}].scale")
        _require_int(node.get("bias"), f"nodes[{index}].bias")
        _require_int(node.get("reference"), f"nodes[{index}].reference", minimum=1)

    if fixture.get("omitted_reference_control") not in ids:
        raise ValueError("omitted_reference_control must name a node")
    initial = fixture.get("initial_signals")
    if not isinstance(initial, dict) or set(initial) != signals:
        raise ValueError("initial_signals must define every signal exactly once")
    for name, value in initial.items():
        _require_int(value, f"initial_signals.{name}")

    events = fixture.get("events")
    if not isinstance(events, list) or not events:
        raise ValueError("fixture must define at least one event")
    event_ids: set[str] = set()
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            raise ValueError(f"events[{index}] must be an object")
        event_id = event.get("id")
        if not isinstance(event_id, str) or not event_id or event_id in event_ids:
            raise ValueError(f"events[{index}].id must be unique")
        event_ids.add(event_id)
        for name, value in event.get("signals", {}).items():
            if name not in signals:
                raise ValueError(f"event {event_id} names unknown signal {name}")
            _require_int(value, f"event {event_id}.signals.{name}")
        for name, value in event.get("references", {}).items():
            if name not in ids:
                raise ValueError(f"event {event_id} names unknown reference {name}")
            _require_int(value, f"event {event_id}.references.{name}", minimum=1)
        for name, values in event.get("defaults", {}).items():
            if name not in ids or not isinstance(values, dict):
                raise ValueError(f"event {event_id} has invalid defaults target {name}")
            unknown = set(values) - {"offset", "penalty"}
            if unknown:
                raise ValueError(f"event {event_id} has unknown defaults: {sorted(unknown)}")
            for field, value in values.items():
                _require_int(value, f"event {event_id}.defaults.{name}.{field}", minimum=0)


def initial_state(fixture: dict[str, Any]) -> dict[str, Any]:
    return {
        "signals": copy.deepcopy(fixture["initial_signals"]),
        "references": {node["id"]: node["reference"] for node in fixture["nodes"]},
        "defaults": {
            node["id"]: {"offset": 0, "penalty": 0} for node in fixture["nodes"]
        },
    }


def body(node: dict[str, Any], state: dict[str, Any]) -> int:
    defaults = state["defaults"][node["id"]]
    return max(
        0,
        state["signals"][node["signal"]] * node["scale"]
        + node["bias"]
        + defaults["offset"]
        - defaults["penalty"],
    )


def normalized(numerator: int, denominator: int) -> dict[str, int]:
    factor = math.gcd(numerator, denominator)
    return {"numerator": numerator // factor, "denominator": denominator // factor}


def apply_event(
    state: dict[str, Any], event: dict[str, Any], signal_to_node: dict[str, str]
) -> tuple[set[str], dict[str, int]]:
    wakes: set[str] = set()
    reference_deltas: dict[str, int] = {}
    for signal, value in event.get("signals", {}).items():
        if state["signals"][signal] != value:
            state["signals"][signal] = value
            wakes.add(signal_to_node[signal])
    for node_id, value in event.get("references", {}).items():
        old = state["references"][node_id]
        if old != value:
            state["references"][node_id] = value
            reference_deltas[node_id] = value - old
    for node_id, fields in event.get("defaults", {}).items():
        for field, value in fields.items():
            if state["defaults"][node_id][field] != value:
                state["defaults"][node_id][field] = value
                wakes.add(node_id)
    return wakes, reference_deltas


def _reference_bytes(state: dict[str, Any], reference_total: int) -> tuple[int, int]:
    dense = len(canonical_json({"references": state["references"]}).encode("utf-8"))
    sparse = len(canonical_json({"reference_total": reference_total}).encode("utf-8"))
    return dense, sparse


def _default_bytes(state: dict[str, Any]) -> tuple[int, int]:
    dense = len(canonical_json({"defaults": state["defaults"]}).encode("utf-8"))
    materialized = {
        node_id: {key: value for key, value in fields.items() if value != 0}
        for node_id, fields in state["defaults"].items()
        if any(value != 0 for value in fields.values())
    }
    sparse = len(canonical_json({"defaults": materialized}).encode("utf-8"))
    return dense, sparse


def run_experiment(
    fixture: dict[str, Any], *, fault: str | None = None
) -> dict[str, Any]:
    """Run all three engines; ``fault`` exists only for adversarial tests."""
    validate_fixture(fixture)
    nodes = fixture["nodes"]
    by_id = {node["id"]: node for node in nodes}
    signal_to_node = {node["signal"]: node["id"] for node in nodes}
    state = initial_state(fixture)

    dense_executions = len(nodes)
    sparse_executions = len(nodes)
    sparse_cache = {node["id"]: body(node, state) for node in nodes}
    reference_total = sum(state["references"].values())
    dense_trace: list[dict[str, Any]] = []
    sparse_trace: list[dict[str, Any]] = []
    control_trace: list[dict[str, Any]] = []
    wake_trace: list[list[str]] = []
    dense_reference_bytes: list[int] = []
    sparse_reference_bytes: list[int] = []
    dense_default_bytes: list[int] = []
    sparse_default_bytes: list[int] = []
    missed_reference_contributions = 0
    omitted = fixture["omitted_reference_control"]

    for event in fixture["events"]:
        wakes, reference_deltas = apply_event(state, event, signal_to_node)
        dense_values = {node["id"]: body(node, state) for node in nodes}
        dense_executions += len(nodes)

        for node_id in wakes:
            sparse_cache[node_id] = body(by_id[node_id], state)
        sparse_executions += len(wakes)
        if fault != "drop-reference-summary-update":
            reference_total += sum(reference_deltas.values())

        dense_output = normalized(sum(dense_values.values()), sum(state["references"].values()))
        sparse_output = normalized(sum(sparse_cache.values()), reference_total)
        control_denominator = reference_total
        if omitted not in wakes:
            control_denominator -= state["references"][omitted]
            if state["references"][omitted] != 0:
                missed_reference_contributions += 1
        control_output = normalized(sum(sparse_cache.values()), control_denominator)

        dense_trace.append({"event": event["id"], "output": dense_output})
        sparse_trace.append({"event": event["id"], "output": sparse_output})
        control_trace.append({"event": event["id"], "output": control_output})
        wake_trace.append(sorted(wakes))
        dense_ref, sparse_ref = _reference_bytes(state, reference_total)
        dense_defaults, sparse_defaults = _default_bytes(state)
        dense_reference_bytes.append(dense_ref)
        sparse_reference_bytes.append(sparse_ref)
        dense_default_bytes.append(dense_defaults)
        sparse_default_bytes.append(sparse_defaults)

    canonical_equality = dense_trace == sparse_trace
    control_divergences = sum(
        dense_item != control_item
        for dense_item, control_item in zip(dense_trace, control_trace)
    )
    max_dense_defaults = max(dense_default_bytes)
    max_sparse_defaults = max(sparse_default_bytes)
    gate_passes = (
        canonical_equality
        and control_divergences > 0
        and sparse_executions < dense_executions
        and max(sparse_reference_bytes) < max(dense_reference_bytes)
    )

    return {
        "schema": REPORT_SCHEMA,
        "status": "PASS" if gate_passes else "HOLD",
        "fixture_sha256": digest(fixture),
        "engines": {
            "A": "dense oracle",
            "B": "sparse execution plus reference closure",
            "C": f"negative control omitting sleeping reference {omitted!r}",
        },
        "correctness": {
            "canonical_output_equality_A_B": canonical_equality,
            "normalization_equality_A_B": canonical_equality,
            "replay_digest_A": digest(dense_trace),
            "replay_digest_B": digest(sparse_trace),
            "aggressive_control_divergences_A_C": control_divergences,
            "missed_reference_contributions_C": missed_reference_contributions,
        },
        "work": {
            "nodes": len(nodes),
            "transitions": len(fixture["events"]),
            "dense_body_executions_A": dense_executions,
            "sparse_body_executions_B": sparse_executions,
            "executions_avoided_B": dense_executions - sparse_executions,
            "wake_trace_B": wake_trace,
        },
        "state_encoding": {
            "max_dense_reference_bytes_A": max(dense_reference_bytes),
            "max_derived_reference_bytes_B": max(sparse_reference_bytes),
            "max_dense_default_bytes_A": max_dense_defaults,
            "max_sparse_default_bytes_B": max_sparse_defaults,
            "implicit_default_bytes_avoided_B": max_dense_defaults - max_sparse_defaults,
        },
        "truth_boundary": [
            "software runtime model; no neural or hardware performance claim",
            "derived reference total is rebuildable from canonical fixture state",
            "integer arithmetic and canonical JSON make replay byte-inspectable",
            "a passing fixture is evidence for this workload, not a universal proof",
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = run_experiment(load_fixture(args.fixture))
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
