"""Frozen manifests, canonical versions, unlabeled mutations, and state changes."""

from __future__ import annotations

import hashlib
import json
import subprocess
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .foundation_loader import (
    EXPERIMENT_ROOT,
    REPOSITORY_ROOT,
    canonical_bytes,
    category_for_path,
    load_project_snapshot,
    make_file_record,
    stable_hash,
)


PROJECTS_PATH = EXPERIMENT_ROOT / "manifests" / "projects.json"
TRAINING_PATH = EXPERIMENT_ROOT / "manifests" / "training.json"
HELD_OUT_PATH = EXPERIMENT_ROOT / "manifests" / "held_out.json"
CHECKPOINT_PROTOCOL_PATH = EXPERIMENT_ROOT / "manifests" / "checkpoint_protocol.json"

FORBIDDEN_HELD_OUT_KEYS = frozenset(
    {
        "risk",
        "risk_tag",
        "risk_tags",
        "risk_label",
        "risk_labels",
        "label",
        "labels",
        "oracle",
        "oracle_answer",
        "oracle_answers",
        "expected",
        "expected_output",
        "training_probe",
        "training_probes",
    }
)


@dataclass(frozen=True, slots=True)
class ProjectVersion:
    id: str
    role: str
    source_path: str
    base_commit: str
    tree_sha: str
    declared_version: str
    config_generator_path: str
    config_path: str
    raw_derived_path: str

    @property
    def root(self) -> Path:
        return REPOSITORY_ROOT / self.source_path


@dataclass(frozen=True, slots=True)
class Operation:
    kind: str
    path: str
    arguments: dict[str, Any]


@dataclass(frozen=True, slots=True)
class Mutation:
    id: str
    project_id: str
    description: str
    operations: tuple[Operation, ...]
    checkpoint_case: str | None = None

    @classmethod
    def from_dict(cls, item: dict[str, Any]) -> "Mutation":
        return cls(
            id=item["id"],
            project_id=item["project_id"],
            description=item["description"],
            operations=tuple(
                Operation(value["kind"], value["path"], dict(value.get("arguments", {})))
                for value in item["operations"]
            ),
            checkpoint_case=item.get("checkpoint_case"),
        )

    def public_payload(self) -> dict[str, Any]:
        payload = {
            "id": self.id,
            "project_id": self.project_id,
            "description": self.description,
            "operations": [
                {"kind": operation.kind, "path": operation.path, "arguments": operation.arguments}
                for operation in self.operations
            ],
        }
        if self.checkpoint_case is not None:
            payload["checkpoint_case"] = self.checkpoint_case
        return payload


@dataclass(frozen=True, slots=True)
class ChangeEvent:
    mutation_id: str
    operation_index: int
    kind: str
    path: str
    old_path: str | None
    categories: tuple[str, ...]
    before_hash: str | None
    after_hash: str | None

    def route_keys(self) -> tuple[str, ...]:
        keys: set[str] = set()
        for path in filter(None, (self.path, self.old_path)):
            directory = path.rsplit("/", 1)[0] if "/" in path else "."
            keys.add(f"file:{path}")
            keys.add(f"directory:{directory}")
        keys.update(f"category:{category}" for category in self.categories)
        return tuple(sorted(keys))

    def shape(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "suffix": Path(self.path).suffix.lower(),
            "category": category_for_path(self.path),
            "depth": len(Path(self.path).parts),
            "renamed": self.old_path is not None,
        }


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _forbidden_keys(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower() in FORBIDDEN_HELD_OUT_KEYS:
                found.add(key)
            found.update(_forbidden_keys(child))
    elif isinstance(value, list):
        for child in value:
            found.update(_forbidden_keys(child))
    return found


def load_manifests() -> tuple[dict[str, ProjectVersion], tuple[Mutation, ...], tuple[Mutation, ...], dict[str, Any]]:
    project_raw = _load_json(PROJECTS_PATH)
    projects = {
        item["id"]: ProjectVersion(**item)
        for item in project_raw["projects"]
    }
    training_raw = _load_json(TRAINING_PATH)
    held_raw = _load_json(HELD_OUT_PATH)
    forbidden = _forbidden_keys(held_raw)
    if forbidden:
        raise ValueError(f"held-out manifest contains forbidden oracle/risk/probe keys: {sorted(forbidden)}")
    training = tuple(Mutation.from_dict(item) for item in training_raw["mutations"])
    held_out = tuple(Mutation.from_dict(item) for item in held_raw["mutations"])
    if {item.id for item in training} & {item.id for item in held_out}:
        raise ValueError("training and held-out mutation ids must be disjoint")
    if {item.project_id for item in training} & {item.project_id for item in held_out}:
        raise ValueError("training and held-out project versions must be disjoint")
    if any(projects[item.project_id].role != "training" for item in training):
        raise ValueError("training mutations must reference training project versions")
    if any(projects[item.project_id].role != "held_out" for item in held_out):
        raise ValueError("held-out mutations must reference held-out project versions")
    return projects, training, held_out, _load_json(CHECKPOINT_PROTOCOL_PATH)


def verify_project_versions(projects: Iterable[ProjectVersion]) -> dict[str, dict[str, Any]]:
    verified: dict[str, dict[str, Any]] = {}
    for project in projects:
        if not project.root.is_dir():
            raise RuntimeError(f"canonical project root absent: {project.root}")
        tree = subprocess.run(
            ["git", "rev-parse", f"{project.base_commit}:{project.source_path}"],
            cwd=REPOSITORY_ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        if tree != project.tree_sha:
            raise RuntimeError(f"canonical tree mismatch for {project.id}: {tree}")
        state = load_project_snapshot(project.root)
        snapshot_hash = stable_hash(state["project"])
        verified[project.id] = {
            "tree_sha": tree,
            "snapshot_hash": snapshot_hash,
            "file_count": len(state["project"]["files"]),
        }
    return verified


def load_project(project: ProjectVersion) -> dict[str, Any]:
    state = load_project_snapshot(project.root)
    state["project"]["challenge_project_id"] = project.id
    state["project"]["canonical_tree_sha"] = project.tree_sha
    return state


def _record_hash(record: dict[str, Any] | None) -> str | None:
    return None if record is None else record["sha256"]


def apply_mutation(state: dict[str, Any], mutation: Mutation) -> tuple[dict[str, Any], tuple[ChangeEvent, ...]]:
    next_state = deepcopy(state)
    files = next_state["project"]["files"]
    events: list[ChangeEvent] = []
    for index, operation in enumerate(mutation.operations):
        before = files.get(operation.path)
        old_path: str | None = None
        categories = {category_for_path(operation.path)}
        if before is not None:
            categories.add(before["category"])
        if operation.kind == "append_text":
            if before is None:
                raise ValueError(f"append target absent: {operation.path}")
            content = before["content"] + operation.arguments["text"]
            files[operation.path] = make_file_record(operation.path, content)
        elif operation.kind == "replace_once":
            if before is None:
                raise ValueError(f"replace target absent: {operation.path}")
            old = operation.arguments["old"]
            if before["content"].count(old) != 1:
                raise ValueError(f"replace target not unique: {mutation.id}:{operation.path}")
            content = before["content"].replace(old, operation.arguments["new"], 1)
            files[operation.path] = make_file_record(operation.path, content)
        elif operation.kind == "json_set_top":
            if before is None:
                raise ValueError(f"JSON target absent: {operation.path}")
            value = json.loads(before["content"])
            if not isinstance(value, dict):
                raise ValueError("json_set_top requires an object")
            value[operation.arguments["key"]] = operation.arguments["value"]
            content = json.dumps(value, indent=2, sort_keys=True) + "\n"
            files[operation.path] = make_file_record(operation.path, content)
        elif operation.kind == "rename":
            if before is None:
                raise ValueError(f"rename source absent: {operation.path}")
            destination = operation.arguments["to"]
            if destination in files:
                raise ValueError(f"rename destination exists: {destination}")
            old_path = operation.path
            files.pop(operation.path)
            files[destination] = make_file_record(destination, before["content"])
            categories.add(category_for_path(destination))
            after = files[destination]
            event_path = destination
        elif operation.kind == "delete":
            if before is None:
                raise ValueError(f"delete target absent: {operation.path}")
            files.pop(operation.path)
        else:
            raise ValueError(f"unsupported operation: {operation.kind}")
        if operation.kind != "rename":
            after = files.get(operation.path)
            event_path = operation.path
        events.append(
            ChangeEvent(
                mutation_id=mutation.id,
                operation_index=index,
                kind=operation.kind,
                path=event_path,
                old_path=old_path,
                categories=tuple(sorted(categories)),
                before_hash=_record_hash(before),
                after_hash=_record_hash(after),
            )
        )
    return next_state, tuple(events)


def manifest_hashes() -> dict[str, str]:
    return {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in (PROJECTS_PATH, TRAINING_PATH, HELD_OUT_PATH, CHECKPOINT_PROTOCOL_PATH)
    }


def held_out_manifest_hash() -> str:
    return hashlib.sha256(HELD_OUT_PATH.read_bytes()).hexdigest()


def state_storage_bytes(state: dict[str, Any]) -> int:
    return len(canonical_bytes(state))

