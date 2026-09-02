"""Deterministic fixture contracts and controlled closure faults."""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Mapping, Protocol


class MissingEvidence(KeyError):
    pass


class Readable(Protocol):
    def __getitem__(self, key: str) -> int: ...


class SliceView:
    def __init__(self, values: Mapping[str, int], permitted: frozenset[str] | None):
        self.values = values
        self.permitted = permitted
        self.reads: set[str] = set()

    def __getitem__(self, key: str) -> int:
        self.reads.add(key)
        if self.permitted is not None and key not in self.permitted:
            raise MissingEvidence(key)
        return self.values[key]


@dataclass(frozen=True)
class Node:
    id: str
    kind: str
    declared: tuple[str, ...]
    required: tuple[str, ...]
    permitted: tuple[str, ...]
    authority: int = 1
    version: str = "1"

    def evaluate(self, view: Readable) -> int | str:
        if self.kind == "sum":
            return sum(view[field] for field in self.required)
        if self.kind == "producer":
            return view[self.required[0]] * 3
        if self.kind == "consumer":
            return view[self.required[0]] + view[self.required[1]]
        if self.kind == "branch":
            mode = view["mode"]
            return view["branch_q"] if mode else view["branch_p"]
        if self.kind == "dormant":
            if not view["dormant_enabled"]:
                return 0
            value = view["dormant_value"]
            return "ABSTAIN:invalid_dormant_value" if value < 0 else value
        raise ValueError(self.kind)

    def with_edge(self, field: str) -> "Node":
        return replace(self, declared=tuple(sorted(set(self.declared) | {field})))

    def with_field(self, field: str) -> "Node":
        return replace(self, permitted=tuple(sorted(set(self.permitted) | {field})))


@dataclass(frozen=True)
class Event:
    field: str
    value: int
    shape: str

    def as_dict(self) -> dict[str, int | str]:
        return {"field": self.field, "value": self.value, "shape": self.shape}


FAULTS = ("direct", "indirect", "slice", "branch", "dormant")


def make_fixture(faults: frozenset[str]) -> tuple[dict[str, int], list[Node]]:
    state = {
        "direct_a": 1, "direct_b": 2, "chain_source": 2, "chain_bias": 1,
        "slice_a": 3, "slice_evidence": 5, "mode": 0, "branch_p": 7,
        "branch_q": 11, "dormant_enabled": 0, "dormant_value": 4,
    }
    nodes = [
        Node("branch", "branch", ("mode", "branch_p") if "branch" in faults else ("mode", "branch_p", "branch_q"), ("mode", "branch_p", "branch_q"), ("mode", "branch_p", "branch_q"), 2),
        Node("chain_consumer", "consumer", ("chain_bias",) if "indirect" in faults else ("@chain_producer", "chain_bias"), ("@chain_producer", "chain_bias"), ("@chain_producer", "chain_bias"), 2),
        Node("chain_producer", "producer", ("chain_source",), ("chain_source",), ("chain_source",), 2),
        Node("direct", "sum", ("direct_a",) if "direct" in faults else ("direct_a", "direct_b"), ("direct_a", "direct_b"), ("direct_a", "direct_b"), 3),
        Node("dormant", "dormant", ("dormant_enabled", "dormant_value"), ("dormant_enabled", "dormant_value"), ("dormant_enabled", "dormant_value"), 3),
        Node("slice", "sum", ("slice_a", "slice_evidence"), ("slice_a", "slice_evidence"), ("slice_a",) if "slice" in faults else ("slice_a", "slice_evidence"), 3),
    ]
    return state, sorted(nodes, key=lambda node: node.id)


def generate_events(count: int, seed: int = 20260902) -> list[Event]:
    # A fixed deterministic schedule plants every failure early, then repeats a
    # mixed workload. The LCG avoids depending on interpreter RNG details.
    planted = [
        Event("direct_b", 9, "direct_change"),
        Event("chain_source", 8, "chain_change"),
        Event("slice_a", 10, "slice_change"),
        Event("mode", 1, "branch_flip"),
        Event("branch_q", 19, "branch_new_path"),
        Event("dormant_value", -99, "dormant_invalid"),
        Event("dormant_enabled", 1, "dormant_activation"),
    ]
    fields = tuple(state_key for state_key in make_fixture(frozenset())[0] if state_key != "dormant_enabled")
    events = planted[:count]
    value = seed & 0x7FFFFFFF
    while len(events) < count:
        value = (1103515245 * value + 12345) & 0x7FFFFFFF
        field = fields[value % len(fields)]
        next_value = (value // 97) % 31
        if field == "mode":
            next_value %= 2
        if field == "dormant_value":
            next_value = max(0, next_value)
        events.append(Event(field, next_value, f"generated:{field}"))
    return events
