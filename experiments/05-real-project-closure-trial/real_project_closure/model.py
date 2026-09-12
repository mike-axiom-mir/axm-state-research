"""Machine-readable mutations, planted metadata faults, and access tracing."""

from __future__ import annotations

import json
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

from .foundation_loader import CheckContract, EXPERIMENT_ROOT, FileChange, stable_hash


FIXTURE_PATH = EXPERIMENT_ROOT / "fixtures" / "mutation_split.json"


class MissingEvidence(KeyError):
    """A real Sentinel evaluator attempted a file-record field outside its slice."""


@dataclass(frozen=True, slots=True)
class Mutation:
    id: str
    phase: str
    operation: str
    path: str
    transform: str
    arguments: dict[str, Any]
    risk_tags: tuple[str, ...]
    training_probes: tuple[str, ...]
    description: str

    @classmethod
    def from_dict(cls, value: dict[str, Any], phase: str) -> "Mutation":
        return cls(
            id=value["id"],
            phase=phase,
            operation=value["operation"],
            path=value["path"],
            transform=value["transform"],
            arguments=dict(value.get("arguments", {})),
            risk_tags=tuple(value.get("risk_tags", ())),
            training_probes=tuple(value.get("training_probes", ())),
            description=value["description"],
        )

    def public_payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "phase": self.phase,
            "operation": self.operation,
            "path": self.path,
            "transform": self.transform,
            "arguments": self.arguments,
            "risk_tags": self.risk_tags,
            "training_probes": self.training_probes,
            "description": self.description,
        }


@dataclass(frozen=True, slots=True)
class Fault:
    id: str
    kind: str
    check_id: str
    action: str
    value: str
    training_exposed: bool


@dataclass(slots=True)
class AccessTrace:
    files: set[str]
    fields: set[str]

    @classmethod
    def empty(cls) -> "AccessTrace":
        return cls(set(), set())

    def payload(self) -> dict[str, list[str]]:
        return {"files": sorted(self.files), "fields": sorted(self.fields)}


class RecordView(Mapping[str, Any]):
    def __init__(
        self,
        path: str,
        record: Mapping[str, Any],
        trace: AccessTrace,
        permitted: frozenset[str] | None,
    ) -> None:
        self._path = path
        self._record = record
        self._trace = trace
        self._permitted = permitted

    def __getitem__(self, key: str) -> Any:
        self._trace.files.add(self._path)
        token = f"file:{self._path}#{key}"
        self._trace.fields.add(token)
        if self._permitted is not None and token not in self._permitted:
            raise MissingEvidence(token)
        return self._record[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._record)

    def __len__(self) -> int:
        return len(self._record)


class FilesView(Mapping[str, RecordView]):
    def __init__(
        self,
        files: Mapping[str, Mapping[str, Any]],
        trace: AccessTrace,
        permitted: frozenset[str] | None,
    ) -> None:
        self._files = files
        self._trace = trace
        self._permitted = permitted

    def __getitem__(self, path: str) -> RecordView:
        self._trace.files.add(path)
        return RecordView(path, self._files[path], self._trace, self._permitted)

    def __iter__(self) -> Iterator[str]:
        return iter(self._files)

    def __len__(self) -> int:
        return len(self._files)

    def get(self, path: str, default: Any = None) -> RecordView | Any:
        self._trace.files.add(path)
        record = self._files.get(path)
        return default if record is None else RecordView(path, record, self._trace, self._permitted)

    def items(self) -> Iterator[tuple[str, RecordView]]:
        for path, record in self._files.items():
            yield path, RecordView(path, record, self._trace, self._permitted)


def traced_state(
    state: dict[str, Any], permitted: frozenset[str] | None
) -> tuple[dict[str, Any], AccessTrace]:
    trace = AccessTrace.empty()
    view = dict(state)
    project = dict(state["project"])
    project["files"] = FilesView(state["project"]["files"], trace, permitted)
    view["project"] = project
    return view, trace


def load_fixture(path: Path = FIXTURE_PATH) -> tuple[dict[str, Any], tuple[Mutation, ...], tuple[Mutation, ...], tuple[Fault, ...]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    training = tuple(Mutation.from_dict(item, "training") for item in raw["mutations"]["training"])
    held_out = tuple(Mutation.from_dict(item, "held_out") for item in raw["mutations"]["held_out"])
    faults = tuple(Fault(**item) for item in raw["faults"])
    if {item.id for item in training} & {item.id for item in held_out}:
        raise ValueError("training and held-out mutation ids must be disjoint")
    if any(item.training_probes for item in held_out):
        raise ValueError("held-out mutations cannot contain training probes")
    return raw, training, held_out, faults


def apply_faults(
    checks: tuple[CheckContract, ...], faults: tuple[Fault, ...]
) -> tuple[tuple[CheckContract, ...], dict[str, frozenset[str] | None], dict[str, Fault]]:
    by_id = {check.id: check for check in checks}
    permitted: dict[str, frozenset[str] | None] = {check.id: None for check in checks}
    fault_by_id: dict[str, Fault] = {}
    for fault in faults:
        check = by_id[fault.check_id]
        if fault.action == "remove_dependency":
            if fault.value not in check.dependencies:
                raise ValueError(f"fault dependency absent: {fault.id}")
            by_id[check.id] = replace(
                check, dependencies=tuple(item for item in check.dependencies if item != fault.value)
            )
        elif fault.action == "restrict_evidence":
            permitted[check.id] = frozenset(item for item in fault.value.split(",") if item)
        elif fault.action == "inject_invalid_dependency":
            by_id[check.id] = replace(
                check, dependencies=tuple(sorted(set(check.dependencies) | {fault.value}))
            )
        else:
            raise ValueError(f"unknown fault action: {fault.action}")
        fault_by_id[fault.id] = fault
    return tuple(by_id[check.id] for check in checks), permitted, fault_by_id


def materialize_change(state: dict[str, Any], mutation: Mutation) -> FileChange:
    files = state["project"]["files"]
    before = files.get(mutation.path)
    content = None if before is None else before["content"]
    args = mutation.arguments
    if mutation.operation == "delete":
        next_content = None
    elif mutation.transform == "replace_once":
        if content is None or content.count(args["old"]) != 1:
            raise ValueError(f"{mutation.id} expected exactly one replacement target")
        next_content = content.replace(args["old"], args["new"], 1)
    elif mutation.transform == "json_set":
        value = json.loads(content or "null")
        target = value
        path = args["path"]
        for part in path[:-1]:
            target = target[part]
        target[path[-1]] = args["value"]
        next_content = json.dumps(value, indent=2, sort_keys=True) + "\n"
    elif mutation.transform == "literal":
        next_content = args["content"]
    else:
        raise ValueError(f"unsupported mutation transform: {mutation.transform}")
    return FileChange(
        id=mutation.id,
        operation=mutation.operation,
        path=mutation.path,
        content=next_content,
        description=mutation.description,
    )


def held_out_manifest_hash(raw_fixture: dict[str, Any]) -> str:
    return stable_hash(raw_fixture["mutations"]["held_out"])
