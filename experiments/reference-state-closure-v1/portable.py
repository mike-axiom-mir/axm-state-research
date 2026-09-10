#!/usr/bin/env python3
"""Build and verify a deterministic one-file Reference-state Closure runner."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import zipfile
from typing import Any

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
EXPERIMENT_PATH = HERE / "experiment.py"
FIXTURE_PATH = HERE / "fixture.json"
LICENSE_PATH = REPO_ROOT / "LICENSE"

PORTABLE_SCHEMA = "axm.reference-state-closure.portable.v1"
VERIFY_SCHEMA = "axm.reference-state-closure.portable-verification.v1"
CAPABILITY_ID = "axm.state-research.reference-state-closure.experiment/v1"
METADATA_NAME = "AXM_PORTABLE.json"
FIXED_DATE = (1980, 1, 1, 0, 0, 0)
MAX_MEMBER_BYTES = 2 * 1024 * 1024
ALLOWED_NAMES = ("AXM_PORTABLE.json", "LICENSE", "__main__.py", "experiment.py", "fixture.json")
AUTHORITY = {
    "automatic_execution": False,
    "automatic_selection": False,
    "installation": False,
    "merge": False,
    "canon": False,
}

WRAPPER = r"""from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import stat
import sys
import zipfile


PORTABLE_SCHEMA = "axm.reference-state-closure.portable.v1"
VERIFY_SCHEMA = "axm.reference-state-closure.portable-verification.v1"
METADATA_NAME = "AXM_PORTABLE.json"
FIXED_DATE = (1980, 1, 1, 0, 0, 0)
ALLOWED_NAMES = ("AXM_PORTABLE.json", "LICENSE", "__main__.py", "experiment.py", "fixture.json")
AUTHORITY = {
    "automatic_execution": False,
    "automatic_selection": False,
    "installation": False,
    "merge": False,
    "canon": False,
}


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("utf-8")


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def archive_path():
    return Path(sys.argv[0]).resolve()


def inspect_self():
    path = archive_path()
    raw = path.read_bytes()
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if len(names) != len(set(names)):
            raise ValueError("duplicate archive member")
        if tuple(sorted(names)) != ALLOWED_NAMES:
            raise ValueError("unexpected archive member set")
        payloads = {}
        for info in infos:
            if info.filename not in ALLOWED_NAMES:
                raise ValueError("unexpected archive member")
            if info.compress_type != zipfile.ZIP_STORED:
                raise ValueError("compressed member is outside the portable contract")
            if info.date_time != FIXED_DATE:
                raise ValueError("member timestamp drift")
            if info.create_system != 3:
                raise ValueError("member platform metadata drift")
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_IFMT(mode) != stat.S_IFREG or stat.S_IMODE(mode) != 0o644:
                raise ValueError("member mode drift")
            payloads[info.filename] = archive.read(info)
    metadata = json.loads(payloads[METADATA_NAME].decode("utf-8"))
    if metadata.get("schema") != PORTABLE_SCHEMA:
        raise ValueError("portable schema mismatch")
    if metadata.get("capability_id") != "axm.state-research.reference-state-closure.experiment/v1":
        raise ValueError("capability identity mismatch")
    if metadata.get("authority") != AUTHORITY:
        raise ValueError("authority drift")
    expected_members = metadata.get("members")
    if not isinstance(expected_members, dict):
        raise ValueError("missing member evidence")
    if set(expected_members) != set(ALLOWED_NAMES) - {METADATA_NAME}:
        raise ValueError("member evidence set mismatch")
    for name, expected in expected_members.items():
        body = payloads[name]
        if expected != {"bytes": len(body), "sha256": sha256_bytes(body)}:
            raise ValueError("member evidence mismatch: " + name)
    return metadata, sha256_bytes(raw)


def embedded_fixture():
    with zipfile.ZipFile(archive_path(), "r") as archive:
        return json.loads(archive.read("fixture.json").decode("utf-8"))


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Portable AXM Reference-state Closure experiment")
    sub = parser.add_subparsers(dest="command")
    run = sub.add_parser("run", help="run the bounded experiment")
    run.add_argument("--fixture", type=Path)
    sub.add_parser("verify", help="verify archive integrity and declared authority")
    sub.add_parser("describe", help="print the portable capability descriptor")
    args = parser.parse_args(argv)
    if args.command is None:
        args.command = "run"
        args.fixture = None
    return args


def main():
    args = parse_args(sys.argv[1:])
    try:
        metadata, archive_sha = inspect_self()
        if args.command == "verify":
            print(json.dumps({
                "schema": VERIFY_SCHEMA,
                "result": "PASS",
                "artifact_sha256": archive_sha,
                "capability_id": metadata["capability_id"],
                "provider_members": metadata["members"],
                "authority": metadata["authority"],
                "truth_boundary": metadata["truth_boundary"],
            }, indent=2, sort_keys=True))
            return 0
        if args.command == "describe":
            print(json.dumps(metadata, indent=2, sort_keys=True))
            return 0
        import experiment
        fixture = experiment.load_fixture(args.fixture) if args.fixture else embedded_fixture()
        report = experiment.run_experiment(fixture)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report["status"] == "PASS" else 1
    except (OSError, ValueError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(json.dumps({
            "schema": VERIFY_SCHEMA,
            "result": "HOLD",
            "error": str(exc),
            "authority": AUTHORITY,
        }, sort_keys=True), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
"""


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _source_payloads() -> dict[str, bytes]:
    return {
        "LICENSE": LICENSE_PATH.read_bytes(),
        "__main__.py": WRAPPER.encode("utf-8"),
        "experiment.py": EXPERIMENT_PATH.read_bytes(),
        "fixture.json": FIXTURE_PATH.read_bytes(),
    }


def _metadata(payloads: dict[str, bytes]) -> dict[str, Any]:
    return {
        "schema": PORTABLE_SCHEMA,
        "capability_id": CAPABILITY_ID,
        "runtime": {
            "python": ">=3.10",
            "third_party_dependencies": [],
            "network_required": False,
            "account_required": False,
            "ai_model_required": False,
        },
        "entrypoints": {
            "run": "python reference-state-closure.pyz run",
            "verify": "python reference-state-closure.pyz verify",
            "describe": "python reference-state-closure.pyz describe",
        },
        "provider": {
            "repository": "mike-axiom-mir/axm-state-research",
            "experiment_schema": "axm.reference-state-closure.report.v1",
            "fixture_schema": "axm.reference-state-closure.fixture.v1",
            "license": "Apache-2.0",
        },
        "members": {
            name: {"bytes": len(body), "sha256": sha256_bytes(body)}
            for name, body in sorted(payloads.items())
        },
        "authority": AUTHORITY,
        "truth_boundary": [
            "software runtime model; no neural or hardware performance claim",
            "portable integrity is not producer authentication or CANON authority",
            "derived reference state remains rebuildable from canonical fixture state",
            "a passing fixture is evidence for this declared workload, not a universal proof",
        ],
    }


def _zip_info(name: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(name, FIXED_DATE)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_STORED
    info.external_attr = (stat.S_IFREG | 0o644) << 16
    return info


def build_portable(output: Path) -> dict[str, Any]:
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    payloads = _source_payloads()
    for name, body in payloads.items():
        if len(body) > MAX_MEMBER_BYTES:
            raise ValueError(f"provider member exceeds byte ceiling: {name}")
    all_payloads = {**payloads, METADATA_NAME: canonical_bytes(_metadata(payloads))}
    with tempfile.NamedTemporaryFile(dir=output.parent, prefix=".reference-state-", suffix=".pyz", delete=False) as temp:
        temporary = Path(temp.name)
    try:
        with zipfile.ZipFile(temporary, "w", allowZip64=False) as archive:
            archive.comment = b""
            for name in sorted(all_payloads):
                archive.writestr(_zip_info(name), all_payloads[name])
        receipt = verify_portable(temporary)
        os.replace(temporary, output)
        return {**receipt, "output": str(output)}
    finally:
        if temporary.exists():
            temporary.unlink()


def _read_archive(path: Path) -> tuple[dict[str, bytes], dict[str, Any], str]:
    raw = path.read_bytes()
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if len(names) != len(set(names)):
            raise ValueError("duplicate archive member")
        if tuple(sorted(names)) != ALLOWED_NAMES:
            raise ValueError("unexpected archive member set")
        payloads: dict[str, bytes] = {}
        for info in infos:
            if info.compress_type != zipfile.ZIP_STORED:
                raise ValueError("compressed member is outside the portable contract")
            if info.date_time != FIXED_DATE:
                raise ValueError("member timestamp drift")
            if info.create_system != 3:
                raise ValueError("member platform metadata drift")
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_IFMT(mode) != stat.S_IFREG or stat.S_IMODE(mode) != 0o644:
                raise ValueError("member mode drift")
            if info.file_size > MAX_MEMBER_BYTES:
                raise ValueError("member exceeds byte ceiling")
            payloads[info.filename] = archive.read(info)
    metadata = json.loads(payloads[METADATA_NAME].decode("utf-8"))
    return payloads, metadata, sha256_bytes(raw)


def verify_portable(path: Path) -> dict[str, Any]:
    path = path.resolve()
    payloads, metadata, archive_sha = _read_archive(path)
    source_payloads = _source_payloads()
    expected_metadata = _metadata(source_payloads)
    if metadata != expected_metadata:
        raise ValueError("portable metadata does not match current provider source")
    for name, source in source_payloads.items():
        if payloads[name] != source:
            raise ValueError(f"portable member does not match provider source: {name}")
    if payloads[METADATA_NAME] != canonical_bytes(expected_metadata):
        raise ValueError("portable metadata encoding is noncanonical")
    return {
        "schema": VERIFY_SCHEMA,
        "result": "PASS",
        "artifact_sha256": archive_sha,
        "capability_id": CAPABILITY_ID,
        "provider_members": expected_metadata["members"],
        "authority": AUTHORITY,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="build the deterministic portable zipapp")
    build.add_argument("--output", type=Path, required=True)
    verify = sub.add_parser("verify", help="verify a zipapp against current provider source")
    verify.add_argument("artifact", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        result = build_portable(args.output) if args.command == "build" else verify_portable(args.artifact)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(json.dumps({
            "schema": VERIFY_SCHEMA,
            "result": "HOLD",
            "error": str(exc),
            "authority": AUTHORITY,
        }, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
