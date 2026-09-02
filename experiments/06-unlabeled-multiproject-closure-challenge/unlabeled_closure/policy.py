"""Frozen unlabeled routing and deterministic structural-audit semantics."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Any, Iterable

from .foundation_loader import CheckContract
from .model import ChangeEvent


POLICY_SEMANTICS_VERSION = "unlabeled-structural-observed/v1"
CANDIDATE_POLICY = "COMBINED_STRUCTURAL_OBSERVED"
POLICIES = (
    "BROKEN_SPARSE_NO_AUDIT",
    "OBSERVED_READS",
    "STRUCTURAL_AUDIT",
    CANDIDATE_POLICY,
    "FULL_ORACLE",
)


def params(check: CheckContract) -> dict[str, Any]:
    return dict(check.params)


def learn_observed_templates(training_traces: Iterable[dict[str, Any]]) -> dict[str, tuple[str, ...]]:
    """Learn parameter-to-read relationships only from training executions."""

    learned: dict[str, set[str]] = {}
    for trace in training_traces:
        evaluator = trace["evaluator"]
        reads = set(trace["reads"]["files"]) | set(trace["reads"]["outputs"])
        bucket = learned.setdefault(evaluator, set())
        for key, value in trace["params"].items():
            if isinstance(value, str) and value in reads:
                bucket.add(key)
    return {key: tuple(sorted(value)) for key, value in sorted(learned.items())}


def apply_observed_templates(
    checks: Iterable[CheckContract], templates: dict[str, tuple[str, ...]]
) -> tuple[tuple[CheckContract, ...], list[dict[str, Any]]]:
    """Transfer training-learned parameter shapes without held-out reads."""

    amended: list[CheckContract] = []
    receipts: list[dict[str, Any]] = []
    for check in checks:
        additions: set[str] = set()
        check_params = params(check)
        for key in templates.get(check.evaluator, ()):
            value = check_params.get(key)
            if not isinstance(value, str):
                continue
            if key.endswith("_check"):
                additions.add(f"output:{value}")
            else:
                additions.add(f"file:{value}")
        missing = tuple(sorted(additions - set(check.dependencies)))
        if missing:
            before = check.dependencies
            check = replace(check, dependencies=tuple(sorted(set(before) | set(missing))))
            receipts.append(
                {
                    "action": "transfer_training_observed_dependencies",
                    "check_id": check.id,
                    "evaluator": check.evaluator,
                    "before": before,
                    "added": missing,
                    "after": check.dependencies,
                }
            )
        amended.append(check)
    return tuple(sorted(amended, key=lambda item: item.id)), receipts


def structural_audit_selection(
    checks: Iterable[CheckContract], events: Iterable[ChangeEvent]
) -> tuple[str, ...]:
    """Select audits from ordinary operation/path/check shape only.

    This function receives no declared risk label, fault metadata, oracle output,
    expected answer, or training probe.
    """

    event_list = tuple(events)
    paths = {
        path
        for event in event_list
        for path in (event.path, event.old_path)
        if path is not None
    }
    suffixes = {Path(path).suffix.lower() for path in paths}
    kinds = {event.kind for event in event_list}
    selected: set[str] = set()
    for check in checks:
        check_params = params(check)
        param_paths = {
            value
            for key, value in check_params.items()
            if isinstance(value, str) and (key.endswith("path") or key in {"path", "report_path", "json_path"})
        }
        if paths & param_paths:
            selected.add(check.id)
            continue
        if check.id.startswith("aggregate--") and kinds & {"rename", "delete"}:
            selected.add(check.id)
            continue
        if check.perspective == "opaque-config-generator" and suffixes & {".py", ".toml", ".json"}:
            selected.add(check.id)
            continue
        if check.perspective == "derived-output" and suffixes & {".py", ".json", ".toml"}:
            selected.add(check.id)
            continue
        if check.perspective == "derived-output" and kinds & {"rename", "delete"}:
            selected.add(check.id)
    return tuple(sorted(selected))


def audit_selection(
    policy: str,
    checks: Iterable[CheckContract],
    events: Iterable[ChangeEvent],
    awakened: Iterable[str],
) -> tuple[str, ...]:
    if policy in {"STRUCTURAL_AUDIT", CANDIDATE_POLICY}:
        return structural_audit_selection(checks, events)
    if policy == "OBSERVED_READS":
        return tuple(sorted(set(awakened)))
    return ()

