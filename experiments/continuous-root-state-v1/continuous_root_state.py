from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass
from typing import Any, Dict, Mapping, MutableMapping, Set


MODELED_ROOTS = {
    "truth-before-story",
    "source-integrity",
    "agency-non-domination",
    "no-silent-rewrite",
    "restraint",
    "repairability",
}
UNMODELLED_ROOTS = {
    "no-fake-done",
    "continuity",
    "wisdom-over-speed",
}
RISK_ORDER = {"low": 1, "medium": 2, "high": 3, "severe": 4}
ROOT_DIGEST_ALGORITHM = "sha256(canonical-json)"


class RootIntegrityError(RuntimeError):
    pass


class IncrementalDriftError(RuntimeError):
    pass


class CheckpointIntegrityError(RuntimeError):
    pass


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def load_root_bundle(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        bundle = json.load(handle)
    root_ids = [item["id"] for item in bundle.get("roots", [])]
    if len(root_ids) != len(set(root_ids)):
        raise RootIntegrityError("Duplicate root id in donor bundle.")
    expected = MODELED_ROOTS | UNMODELLED_ROOTS
    if set(root_ids) != expected:
        raise RootIntegrityError(
            f"Donor root id set changed: expected {sorted(expected)}, got {sorted(root_ids)}"
        )
    return bundle


def empty_machine_state() -> Dict[str, Any]:
    return {
        "permissions": [],
        "required_permissions": [],
        "evidence": [],
        "required_evidence": [],
        "supporting_evidence": [],
        "contradicted_evidence": [],
        "risk": "low",
        "max_risk": "severe",
        "mutating": False,
        "recovery_present": False,
    }


def _as_set(state: Mapping[str, Any], key: str) -> Set[str]:
    return set(state.get(key, []))


def _check_agency(state: Mapping[str, Any]) -> Dict[str, str]:
    missing = sorted(_as_set(state, "required_permissions") - _as_set(state, "permissions"))
    if missing:
        return {"status": "REFUSE", "detail": f"Missing permissions: {', '.join(missing)}"}
    return {"status": "PASS", "detail": "All declared required permissions are present."}


def _check_truth(state: Mapping[str, Any]) -> Dict[str, str]:
    missing = sorted(_as_set(state, "required_evidence") - _as_set(state, "evidence"))
    if missing:
        return {"status": "HOLD", "detail": f"Required evidence missing: {', '.join(missing)}"}
    return {"status": "PASS", "detail": "All declared required evidence is present."}


def _check_source_integrity(state: Mapping[str, Any]) -> Dict[str, str]:
    evidence = _as_set(state, "evidence")
    support = _as_set(state, "supporting_evidence")
    unsupported = sorted(support - evidence)
    if unsupported:
        return {"status": "HOLD", "detail": f"Supporting references absent: {', '.join(unsupported)}"}
    if state.get("mutating") and not support:
        return {"status": "HOLD", "detail": "Mutating candidate has no declared supporting evidence."}
    return {"status": "PASS", "detail": "Declared support is present or no mutating action is pending."}


def _check_no_silent_rewrite(state: Mapping[str, Any]) -> Dict[str, str]:
    conflicted = sorted(
        _as_set(state, "supporting_evidence") & _as_set(state, "contradicted_evidence")
    )
    if conflicted:
        return {"status": "HOLD", "detail": f"Supporting evidence remains contradicted: {', '.join(conflicted)}"}
    return {"status": "PASS", "detail": "No declared supporting evidence is currently contradicted."}


def _check_restraint(state: Mapping[str, Any]) -> Dict[str, str]:
    risk = state.get("risk")
    max_risk = state.get("max_risk")
    if risk not in RISK_ORDER or max_risk not in RISK_ORDER:
        return {"status": "HOLD", "detail": "Risk vocabulary is outside this bounded fixture."}
    if RISK_ORDER[risk] > RISK_ORDER[max_risk]:
        return {"status": "REFUSE", "detail": f"Declared risk {risk} exceeds accepted maximum {max_risk}."}
    if risk == "severe":
        return {"status": "HOLD", "detail": "Severe-risk proposal requires a separate authorization contract."}
    return {"status": "PASS", "detail": f"Declared risk {risk} is within accepted maximum {max_risk}."}


def _check_repairability(state: Mapping[str, Any]) -> Dict[str, str]:
    if state.get("mutating") and not state.get("recovery_present"):
        return {"status": "HOLD", "detail": "Mutating candidate has no declared recovery path."}
    return {"status": "PASS", "detail": "No mutation is pending or a recovery path is declared."}


CHECKERS = {
    "agency-non-domination": _check_agency,
    "truth-before-story": _check_truth,
    "source-integrity": _check_source_integrity,
    "no-silent-rewrite": _check_no_silent_rewrite,
    "restraint": _check_restraint,
    "repairability": _check_repairability,
}

EVENT_ROOTS = {
    "grant_permission": {"agency-non-domination"},
    "revoke_permission": {"agency-non-domination"},
    "require_permission": {"agency-non-domination"},
    "clear_required_permission": {"agency-non-domination"},
    "add_evidence": {"truth-before-story", "source-integrity", "no-silent-rewrite"},
    "remove_evidence": {"truth-before-story", "source-integrity", "no-silent-rewrite"},
    "require_evidence": {"truth-before-story"},
    "clear_required_evidence": {"truth-before-story"},
    "support_evidence": {"source-integrity", "no-silent-rewrite"},
    "unsupport_evidence": {"source-integrity", "no-silent-rewrite"},
    "mark_contradicted": {"no-silent-rewrite"},
    "clear_contradicted": {"no-silent-rewrite"},
    "set_risk": {"restraint"},
    "set_max_risk": {"restraint"},
    "set_mutating": {"source-integrity", "repairability"},
    "set_recovery": {"repairability"},
}


def full_recompute(state: Mapping[str, Any], root_bundle: Mapping[str, Any]) -> Dict[str, Dict[str, str]]:
    root_ids = [item["id"] for item in root_bundle["roots"]]
    out: Dict[str, Dict[str, str]] = {}
    for root_id in root_ids:
        checker = CHECKERS.get(root_id)
        if checker is None:
            out[root_id] = {
                "status": "UNMODELLED",
                "detail": "The donor bundle declares this root, but this experiment has no executable predicate for it.",
            }
        else:
            out[root_id] = checker(state)
    return out


def aggregate_status(checks: Mapping[str, Mapping[str, str]]) -> str:
    statuses = {item["status"] for item in checks.values()}
    if "REFUSE" in statuses:
        return "REFUSE"
    if "HOLD" in statuses:
        return "HOLD"
    if "UNMODELLED" in statuses:
        return "INCOMPLETE"
    return "PASS"


@dataclass(frozen=True)
class RootSnapshot:
    sequence: int
    machine_state_digest: str
    root_bundle_digest: str
    aggregate_status: str
    checks: Dict[str, Dict[str, str]]


class ContinuousRootState:
    def __init__(
        self,
        root_bundle: Mapping[str, Any],
        *,
        machine_state: Mapping[str, Any] | None = None,
        expected_root_digest: str | None = None,
        verify_every: int = 1,
        sequence: int = 0,
    ) -> None:
        self._root_bundle = copy.deepcopy(dict(root_bundle))
        self._root_digest = digest(self._root_bundle)
        if expected_root_digest is not None and self._root_digest != expected_root_digest:
            raise RootIntegrityError(
                f"Root donor digest mismatch: expected {expected_root_digest}, got {self._root_digest}"
            )
        self._expected_root_digest = self._root_digest
        self._state = copy.deepcopy(dict(machine_state or empty_machine_state()))
        self._sequence = int(sequence)
        if verify_every < 1:
            raise ValueError("verify_every must be >= 1")
        self._verify_every = int(verify_every)
        self._checks = full_recompute(self._state, self._root_bundle)

    @property
    def sequence(self) -> int:
        return self._sequence

    def _assert_root_integrity(self) -> None:
        current = digest(self._root_bundle)
        if current != self._expected_root_digest:
            raise RootIntegrityError(
                f"Live root bundle changed: expected {self._expected_root_digest}, got {current}"
            )

    def _mutate_state(self, event: Mapping[str, Any]) -> Set[str]:
        event_type = event.get("type")
        if event_type not in EVENT_ROOTS:
            raise ValueError(f"Unknown event type: {event_type!r}")

        value = event.get("value")
        add_remove_keys = {
            "grant_permission": ("permissions", True),
            "revoke_permission": ("permissions", False),
            "require_permission": ("required_permissions", True),
            "clear_required_permission": ("required_permissions", False),
            "add_evidence": ("evidence", True),
            "remove_evidence": ("evidence", False),
            "require_evidence": ("required_evidence", True),
            "clear_required_evidence": ("required_evidence", False),
            "support_evidence": ("supporting_evidence", True),
            "unsupport_evidence": ("supporting_evidence", False),
            "mark_contradicted": ("contradicted_evidence", True),
            "clear_contradicted": ("contradicted_evidence", False),
        }
        if event_type in add_remove_keys:
            if not isinstance(value, str) or not value:
                raise ValueError(f"{event_type} requires a non-empty string value")
            key, should_add = add_remove_keys[event_type]
            current = set(self._state[key])
            if should_add:
                current.add(value)
            else:
                current.discard(value)
            self._state[key] = sorted(current)
        elif event_type == "set_risk":
            if value not in RISK_ORDER:
                raise ValueError(f"Unknown risk: {value!r}")
            self._state["risk"] = value
        elif event_type == "set_max_risk":
            if value not in RISK_ORDER:
                raise ValueError(f"Unknown max risk: {value!r}")
            self._state["max_risk"] = value
        elif event_type == "set_mutating":
            if not isinstance(value, bool):
                raise ValueError("set_mutating requires a boolean value")
            self._state["mutating"] = value
        elif event_type == "set_recovery":
            if not isinstance(value, bool):
                raise ValueError("set_recovery requires a boolean value")
            self._state["recovery_present"] = value
        return EVENT_ROOTS[event_type]

    def apply(self, event: Mapping[str, Any]) -> RootSnapshot:
        self._assert_root_integrity()
        before_state = copy.deepcopy(self._state)
        before_checks = copy.deepcopy(self._checks)
        before_sequence = self._sequence
        try:
            affected = self._mutate_state(event)
            for root_id in affected:
                self._checks[root_id] = CHECKERS[root_id](self._state)
            self._sequence += 1
            if self._sequence % self._verify_every == 0:
                full = full_recompute(self._state, self._root_bundle)
                if full != self._checks:
                    raise IncrementalDriftError(
                        f"Incremental root state diverged at sequence {self._sequence}"
                    )
            return self.snapshot()
        except Exception:
            self._state = before_state
            self._checks = before_checks
            self._sequence = before_sequence
            raise

    def snapshot(self) -> RootSnapshot:
        self._assert_root_integrity()
        return RootSnapshot(
            sequence=self._sequence,
            machine_state_digest=digest(self._state),
            root_bundle_digest=self._expected_root_digest,
            aggregate_status=aggregate_status(self._checks),
            checks=copy.deepcopy(self._checks),
        )

    def full_recompute_snapshot(self) -> RootSnapshot:
        self._assert_root_integrity()
        checks = full_recompute(self._state, self._root_bundle)
        return RootSnapshot(
            sequence=self._sequence,
            machine_state_digest=digest(self._state),
            root_bundle_digest=self._expected_root_digest,
            aggregate_status=aggregate_status(checks),
            checks=checks,
        )

    def checkpoint(self) -> Dict[str, Any]:
        self._assert_root_integrity()
        body = {
            "schema": "axm.state-research.continuous-root-state/checkpoint-v1",
            "sequence": self._sequence,
            "root_bundle_digest": self._expected_root_digest,
            "machine_state": copy.deepcopy(self._state),
        }
        return {**body, "checkpoint_digest": digest(body)}

    @classmethod
    def restore(
        cls,
        root_bundle: Mapping[str, Any],
        checkpoint: Mapping[str, Any],
        *,
        verify_every: int = 1,
    ) -> "ContinuousRootState":
        body = {key: value for key, value in checkpoint.items() if key != "checkpoint_digest"}
        expected_checkpoint_digest = checkpoint.get("checkpoint_digest")
        if digest(body) != expected_checkpoint_digest:
            raise CheckpointIntegrityError("Checkpoint content digest does not match.")
        root_digest = digest(root_bundle)
        if root_digest != checkpoint.get("root_bundle_digest"):
            raise RootIntegrityError("Checkpoint belongs to a different root donor bundle.")
        return cls(
            root_bundle,
            machine_state=checkpoint["machine_state"],
            expected_root_digest=checkpoint["root_bundle_digest"],
            verify_every=verify_every,
            sequence=checkpoint["sequence"],
        )

    def export_machine_state(self) -> Dict[str, Any]:
        return copy.deepcopy(self._state)
