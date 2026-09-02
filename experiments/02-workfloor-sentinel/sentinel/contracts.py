"""Sentinel-specific deterministic contracts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class CheckContract:
    id: str
    perspective: str
    dependencies: tuple[str, ...]
    evaluator: str
    params: tuple[tuple[str, Any], ...]
    version: str = "1.0.0"

    def param_dict(self) -> dict[str, Any]:
        return dict(self.params)


@dataclass(frozen=True, slots=True)
class FileChange:
    id: str
    operation: str
    path: str
    content: str | None
    description: str


@dataclass(frozen=True, slots=True)
class ChangeEvent:
    sequence: int
    change_id: str
    operation: str
    path: str
    before_hash: str | None
    after_hash: str | None
    categories: tuple[str, ...]

    def route_keys(self) -> tuple[str, ...]:
        directory = self.path.rsplit("/", 1)[0] if "/" in self.path else "."
        return tuple(
            sorted(
                {
                    f"file:{self.path}",
                    f"directory:{directory}",
                    *(f"category:{category}" for category in self.categories),
                }
            )
        )


@dataclass(frozen=True, slots=True)
class CheckReceipt:
    check_id: str
    input_state_hash: str
    triggering_event_ids: tuple[str, ...]
    output: dict[str, Any]
    evidence_refs: tuple[str, ...]
    output_hash: str
    execution_time_ns: int
    changed_output: bool

    def deterministic_payload(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "input_state_hash": self.input_state_hash,
            "triggering_event_ids": self.triggering_event_ids,
            "output": self.output,
            "evidence_refs": self.evidence_refs,
            "output_hash": self.output_hash,
            "changed_output": self.changed_output,
        }
