"""Dependency router, oracle comparison helpers, and deterministic merge path."""

from __future__ import annotations

import time
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Iterable

from .checks import evaluate_check
from .contracts import ChangeEvent, CheckContract, CheckReceipt, FileChange
from .foundation_loader import ProposedDelta, canonical_bytes, merge_proposals, stable_hash
from .snapshot import category_for_path, make_file_record


@dataclass(slots=True)
class EvaluationBatch:
    outputs: dict[str, dict[str, Any]]
    receipts: list[CheckReceipt]
    wall_time_ns: int


@dataclass(slots=True)
class SparseTransition:
    state: dict[str, Any]
    event: ChangeEvent
    awakened_ids: tuple[str, ...]
    receipts: list[CheckReceipt]
    routing_time_ns: int
    execution_and_merge_time_ns: int


def full_scan_outputs(state: dict[str, Any], checks: Iterable[CheckContract]) -> EvaluationBatch:
    start = time.perf_counter_ns()
    state_hash = stable_hash(state)
    outputs: dict[str, dict[str, Any]] = {}
    receipts: list[CheckReceipt] = []
    for check in sorted(checks, key=lambda item: item.id):
        check_start = time.perf_counter_ns()
        output = evaluate_check(state, check)
        elapsed = time.perf_counter_ns() - check_start
        evidence = evidence_refs(state, check)
        outputs[check.id] = output
        receipts.append(
            CheckReceipt(
                check_id=check.id,
                input_state_hash=state_hash,
                triggering_event_ids=("FULL_SCAN",),
                output=output,
                evidence_refs=evidence,
                output_hash=stable_hash(output),
                execution_time_ns=elapsed,
                changed_output=False,
            )
        )
    return EvaluationBatch(outputs, receipts, time.perf_counter_ns() - start)


def duplicated_packet_full_scan(
    state: dict[str, Any],
    checks: Iterable[CheckContract],
    history: list[dict[str, Any]],
) -> tuple[EvaluationBatch, int]:
    import json

    start = time.perf_counter_ns()
    state_hash = stable_hash(state)
    packet = canonical_bytes({"state": state, "history": history})
    duplicated_bytes = 0
    outputs: dict[str, dict[str, Any]] = {}
    receipts: list[CheckReceipt] = []
    for check in sorted(checks, key=lambda item: item.id):
        duplicated_bytes += len(packet)
        private_state = json.loads(packet)["state"]
        check_start = time.perf_counter_ns()
        output = evaluate_check(private_state, check)
        elapsed = time.perf_counter_ns() - check_start
        evidence = evidence_refs(private_state, check)
        outputs[check.id] = output
        receipts.append(
            CheckReceipt(
                check_id=check.id,
                input_state_hash=state_hash,
                triggering_event_ids=("DUPLICATED_FULL_SCAN",),
                output=output,
                evidence_refs=evidence,
                output_hash=stable_hash(output),
                execution_time_ns=elapsed,
                changed_output=False,
            )
        )
    return EvaluationBatch(outputs, receipts, time.perf_counter_ns() - start), duplicated_bytes


def evidence_refs(state: dict[str, Any], check: CheckContract) -> tuple[str, ...]:
    files = state["project"]["files"]
    refs: list[str] = []
    for dependency in check.dependencies:
        kind, value = dependency.split(":", 1)
        if kind == "file":
            record = files.get(value)
            refs.append(f"file:{value}:{record['sha256'] if record else 'MISSING'}")
        elif kind == "category":
            members = [(path, record["sha256"]) for path, record in sorted(files.items()) if record["category"] == value]
            refs.append(f"category:{value}:{stable_hash(members)}")
        elif kind == "directory":
            prefix = "" if value == "." else value.rstrip("/") + "/"
            members = [(path, record["sha256"]) for path, record in sorted(files.items()) if path.startswith(prefix)]
            refs.append(f"directory:{value}:{stable_hash(members)}")
        else:
            raise ValueError(f"unknown dependency kind: {kind}")
    return tuple(refs)


def apply_file_change(
    state: dict[str, Any], change: FileChange, sequence: int
) -> tuple[dict[str, Any], ChangeEvent]:
    new_state = deepcopy(state)
    files = new_state["project"]["files"]
    before = files.get(change.path)
    before_hash = before["sha256"] if before else None
    categories = {before["category"] if before else category_for_path(change.path)}
    if change.operation == "delete":
        files.pop(change.path, None)
        after_hash = None
    elif change.operation in {"add", "update"}:
        if change.content is None:
            raise ValueError(f"{change.operation} requires content")
        record = make_file_record(change.path, change.content)
        files[change.path] = record
        after_hash = record["sha256"]
        categories.add(record["category"])
    else:
        raise ValueError(f"unsupported file operation: {change.operation}")
    event = ChangeEvent(
        sequence=sequence,
        change_id=change.id,
        operation=change.operation,
        path=change.path,
        before_hash=before_hash,
        after_hash=after_hash,
        categories=tuple(sorted(categories)),
    )
    return new_state, event


def merge_outputs(
    state: dict[str, Any],
    checks_by_id: dict[str, CheckContract],
    outputs: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    proposals = [
        ProposedDelta(
            node_id=check_id,
            path=f"check_results.{check_id}",
            value=output,
            evidence_refs=evidence_refs(state, checks_by_id[check_id]),
            confidence=1.0,
            authority_domain="check_results",
            authority_rank=100,
        )
        for check_id, output in sorted(outputs.items())
    ]
    outcome = merge_proposals(state, proposals, 0)
    if outcome.conflict_objects_created:
        raise RuntimeError("unique check-result paths unexpectedly conflicted")
    return outcome.state


class SemanticInvalidationRuntime:
    def __init__(self, checks: Iterable[CheckContract]):
        ordered = tuple(sorted(checks, key=lambda item: item.id))
        if len({check.id for check in ordered}) != len(ordered):
            raise ValueError("check ids must be unique")
        self.checks = ordered
        self.checks_by_id = {check.id: check for check in ordered}
        buckets: dict[str, list[str]] = defaultdict(list)
        for check in ordered:
            for dependency in check.dependencies:
                buckets[dependency].append(check.id)
        self.router = {key: tuple(sorted(ids)) for key, ids in buckets.items()}

    def initialize(self, state: dict[str, Any]) -> tuple[dict[str, Any], EvaluationBatch]:
        batch = full_scan_outputs(state, self.checks)
        return merge_outputs(state, self.checks_by_id, batch.outputs), batch

    def route(self, event: ChangeEvent) -> tuple[str, ...]:
        awakened: set[str] = set()
        for key in event.route_keys():
            awakened.update(self.router.get(key, ()))
        return tuple(sorted(awakened))

    def transition(self, state: dict[str, Any], change: FileChange, sequence: int) -> SparseTransition:
        changed_state, event = apply_file_change(state, change, sequence)
        route_start = time.perf_counter_ns()
        awakened_ids = self.route(event)
        routing_ns = time.perf_counter_ns() - route_start
        execution_start = time.perf_counter_ns()
        state_hash = stable_hash(changed_state)
        outputs: dict[str, dict[str, Any]] = {}
        receipts: list[CheckReceipt] = []
        for check_id in awakened_ids:
            check = self.checks_by_id[check_id]
            before = state["check_results"].get(check_id)
            check_start = time.perf_counter_ns()
            output = evaluate_check(changed_state, check)
            elapsed = time.perf_counter_ns() - check_start
            outputs[check_id] = output
            receipts.append(
                CheckReceipt(
                    check_id=check_id,
                    input_state_hash=state_hash,
                    triggering_event_ids=(event.change_id,),
                    output=output,
                    evidence_refs=evidence_refs(changed_state, check),
                    output_hash=stable_hash(output),
                    execution_time_ns=elapsed,
                    changed_output=before != output,
                )
            )
        final_state = merge_outputs(changed_state, self.checks_by_id, outputs)
        return SparseTransition(
            state=final_state,
            event=event,
            awakened_ids=awakened_ids,
            receipts=receipts,
            routing_time_ns=routing_ns,
            execution_and_merge_time_ns=time.perf_counter_ns() - execution_start,
        )
