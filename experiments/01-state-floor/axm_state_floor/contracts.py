"""Serializable contracts used by the experiment runtime."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .canonical import stable_hash


@dataclass(frozen=True, slots=True)
class Authority:
    domain: str
    rank: int = 0


@dataclass(frozen=True, slots=True)
class NodeContract:
    id: str
    perspective: str
    subscriptions: tuple[str, ...]
    reads: tuple[str, ...]
    priority_or_domain_authority: Authority
    deterministic_handler: str
    output_schema: str = "axm.perspective-output/v1"
    version: str = "1.0.0"


@dataclass(frozen=True, slots=True)
class Event:
    sequence: int
    event_type: str
    path: str
    before: Any
    after: Any
    source: str

    def partition(self, partition_count: int = 128) -> int:
        material = {"path": self.path, "source": self.source}
        return int(stable_hash(material)[:8], 16) % partition_count

    def route_keys(self, partition_count: int = 128) -> tuple[str, str]:
        return self.event_type, f"{self.event_type}:{self.partition(partition_count):03d}"

    def deterministic_id(self) -> str:
        return stable_hash(
            {
                "sequence": self.sequence,
                "event_type": self.event_type,
                "path": self.path,
                "before": self.before,
                "after": self.after,
                "source": self.source,
            }
        )


@dataclass(frozen=True, slots=True)
class ProposedDelta:
    node_id: str
    path: str
    value: Any
    evidence_refs: tuple[str, ...]
    confidence: float | None
    authority_domain: str
    authority_rank: int
    operation: str = "set"

    def deterministic_payload(self) -> dict[str, Any]:
        return {
            "node_id": self.node_id,
            "path": self.path,
            "value": self.value,
            "evidence_refs": self.evidence_refs,
            "confidence": self.confidence,
            "authority_domain": self.authority_domain,
            "authority_rank": self.authority_rank,
            "operation": self.operation,
        }


@dataclass(frozen=True, slots=True)
class Receipt:
    node_id: str
    input_state_hash: str
    triggering_event: dict[str, Any]
    output_delta: tuple[dict[str, Any], ...]
    evidence_refs: tuple[str, ...]
    output_hash: str
    execution_time_ns: int
    changed_state: bool

    def replay_payload(self) -> dict[str, Any]:
        """Timing is deliberately excluded from deterministic verification."""
        return {
            "node_id": self.node_id,
            "input_state_hash": self.input_state_hash,
            "triggering_event": self.triggering_event,
            "output_delta": self.output_delta,
            "evidence_refs": self.evidence_refs,
            "output_hash": self.output_hash,
            "changed_state": self.changed_state,
        }
