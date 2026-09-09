#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

REPO_ID = "mike-axiom-mir/axm-state-research"
PROVIDER_ID = "axm-state-research"
SOURCE_SCHEMA = "axm.research-source/v1"
INDEX_SCHEMA = "axm.research-source-index/v1"
CAPABILITY_SCHEMA = "axm.public-capability/v1"
CAPABILITY_ID = "axm.state-research.source-index/v1"
SOURCE_ROOTS = {
    "RESEARCH": "reference-research",
    "lanes": "lane-receipt",
    "logs": "raw-log",
    "research": "research-note",
    "visuals": "visual-log",
}
ALLOWED_SUFFIXES = {".md", ".txt"}
DATE_PREFIX = re.compile(r"^(\d{4}-\d{2}-\d{2})-")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def title_from_path(relative: str) -> str:
    name = Path(relative).name
    for suffix in (".md", ".txt"):
        if name.lower().endswith(suffix):
            name = name[: -len(suffix)]
            break
    name = DATE_PREFIX.sub("", name)
    parts = [part for part in name.replace("_", "-").split("-") if part]
    return " ".join(part.capitalize() for part in parts)


def source_date(relative: str) -> str | None:
    match = DATE_PREFIX.match(Path(relative).name)
    return match.group(1) if match else None


def _iter_source_files(repo_root: Path):
    seen: set[str] = set()
    for root_name, source_class in SOURCE_ROOTS.items():
        root = repo_root / root_name
        if not root.exists():
            continue
        if root.is_symlink():
            raise ValueError(f"source root is a symlink: {root_name}")
        if not root.is_dir():
            raise ValueError(f"source root is not a directory: {root_name}")
        for path in sorted(root.rglob("*")):
            relative = path.relative_to(repo_root).as_posix()
            if path.is_symlink():
                raise ValueError(f"source path is a symlink: {relative}")
            if not path.is_file() or path.suffix.lower() not in ALLOWED_SUFFIXES:
                continue
            if relative in seen:
                raise ValueError(f"duplicate source path: {relative}")
            seen.add(relative)
            yield path, relative, source_class


def build_records(repo_root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path, relative, source_class in _iter_source_files(repo_root):
        data = path.read_bytes()
        rows.append(
            {
                "schema": SOURCE_SCHEMA,
                "id": f"axm-state-research:{relative}",
                "source_path": relative,
                "source_class": source_class,
                "title": title_from_path(relative),
                "bytes": len(data),
                "git_blob_sha1": git_blob_sha1(data),
                "source_date": source_date(relative),
                "authority": "SOURCE_DISCOVERY_ONLY",
            }
        )
    rows.sort(key=lambda row: row["source_path"])
    return rows


def build_outputs(repo_root: Path) -> dict[str, str]:
    rows = build_records(repo_root)
    records_text = "".join(canonical_json(row) + "\n" for row in rows)
    class_counts = Counter(row["source_class"] for row in rows)
    receipt = {
        "schema": INDEX_SCHEMA,
        "repo": REPO_ID,
        "source_roots": sorted(SOURCE_ROOTS),
        "record_schema": SOURCE_SCHEMA,
        "record_count": len(rows),
        "class_counts": dict(sorted(class_counts.items())),
        "records_sha256": hashlib.sha256(records_text.encode("utf-8")).hexdigest(),
        "authority": {
            "source_discovery_only": True,
            "research_claim_verified": False,
            "execution_authority": False,
            "merge_authority": False,
            "canon_authority": False,
        },
        "truth_boundary": (
            "File identity and classification are deterministic discovery evidence; "
            "the index does not validate research claims, infer scientific truth, or promote CANON."
        ),
    }
    capability = {
        "schema": CAPABILITY_SCHEMA,
        "id": CAPABILITY_ID,
        "providers": [PROVIDER_ID],
        "consumers": [],
        "status": "EXPERIMENTAL",
        "provider_statuses": [{"id": PROVIDER_ID, "status": "EXPERIMENTAL"}],
        "source_evidence": [
            "tools/generate_research_index.py",
            "registry/research-sources.jsonl",
            "registry/research-sources.receipt.json",
        ],
        "truth": {
            "declaration_is_runtime_proof": False,
            "generated_from_repo_state": True,
            "grants_authority": False,
        },
    }
    return {
        "research-sources.jsonl": records_text,
        "research-sources.receipt.json": json.dumps(
            receipt, ensure_ascii=False, indent=2, sort_keys=True
        )
        + "\n",
        "capabilities.jsonl": canonical_json(capability) + "\n",
    }


def write_outputs(repo_root: Path, output_dir: Path) -> None:
    outputs = build_outputs(repo_root)
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, text in outputs.items():
        (output_dir / name).write_text(text, "utf-8")


def check_outputs(repo_root: Path, output_dir: Path) -> list[str]:
    outputs = build_outputs(repo_root)
    stale: list[str] = []
    for name, expected in outputs.items():
        path = output_dir / name
        actual = path.read_text("utf-8") if path.is_file() else None
        if actual != expected:
            stale.append(path.as_posix())
    return stale


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate deterministic machine-readable discovery metadata for AXM State Research."
    )
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--output-dir", default="registry")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = repo_root / output_dir

    try:
        if args.check:
            stale = check_outputs(repo_root, output_dir)
            if stale:
                print("research-index: STALE: " + ", ".join(stale), file=sys.stderr)
                return 1
            outputs = build_outputs(repo_root)
            receipt = json.loads(outputs["research-sources.receipt.json"])
            print(
                f"research-index: PASS ({receipt['record_count']} sources, "
                f"digest {receipt['records_sha256']})"
            )
            return 0

        write_outputs(repo_root, output_dir)
        receipt = json.loads(build_outputs(repo_root)["research-sources.receipt.json"])
        print(
            f"research-index: wrote {output_dir} "
            f"({receipt['record_count']} sources, digest {receipt['records_sha256']})"
        )
        return 0
    except (OSError, ValueError) as exc:
        print(f"research-index: ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
