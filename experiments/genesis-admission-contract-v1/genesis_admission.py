from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from hashlib import sha256
import json
from typing import Any, Mapping, Sequence

SCHEMA = "axm.genesis-admission/v1"
RECEIPT_SCHEMA = "axm.genesis-admission-receipt/v1"

ALLOWED_TRANSITIONS = {
    "UNFORMED": {"CONFIGURED"},
    "CONFIGURED": {"INSTANTIATED"},
    "INSTANTIATED": {"CANDIDATE"},
    "CANDIDATE": {"VALIDATED", "REJECTED"},
    "REJECTED": {"CANDIDATE"},
    "VALIDATED": {"GENESIS", "COMMIT_FAILED"},
    "COMMIT_FAILED": {"COMMIT_FAILED", "GENESIS"},
    "GENESIS": {"ACTIVE"},
    "ACTIVE": set(),
}


class AdmissionError(ValueError):
    """A caller attempted a transition that the admission contract does not allow."""


def canonical_bytes(value: Any) -> bytes:
    """Return strict, deterministic JSON bytes suitable for content identity."""
    try:
        return json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise AdmissionError(f"state is not strict portable JSON: {exc}") from exc


def digest(value: Any) -> str:
    return sha256(canonical_bytes(value)).hexdigest()


def _nonempty_text(name: str, value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AdmissionError(f"{name} must be non-empty text")
    return value


def _require_mapping(name: str, value: Any) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise AdmissionError(f"{name} must be a mapping")
    result = deepcopy(dict(value))
    canonical_bytes(result)
    return result


@dataclass(frozen=True)
class GenesisSnapshot:
    lineage: str
    canonical_id: str
    evidence_digest: str
    evidence: Mapping[str, Any]


class GenesisAdmissionMachine:
    """
    Small deterministic executable form of the repository's Genesis admission proposal.

    Pre-genesis receipts remain evidence, not canonical history. Canonical identity appears
    only after a validated candidate has durable commit evidence.
    """

    def __init__(self, lineage: str):
        self.lineage = _nonempty_text("lineage", lineage)
        self.phase = "UNFORMED"
        self._configuration: dict[str, Any] | None = None
        self._instance: dict[str, Any] | None = None
        self._candidate: dict[str, Any] | None = None
        self._validation: list[dict[str, Any]] | None = None
        self._receipts: list[dict[str, Any]] = []
        self._genesis: GenesisSnapshot | None = None

    @property
    def genesis(self) -> GenesisSnapshot | None:
        return self._genesis

    @property
    def receipts(self) -> tuple[Mapping[str, Any], ...]:
        return tuple(deepcopy(self._receipts))

    def configure(
        self,
        *,
        rule_version: str,
        executable_hashes: Mapping[str, str],
        platform_assumptions: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        self._expect("UNFORMED")
        config = {
            "rule_version": _nonempty_text("rule_version", rule_version),
            "executable_hashes": _require_mapping("executable_hashes", executable_hashes),
            "platform_assumptions": _require_mapping("platform_assumptions", platform_assumptions),
        }
        if not config["executable_hashes"]:
            raise AdmissionError("executable_hashes must not be empty")
        self._configuration = config
        return self._move("CONFIGURED", {"configuration_digest": digest(config)})

    def instantiate(
        self,
        *,
        source_inputs: Mapping[str, Any],
        identities: Mapping[str, Any],
        initial_configuration: Mapping[str, Any],
        randomness: Mapping[str, Any],
        timestamp_semantics: str,
    ) -> Mapping[str, Any]:
        self._expect("CONFIGURED")
        instance = {
            "source_inputs": _require_mapping("source_inputs", source_inputs),
            "identities": _require_mapping("identities", identities),
            "initial_configuration": _require_mapping("initial_configuration", initial_configuration),
            "randomness": _require_mapping("randomness", randomness),
            "timestamp_semantics": _nonempty_text("timestamp_semantics", timestamp_semantics),
        }
        self._instance = instance
        return self._move("INSTANTIATED", {"instance_digest": digest(instance)})

    def propose(self, candidate_state: Mapping[str, Any]) -> Mapping[str, Any]:
        self._expect("INSTANTIATED")
        candidate = _require_mapping("candidate_state", candidate_state)
        self._candidate = candidate
        return self._move("CANDIDATE", {"candidate_digest": digest(candidate)})

    def validate(self, checks: Sequence[Mapping[str, Any]]) -> Mapping[str, Any]:
        self._expect("CANDIDATE")
        normalized: list[dict[str, Any]] = []
        for raw in checks:
            item = _require_mapping("validation check", raw)
            name = _nonempty_text("validation check name", item.get("name"))
            passed = item.get("passed")
            if not isinstance(passed, bool):
                raise AdmissionError(f"validation check {name!r} needs boolean passed")
            normalized.append({"name": name, "passed": passed, "evidence": item.get("evidence")})
        if not normalized:
            raise AdmissionError("at least one validation check is required")
        canonical_bytes(normalized)
        self._validation = normalized
        failed = [item["name"] for item in normalized if not item["passed"]]
        if failed:
            return self._move("REJECTED", {"failed_checks": failed, "validation_digest": digest(normalized)})
        return self._move("VALIDATED", {"validation_digest": digest(normalized)})

    def retry_rejected_candidate(self, candidate_state: Mapping[str, Any]) -> Mapping[str, Any]:
        self._expect("REJECTED")
        candidate = _require_mapping("candidate_state", candidate_state)
        self._candidate = candidate
        self._validation = None
        return self._move("CANDIDATE", {"candidate_digest": digest(candidate), "retry": True})

    def commit(
        self,
        *,
        admitted_by: str,
        commit_evidence: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        self._expect("VALIDATED")
        evidence = _require_mapping("commit_evidence", commit_evidence)
        durable = evidence.get("durable")
        if not isinstance(durable, bool):
            raise AdmissionError("commit_evidence.durable must be boolean")
        if not durable:
            return self._move("COMMIT_FAILED", {"commit_evidence_digest": digest(evidence)})
        return self._finish_commit(admitted_by=admitted_by, commit_evidence=evidence)

    def retry_commit(
        self,
        *,
        admitted_by: str,
        commit_evidence: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        self._expect("COMMIT_FAILED")
        evidence = _require_mapping("commit_evidence", commit_evidence)
        if evidence.get("durable") is not True:
            return self._move("COMMIT_FAILED", {"commit_evidence_digest": digest(evidence), "retry": True})
        return self._finish_commit(admitted_by=admitted_by, commit_evidence=evidence)

    def activate(self) -> Mapping[str, Any]:
        self._expect("GENESIS")
        return self._move("ACTIVE", {"canonical_id": self._genesis.canonical_id})

    def export_receipt_bundle(self) -> Mapping[str, Any]:
        payload = {
            "schema": RECEIPT_SCHEMA,
            "lineage": self.lineage,
            "phase": self.phase,
            "pre_genesis_receipts": deepcopy(self._receipts),
            "genesis": None,
        }
        if self._genesis is not None:
            payload["genesis"] = {
                "canonical_id": self._genesis.canonical_id,
                "evidence_digest": self._genesis.evidence_digest,
                "evidence": deepcopy(dict(self._genesis.evidence)),
            }
        return payload

    def _finish_commit(self, *, admitted_by: str, commit_evidence: Mapping[str, Any]) -> Mapping[str, Any]:
        assert self._configuration is not None
        assert self._instance is not None
        assert self._candidate is not None
        assert self._validation is not None
        admitted_by = _nonempty_text("admitted_by", admitted_by)

        bundle = {
            "schema": SCHEMA,
            "lineage": self.lineage,
            "rule_version": self._configuration["rule_version"],
            "executable_hashes": deepcopy(self._configuration["executable_hashes"]),
            "platform_assumptions": deepcopy(self._configuration["platform_assumptions"]),
            "source_inputs": deepcopy(self._instance["source_inputs"]),
            "identities": deepcopy(self._instance["identities"]),
            "initial_configuration": deepcopy(self._instance["initial_configuration"]),
            "randomness": deepcopy(self._instance["randomness"]),
            "timestamp_semantics": self._instance["timestamp_semantics"],
            "candidate_state": deepcopy(self._candidate),
            "candidate_digest": digest(self._candidate),
            "validation": deepcopy(self._validation),
            "validation_digest": digest(self._validation),
            "admitted_by": admitted_by,
            "commit_evidence": deepcopy(dict(commit_evidence)),
        }
        evidence_digest = digest(bundle)
        canonical_id = f"g0:{self.lineage}:{evidence_digest}"
        self._genesis = GenesisSnapshot(
            lineage=self.lineage,
            canonical_id=canonical_id,
            evidence_digest=evidence_digest,
            evidence=deepcopy(bundle),
        )
        return self._move("GENESIS", {"canonical_id": canonical_id, "evidence_digest": evidence_digest})

    def _expect(self, expected: str) -> None:
        if self.phase != expected:
            raise AdmissionError(f"transition requires {expected}; current phase is {self.phase}")

    def _move(self, next_phase: str, evidence: Mapping[str, Any]) -> Mapping[str, Any]:
        receipt = {
            "sequence": len(self._receipts),
            "lineage": self.lineage,
            "from": self.phase,
            "to": next_phase,
            "evidence": deepcopy(dict(evidence)),
        }
        receipt["receipt_digest"] = digest(receipt)
        self._receipts.append(receipt)
        self.phase = next_phase
        return deepcopy(receipt)


def verify_bundle(bundle: Mapping[str, Any]) -> Mapping[str, Any]:
    """Verify a detached receipt bundle without granting it merge/CANON authority."""
    try:
        data = _require_mapping("bundle", bundle)
        if data.get("schema") != RECEIPT_SCHEMA:
            raise AdmissionError("unsupported receipt bundle schema")
        lineage = _nonempty_text("lineage", data.get("lineage"))
        receipts = data.get("pre_genesis_receipts")
        if not isinstance(receipts, list):
            raise AdmissionError("pre_genesis_receipts must be a list")

        phase = "UNFORMED"
        for index, raw in enumerate(receipts):
            receipt = _require_mapping("receipt", raw)
            stored = receipt.pop("receipt_digest", None)
            if stored != digest(receipt):
                raise AdmissionError(f"receipt {index} digest mismatch")
            if receipt.get("sequence") != index or receipt.get("lineage") != lineage:
                raise AdmissionError(f"receipt {index} identity/sequence mismatch")
            if receipt.get("from") != phase:
                raise AdmissionError(f"receipt {index} breaks phase chain")
            next_phase = receipt.get("to")
            if next_phase not in ALLOWED_TRANSITIONS.get(phase, set()):
                raise AdmissionError(f"receipt {index} contains illegal transition {phase}->{next_phase}")
            phase = next_phase

        if phase != data.get("phase"):
            raise AdmissionError("bundle phase disagrees with receipt chain")

        genesis = data.get("genesis")
        if genesis is None:
            if phase in {"GENESIS", "ACTIVE"}:
                raise AdmissionError("canonical phase requires genesis evidence")
            return {"status": "PASS", "lineage": lineage, "phase": phase, "canonical_id": None}

        genesis_map = _require_mapping("genesis", genesis)
        evidence = _require_mapping("genesis.evidence", genesis_map.get("evidence"))
        if evidence.get("schema") != SCHEMA or evidence.get("lineage") != lineage:
            raise AdmissionError("genesis evidence identity mismatch")
        candidate_state = _require_mapping("genesis.evidence.candidate_state", evidence.get("candidate_state"))
        if evidence.get("candidate_digest") != digest(candidate_state):
            raise AdmissionError("candidate digest mismatch")
        validation = evidence.get("validation")
        if not isinstance(validation, list) or not validation:
            raise AdmissionError("genesis validation must be a non-empty list")
        if evidence.get("validation_digest") != digest(validation):
            raise AdmissionError("validation digest mismatch")
        if any(not isinstance(item, Mapping) or item.get("passed") is not True for item in validation):
            raise AdmissionError("genesis evidence contains a non-passing validation check")
        commit_evidence = _require_mapping("genesis.evidence.commit_evidence", evidence.get("commit_evidence"))
        if commit_evidence.get("durable") is not True:
            raise AdmissionError("genesis evidence lacks durable commit evidence")

        evidence_digest = digest(evidence)
        if genesis_map.get("evidence_digest") != evidence_digest:
            raise AdmissionError("genesis evidence digest mismatch")
        expected_id = f"g0:{lineage}:{evidence_digest}"
        if genesis_map.get("canonical_id") != expected_id:
            raise AdmissionError("canonical id mismatch")
        if phase not in {"GENESIS", "ACTIVE"}:
            raise AdmissionError("genesis evidence cannot exist before canonical admission")
        genesis_receipts = [item for item in receipts if item.get("to") == "GENESIS"]
        if len(genesis_receipts) != 1:
            raise AdmissionError("receipt chain must contain exactly one GENESIS transition")
        if genesis_receipts[0].get("evidence", {}).get("canonical_id") != expected_id:
            raise AdmissionError("GENESIS receipt does not bind the canonical id")
        return {"status": "PASS", "lineage": lineage, "phase": phase, "canonical_id": expected_id}
    except AdmissionError as exc:
        return {"status": "HOLD", "reason": str(exc)}
