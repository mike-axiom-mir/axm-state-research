"""Hash- and provenance-bound checkpoint validation and safe recovery."""

from __future__ import annotations

import time
from typing import Any, Callable

from .foundation_loader import stable_hash
from .model import ProjectVersion


CHECKPOINT_SCHEMA = "axm.unlabeled-closure.checkpoint/v1"


def create_checkpoint(
    *,
    project: ProjectVersion,
    snapshot_hash: str,
    policy_hash: str,
    outputs: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    payload = {"outputs": outputs}
    envelope = {
        "schema": CHECKPOINT_SCHEMA,
        "bindings": {
            "project_id": project.id,
            "base_commit": project.base_commit,
            "tree_sha": project.tree_sha,
            "snapshot_hash": snapshot_hash,
            "policy_hash": policy_hash,
        },
        "outputs_hash": stable_hash(outputs),
        "payload_hash": stable_hash(payload),
        "payload": payload,
    }
    envelope["provenance_hash"] = stable_hash(envelope)
    return envelope


def _validation_receipt(
    *, project_id: str, status: str, reasons: tuple[str, ...], elapsed_ns: int
) -> dict[str, Any]:
    receipt = {
        "schema": "axm.unlabeled-closure.checkpoint-validation/v1",
        "project_id": project_id,
        "status": status,
        "reasons": reasons,
        "validation_time_ns": elapsed_ns,
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    return receipt


def validate_checkpoint(
    checkpoint: dict[str, Any] | None,
    *,
    project: ProjectVersion,
    snapshot_hash: str,
    policy_hash: str,
) -> tuple[bool, dict[str, Any] | None, dict[str, Any]]:
    start = time.perf_counter_ns()
    reasons: list[str] = []
    outputs: dict[str, Any] | None = None
    if checkpoint is None:
        reasons.append("checkpoint_absent")
    else:
        if checkpoint.get("schema") != CHECKPOINT_SCHEMA:
            reasons.append("schema_mismatch")
        bindings = checkpoint.get("bindings")
        expected = {
            "project_id": project.id,
            "base_commit": project.base_commit,
            "tree_sha": project.tree_sha,
            "snapshot_hash": snapshot_hash,
            "policy_hash": policy_hash,
        }
        if bindings != expected:
            reasons.append("binding_or_provenance_mismatch")
        payload = checkpoint.get("payload")
        if not isinstance(payload, dict) or checkpoint.get("payload_hash") != stable_hash(payload):
            reasons.append("payload_hash_mismatch")
        else:
            candidate = payload.get("outputs")
            if not isinstance(candidate, dict) or checkpoint.get("outputs_hash") != stable_hash(candidate):
                reasons.append("outputs_hash_mismatch")
            else:
                outputs = candidate
        provenance = dict(checkpoint)
        recorded = provenance.pop("provenance_hash", None)
        if recorded != stable_hash(provenance):
            reasons.append("provenance_hash_mismatch")
    valid = not reasons
    receipt = _validation_receipt(
        project_id=project.id,
        status="trusted" if valid else "quarantined_untrusted",
        reasons=tuple(sorted(set(reasons))),
        elapsed_ns=time.perf_counter_ns() - start,
    )
    return valid, outputs if valid else None, receipt


def recover_checkpoint(
    *,
    project: ProjectVersion,
    snapshot_hash: str,
    policy_hash: str,
    checkpoint: dict[str, Any] | None,
    trusted_source_available: bool,
    reconstruct: Callable[[], tuple[dict[str, dict[str, Any]], int]],
) -> tuple[dict[str, dict[str, Any]] | None, int, list[dict[str, Any]], bool]:
    valid, outputs, validation = validate_checkpoint(
        checkpoint,
        project=project,
        snapshot_hash=snapshot_hash,
        policy_hash=policy_hash,
    )
    receipts = [validation]
    if valid:
        return outputs, 0, receipts, False
    if not trusted_source_available:
        receipt = {
            "schema": "axm.unlabeled-closure.checkpoint-recovery/v1",
            "project_id": project.id,
            "action": "abstain_escalate_unresolved",
            "source_snapshot_hash": snapshot_hash,
            "reconstruction_check_executions": 0,
        }
        receipt["provenance_hash"] = stable_hash(receipt)
        receipts.append(receipt)
        return None, 0, receipts, True
    reconstructed, executions = reconstruct()
    fresh = create_checkpoint(
        project=project,
        snapshot_hash=snapshot_hash,
        policy_hash=policy_hash,
        outputs=reconstructed,
    )
    receipt = {
        "schema": "axm.unlabeled-closure.checkpoint-recovery/v1",
        "project_id": project.id,
        "action": "quarantine_then_reconstruct_from_verified_source",
        "source_snapshot_hash": snapshot_hash,
        "reconstruction_check_executions": executions,
        "replacement_checkpoint_hash": stable_hash(fresh),
    }
    receipt["provenance_hash"] = stable_hash(receipt)
    receipts.append(receipt)
    return reconstructed, executions, receipts, False
