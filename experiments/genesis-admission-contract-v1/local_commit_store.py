from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import json
import os
from pathlib import Path
import stat
from typing import Any, Mapping
from uuid import uuid4

from genesis_admission import AdmissionError, canonical_bytes, digest, verify_bundle

PREPARED_SCHEMA = "axm.genesis-prepared-admission/v1"
LOCAL_EVIDENCE_SCHEMA = "axm.genesis-local-fsync-evidence/v1"
AUTHORITY = "EVIDENCE_ONLY_NO_MERGE_NO_CANON"


class LocalCommitStoreError(AdmissionError):
    """Local durable-evidence publication failed or existing evidence is inconsistent."""


def _nonempty_text(name: str, value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise LocalCommitStoreError(f"{name} must be non-empty text")
    return value


def _preparation_hex(preparation_id: str) -> str:
    if not isinstance(preparation_id, str) or not preparation_id.startswith("prep:"):
        raise LocalCommitStoreError("preparation_id must use prep:<sha256>")
    value = preparation_id[5:]
    if len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value):
        raise LocalCommitStoreError("preparation_id must contain a lowercase sha256 digest")
    return value


@dataclass(frozen=True)
class LocalFsyncObservation:
    preparation_id: str
    file_bytes: int
    file_fsync_observed: bool
    directory_fsync_observed: bool
    reused_existing: bool

    def as_commit_evidence(self) -> Mapping[str, Any]:
        return {
            "schema": LOCAL_EVIDENCE_SCHEMA,
            "durable": self.file_fsync_observed and self.directory_fsync_observed,
            "scope": "validated-admission-inputs",
            "preparation_id": self.preparation_id,
            "prepared_sha256": _preparation_hex(self.preparation_id),
            "prepared_bytes": self.file_bytes,
            "storage": {
                "backend": "local-filesystem",
                "publication": "create-only-hardlink",
                "file_fsync_observed": self.file_fsync_observed,
                "directory_fsync_observed": self.directory_fsync_observed,
                "reused_existing": self.reused_existing,
            },
            "authority": AUTHORITY,
        }


class LocalGenesisCommitStore:
    """
    Bounded local evidence provider for Genesis admission.

    The validated pre-genesis bundle is the input truth. This store writes that exact
    bundle plus admitting identity to a content-addressed, create-only file and returns
    commit evidence only after successful file and directory fsync calls.

    It does not create G0, activate a machine, merge, or grant CANON authority.
    """

    def __init__(self, root: str | os.PathLike[str], *, max_bytes: int = 1024 * 1024):
        if not isinstance(max_bytes, int) or isinstance(max_bytes, bool) or max_bytes <= 0:
            raise LocalCommitStoreError("max_bytes must be a positive integer")
        self.root = Path(root)
        self.prepared_dir = self.root / "prepared"
        self.max_bytes = max_bytes

    def persist_validated_admission(
        self,
        receipt_bundle: Mapping[str, Any],
        *,
        admitted_by: str,
    ) -> Mapping[str, Any]:
        admitted_by = _nonempty_text("admitted_by", admitted_by)
        verdict = verify_bundle(receipt_bundle)
        if verdict.get("status") != "PASS":
            raise LocalCommitStoreError(
                f"receipt bundle is not admissible evidence: {verdict.get('reason', 'verification failed')}"
            )
        if verdict.get("phase") != "VALIDATED" or receipt_bundle.get("genesis") is not None:
            raise LocalCommitStoreError("local commit evidence requires an exact VALIDATED pre-genesis bundle")

        prepared = {
            "schema": PREPARED_SCHEMA,
            "lineage": verdict["lineage"],
            "admitted_by": admitted_by,
            "validated_bundle": deepcopy(dict(receipt_bundle)),
        }
        data = canonical_bytes(prepared)
        if len(data) > self.max_bytes:
            raise LocalCommitStoreError(
                f"prepared admission is {len(data)} bytes; limit is {self.max_bytes}"
            )

        preparation_id = f"prep:{digest(prepared)}"
        final_path = self.prepared_dir / f"{_preparation_hex(preparation_id)}.json"
        reused = self._publish_exact(final_path, data)
        return LocalFsyncObservation(
            preparation_id=preparation_id,
            file_bytes=len(data),
            file_fsync_observed=True,
            directory_fsync_observed=True,
            reused_existing=reused,
        ).as_commit_evidence()

    def load_prepared(self, preparation_id: str) -> Mapping[str, Any]:
        digest_hex = _preparation_hex(preparation_id)
        path = self.prepared_dir / f"{digest_hex}.json"
        data = self._read_regular_file(path)
        if len(data) > self.max_bytes:
            raise LocalCommitStoreError(
                f"prepared admission is {len(data)} bytes; limit is {self.max_bytes}"
            )
        try:
            parsed = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise LocalCommitStoreError(f"prepared admission is not valid UTF-8 JSON: {exc}") from exc
        if canonical_bytes(parsed) != data:
            raise LocalCommitStoreError("prepared admission bytes are not canonical JSON")
        if not isinstance(parsed, dict) or parsed.get("schema") != PREPARED_SCHEMA:
            raise LocalCommitStoreError("unsupported prepared-admission schema")
        if digest(parsed) != digest_hex:
            raise LocalCommitStoreError("prepared admission content does not match preparation_id")
        verdict = verify_bundle(parsed.get("validated_bundle", {}))
        if verdict.get("status") != "PASS" or verdict.get("phase") != "VALIDATED":
            raise LocalCommitStoreError("stored prepared admission no longer verifies as VALIDATED")
        if parsed.get("lineage") != verdict.get("lineage"):
            raise LocalCommitStoreError("stored prepared admission lineage mismatch")
        _nonempty_text("admitted_by", parsed.get("admitted_by"))
        return deepcopy(parsed)

    def verify_commit_evidence(
        self,
        commit_evidence: Mapping[str, Any],
        *,
        expected_bundle: Mapping[str, Any] | None = None,
        expected_admitted_by: str | None = None,
    ) -> Mapping[str, Any]:
        try:
            evidence = deepcopy(dict(commit_evidence))
        except (TypeError, ValueError) as exc:
            return {"status": "HOLD", "reason": f"commit evidence must be a mapping: {exc}"}
        try:
            if evidence.get("schema") != LOCAL_EVIDENCE_SCHEMA:
                raise LocalCommitStoreError("unsupported local commit-evidence schema")
            if evidence.get("durable") is not True:
                raise LocalCommitStoreError("local commit evidence is not marked durable")
            if evidence.get("scope") != "validated-admission-inputs":
                raise LocalCommitStoreError("local commit evidence scope mismatch")
            if evidence.get("authority") != AUTHORITY:
                raise LocalCommitStoreError("local commit evidence authority widened")
            storage = evidence.get("storage")
            if not isinstance(storage, dict):
                raise LocalCommitStoreError("local commit evidence storage must be a mapping")
            expected_storage = {
                "backend": "local-filesystem",
                "publication": "create-only-hardlink",
                "file_fsync_observed": True,
                "directory_fsync_observed": True,
            }
            for key, value in expected_storage.items():
                if storage.get(key) != value:
                    raise LocalCommitStoreError(f"local commit evidence storage.{key} mismatch")
            if not isinstance(storage.get("reused_existing"), bool):
                raise LocalCommitStoreError("local commit evidence storage.reused_existing must be boolean")

            preparation_id = evidence.get("preparation_id")
            digest_hex = _preparation_hex(preparation_id)
            if evidence.get("prepared_sha256") != digest_hex:
                raise LocalCommitStoreError("prepared_sha256 does not match preparation_id")
            prepared = self.load_prepared(preparation_id)
            actual_bytes = len(canonical_bytes(prepared))
            if evidence.get("prepared_bytes") != actual_bytes:
                raise LocalCommitStoreError("prepared_bytes does not match stored artifact")

            if expected_admitted_by is not None and prepared.get("admitted_by") != expected_admitted_by:
                raise LocalCommitStoreError("prepared admitting identity mismatch")
            if expected_bundle is not None:
                if canonical_bytes(prepared.get("validated_bundle")) != canonical_bytes(expected_bundle):
                    raise LocalCommitStoreError("prepared bundle does not match expected validated admission")

            return {
                "status": "PASS",
                "preparation_id": preparation_id,
                "lineage": prepared["lineage"],
                "authority": AUTHORITY,
            }
        except (AdmissionError, LocalCommitStoreError) as exc:
            return {"status": "HOLD", "reason": str(exc)}

    def _publish_exact(self, final_path: Path, data: bytes) -> bool:
        self.prepared_dir.mkdir(parents=True, exist_ok=True)
        temp_path = self.prepared_dir / f".{final_path.stem}.{os.getpid()}.{uuid4().hex}.tmp"
        fd = None
        published = False
        try:
            fd = os.open(temp_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            view = memoryview(data)
            while view:
                written = os.write(fd, view)
                if written <= 0:
                    raise LocalCommitStoreError("short write while publishing prepared admission")
                view = view[written:]
            os.fsync(fd)
            os.close(fd)
            fd = None
            try:
                os.link(temp_path, final_path)
                published = True
            except FileExistsError:
                existing = self._read_regular_file(final_path)
                if existing != data:
                    raise LocalCommitStoreError(
                        "content-addressed prepared path already exists with different bytes"
                    )
            finally:
                try:
                    temp_path.unlink()
                except FileNotFoundError:
                    pass

            if not published:
                existing_fd = self._open_readonly_regular(final_path)
                try:
                    os.fsync(existing_fd)
                finally:
                    os.close(existing_fd)
            self._fsync_directory(self.prepared_dir)
            return not published
        except OSError as exc:
            raise LocalCommitStoreError(f"local commit publication failed: {exc}") from exc
        finally:
            if fd is not None:
                os.close(fd)
            try:
                temp_path.unlink()
            except FileNotFoundError:
                pass

    def _read_regular_file(self, path: Path) -> bytes:
        fd = self._open_readonly_regular(path)
        try:
            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = os.read(fd, 65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > self.max_bytes:
                    raise LocalCommitStoreError(
                        f"prepared admission exceeds {self.max_bytes} byte read bound"
                    )
                chunks.append(chunk)
            return b"".join(chunks)
        finally:
            os.close(fd)

    @staticmethod
    def _open_readonly_regular(path: Path) -> int:
        flags = os.O_RDONLY
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        try:
            fd = os.open(path, flags)
        except OSError as exc:
            raise LocalCommitStoreError(f"cannot read prepared admission {path.name}: {exc}") from exc
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode):
                raise LocalCommitStoreError("prepared admission path is not a regular file")
            return fd
        except Exception:
            os.close(fd)
            raise

    @staticmethod
    def _fsync_directory(path: Path) -> None:
        flags = os.O_RDONLY
        if hasattr(os, "O_DIRECTORY"):
            flags |= os.O_DIRECTORY
        try:
            fd = os.open(path, flags)
        except OSError as exc:
            raise LocalCommitStoreError(f"cannot open prepared directory for fsync: {exc}") from exc
        try:
            os.fsync(fd)
        except OSError as exc:
            raise LocalCommitStoreError(f"prepared directory fsync failed: {exc}") from exc
        finally:
            os.close(fd)


def commit_with_local_store(
    machine: Any,
    store: LocalGenesisCommitStore,
    *,
    admitted_by: str,
) -> Mapping[str, Any]:
    """
    Generate real local fsync evidence before allowing the existing machine to create G0.

    The machine remains the admission authority; the store only supplies bounded evidence.
    """
    if getattr(machine, "phase", None) != "VALIDATED":
        raise LocalCommitStoreError("machine must be VALIDATED before local commit")
    before = machine.export_receipt_bundle()
    evidence = store.persist_validated_admission(before, admitted_by=admitted_by)
    verdict = store.verify_commit_evidence(
        evidence,
        expected_bundle=before,
        expected_admitted_by=admitted_by,
    )
    if verdict.get("status") != "PASS":
        raise LocalCommitStoreError(
            f"fresh local commit evidence did not verify: {verdict.get('reason', 'unknown error')}"
        )
    return machine.commit(admitted_by=admitted_by, commit_evidence=evidence)


def verify_local_genesis_bundle(
    receipt_bundle: Mapping[str, Any],
    store: LocalGenesisCommitStore,
) -> Mapping[str, Any]:
    """
    Verify that a canonical Genesis bundle is causally anchored to the exact
    VALIDATED bundle that the local store fsynced before G0 was created.
    """
    base = verify_bundle(receipt_bundle)
    if base.get("status") != "PASS":
        return base
    if base.get("phase") not in {"GENESIS", "ACTIVE"}:
        return {"status": "HOLD", "reason": "local Genesis verification requires canonical admission"}

    try:
        genesis = receipt_bundle.get("genesis")
        if not isinstance(genesis, Mapping):
            raise LocalCommitStoreError("genesis evidence is missing")
        evidence = genesis.get("evidence")
        if not isinstance(evidence, Mapping):
            raise LocalCommitStoreError("genesis evidence body is missing")
        commit_evidence = evidence.get("commit_evidence")
        if not isinstance(commit_evidence, Mapping):
            raise LocalCommitStoreError("genesis commit evidence is missing")

        preparation_id = commit_evidence.get("preparation_id")
        prepared = store.load_prepared(preparation_id)
        prepared_bundle = prepared["validated_bundle"]
        evidence_verdict = store.verify_commit_evidence(
            commit_evidence,
            expected_bundle=prepared_bundle,
            expected_admitted_by=prepared["admitted_by"],
        )
        if evidence_verdict.get("status") != "PASS":
            raise LocalCommitStoreError(
                f"stored local commit evidence failed: {evidence_verdict.get('reason', 'unknown error')}"
            )
        if evidence.get("admitted_by") != prepared["admitted_by"]:
            raise LocalCommitStoreError("Genesis admitting identity differs from prepared admission")

        prepared_receipts = prepared_bundle.get("pre_genesis_receipts")
        final_receipts = receipt_bundle.get("pre_genesis_receipts")
        if not isinstance(prepared_receipts, list) or not isinstance(final_receipts, list):
            raise LocalCommitStoreError("receipt chain is missing")
        if final_receipts[: len(prepared_receipts)] != prepared_receipts:
            raise LocalCommitStoreError("Genesis receipt history is not prefixed by the prepared admission")

        configured = next((item for item in prepared_receipts if item.get("to") == "CONFIGURED"), None)
        instantiated = next((item for item in prepared_receipts if item.get("to") == "INSTANTIATED"), None)
        candidates = [item for item in prepared_receipts if item.get("to") == "CANDIDATE"]
        validated = [item for item in prepared_receipts if item.get("to") == "VALIDATED"]
        if configured is None or instantiated is None or not candidates or not validated:
            raise LocalCommitStoreError("prepared admission lacks required causal receipts")

        config_projection = {
            "rule_version": evidence.get("rule_version"),
            "executable_hashes": evidence.get("executable_hashes"),
            "platform_assumptions": evidence.get("platform_assumptions"),
        }
        instance_projection = {
            "source_inputs": evidence.get("source_inputs"),
            "identities": evidence.get("identities"),
            "initial_configuration": evidence.get("initial_configuration"),
            "randomness": evidence.get("randomness"),
            "timestamp_semantics": evidence.get("timestamp_semantics"),
        }
        if configured.get("evidence", {}).get("configuration_digest") != digest(config_projection):
            raise LocalCommitStoreError("Genesis configuration is not bound to prepared CONFIGURED receipt")
        if instantiated.get("evidence", {}).get("instance_digest") != digest(instance_projection):
            raise LocalCommitStoreError("Genesis instance is not bound to prepared INSTANTIATED receipt")
        if candidates[-1].get("evidence", {}).get("candidate_digest") != evidence.get("candidate_digest"):
            raise LocalCommitStoreError("Genesis candidate is not bound to prepared CANDIDATE receipt")
        if validated[-1].get("evidence", {}).get("validation_digest") != evidence.get("validation_digest"):
            raise LocalCommitStoreError("Genesis validation is not bound to prepared VALIDATED receipt")

        return {
            "status": "PASS",
            "lineage": base["lineage"],
            "phase": base["phase"],
            "canonical_id": base["canonical_id"],
            "preparation_id": preparation_id,
            "authority": AUTHORITY,
        }
    except (AdmissionError, LocalCommitStoreError, TypeError, ValueError) as exc:
        return {"status": "HOLD", "reason": str(exc)}
