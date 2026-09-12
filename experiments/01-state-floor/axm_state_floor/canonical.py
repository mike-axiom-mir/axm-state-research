"""Canonical encoding, hashing, path access, and measurement helpers."""

from __future__ import annotations

import dataclasses
import hashlib
import json
import sys
from collections.abc import Mapping, Sequence
from typing import Any


def to_plain(value: Any) -> Any:
    if dataclasses.is_dataclass(value):
        return {field.name: to_plain(getattr(value, field.name)) for field in dataclasses.fields(value)}
    if isinstance(value, Mapping):
        return {str(key): to_plain(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [to_plain(item) for item in value]
    if isinstance(value, list):
        return [to_plain(item) for item in value]
    if isinstance(value, set):
        return sorted(to_plain(item) for item in value)
    return value


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        to_plain(value),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def stable_hash(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def get_path(state: Mapping[str, Any], path: str, default: Any = None) -> Any:
    current: Any = state
    for part in path.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return default
        current = current[part]
    return current


def set_path(state: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current = state
    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value
    current[parts[-1]] = value


def deep_size(value: Any) -> int:
    """Approximate retained Python-object size, counting shared objects once."""
    seen: set[int] = set()

    def visit(item: Any) -> int:
        identity = id(item)
        if identity in seen:
            return 0
        seen.add(identity)
        size = sys.getsizeof(item)
        if dataclasses.is_dataclass(item):
            return size + sum(visit(getattr(item, field.name)) for field in dataclasses.fields(item))
        if isinstance(item, Mapping):
            return size + sum(visit(key) + visit(val) for key, val in item.items())
        if isinstance(item, (list, tuple, set, frozenset)):
            return size + sum(visit(part) for part in item)
        return size

    return visit(value)


class PermittedStateView:
    """Zero-copy path-based view that enforces a node's declared read contract."""

    __slots__ = ("_state", "_reads")

    def __init__(self, state: Mapping[str, Any], reads: Sequence[str]):
        self._state = state
        self._reads = tuple(reads)

    def _allowed(self, path: str) -> bool:
        return any(
            path == allowed
            or path.startswith(allowed + ".")
            or allowed.startswith(path + ".")
            for allowed in self._reads
        )

    def get(self, path: str, default: Any = None) -> Any:
        if not self._allowed(path):
            raise PermissionError(f"undeclared state read: {path}")
        return get_path(self._state, path, default)
