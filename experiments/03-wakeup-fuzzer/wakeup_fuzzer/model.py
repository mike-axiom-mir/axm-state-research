"""Small deterministic contracts shared by every scheduling mode."""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Mapping, Protocol


class ReadableState(Protocol):
    def __getitem__(self, key: str) -> int: ...


class TrackingState:
    """Read-only wrapper that records the keys a handler actually accesses."""

    def __init__(self, state: Mapping[str, int]):
        self._state = state
        self.reads: set[str] = set()

    def __getitem__(self, key: str) -> int:
        self.reads.add(key)
        return self._state[key]


@dataclass(frozen=True)
class Check:
    id: str
    perspective: str
    subscriptions: tuple[str, ...]
    actual_reads: tuple[str, ...]
    weights: tuple[int, ...]
    output_mode: str
    bucket: int
    version: str = "1"

    def evaluate(self, state: ReadableState) -> int | bool:
        total = sum(
            (state[field] + 17) * weight
            for field, weight in zip(self.actual_reads, self.weights, strict=True)
        )
        if self.output_mode == "direct":
            return total
        if self.output_mode == "parity":
            return bool(total % 2)
        if self.output_mode == "bucket":
            return total // self.bucket
        raise ValueError(f"unknown output mode: {self.output_mode}")

    def repaired(self) -> "Check":
        return replace(self, subscriptions=self.actual_reads)


@dataclass(frozen=True)
class Mutation:
    field: str
    value: int
    reason: str = "generated"

    def as_dict(self) -> dict[str, int | str]:
        return {"field": self.field, "value": self.value, "reason": self.reason}
