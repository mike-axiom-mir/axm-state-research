"""Create a canonical text snapshot of the bundled real project."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from .foundation_loader import FOUNDATION_ROOT


INCLUDED_SUFFIXES = {".py", ".md", ".json", ".toml", ".txt", ".sh", ".bat"}
EXCLUDED_PARTS = {"__pycache__", ".git"}


def category_for_path(path: str) -> str:
    suffix = Path(path).suffix.lower()
    if suffix == ".py":
        return "python"
    if suffix == ".md":
        return "markdown"
    if suffix == ".json":
        return "json"
    if suffix == ".toml":
        return "toml"
    if suffix in {".sh", ".bat"}:
        return "launcher"
    if Path(path).name == "LICENSE":
        return "license"
    return "text"


def make_file_record(path: str, content: str) -> dict[str, Any]:
    encoded = content.encode("utf-8")
    return {
        "path": path,
        "category": category_for_path(path),
        "suffix": Path(path).suffix.lower(),
        "content": content,
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "size_bytes": len(encoded),
        "line_count": len(content.splitlines()),
    }


def load_project_snapshot(root: str | Path | None = None) -> dict[str, Any]:
    project_root = Path(root) if root is not None else FOUNDATION_ROOT
    files: dict[str, dict[str, Any]] = {}
    for source in sorted(project_root.rglob("*")):
        if not source.is_file() or any(part in EXCLUDED_PARTS for part in source.parts):
            continue
        relative = source.relative_to(project_root).as_posix()
        if relative.startswith("results/") and relative.endswith(".jsonl"):
            continue
        if source.suffix.lower() not in INCLUDED_SUFFIXES and source.name != "LICENSE":
            continue
        try:
            content = source.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        files[relative] = make_file_record(relative, content)
    return {
        "schema": "axm.workfloor-sentinel-project/v1",
        "project": {
            "name": "AXM State Floor",
            "foundation_version": "0.1.0",
            "files": files,
        },
        "check_results": {},
        "_meta": {"provenance": {}, "conflicts": {}, "escalations": {}},
    }
