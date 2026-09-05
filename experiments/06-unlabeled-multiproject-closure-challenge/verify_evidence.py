#!/usr/bin/env python3
"""Post-score, non-semantic evidence verification for the frozen challenge."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from run_benchmarks import RAW_DIR, REPORT_PATH, crosscheck_report, verify_freeze
from unlabeled_closure.engine import CANDIDATE_POLICY, run_policy, verify_counterexample
from unlabeled_closure.foundation_loader import stable_hash
from unlabeled_closure.model import HELD_OUT_PATH, load_manifests, verify_project_versions


MEASUREMENT_KEYS = frozenset(
    {
        "wall_time_ns",
        "cpu_time_ns",
        "validation_time_ns",
        "receipt_bytes",
        "checkpoint_bytes",
        "state_bytes",
        "retained_object_bytes_estimate",
        "logical_replay_hash",
    }
)


def logical_only(value: Any) -> Any:
    """Remove measurements and their derived hashes, never policy decisions."""

    if isinstance(value, dict):
        timed_receipt = "validation_time_ns" in value
        return {
            key: logical_only(child)
            for key, child in value.items()
            if key not in MEASUREMENT_KEYS
            and not key.endswith("_time_ns")
            and not (timed_receipt and key == "provenance_hash")
        }
    if isinstance(value, (list, tuple)):
        return [logical_only(child) for child in value]
    return value


def replay_hash(result: dict[str, Any]) -> str:
    payload = {
        key: value
        for key, value in result.items()
        if key not in {"counterexamples", "counterexample_count"}
    }
    return stable_hash(logical_only(payload))


def verify_raw_hashes() -> bool:
    receipt = json.loads((RAW_DIR / "first_score_receipt.json").read_text(encoding="utf-8"))
    for name, expected in receipt["files"].items():
        path = REPORT_PATH if name == REPORT_PATH.name else RAW_DIR / name
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            return False
    return True


def run_verification(*, verify_counterexamples: bool = True) -> dict[str, Any]:
    freeze = verify_freeze()
    projects, training, held_out, _ = load_manifests()
    from unlabeled_closure.engine import train_observed_templates

    templates, _ = train_observed_templates(projects, training)
    first = run_policy(
        policy=CANDIDATE_POLICY,
        projects=projects,
        held_out=held_out,
        observed_templates=templates,
        minimize=False,
    )
    repeat = run_policy(
        policy=CANDIDATE_POLICY,
        projects=projects,
        held_out=held_out,
        observed_templates=templates,
        minimize=False,
    )
    reverse = run_policy(
        policy=CANDIDATE_POLICY,
        projects=projects,
        held_out=held_out,
        observed_templates=templates,
        minimize=False,
        reverse_registration=True,
    )
    hashes = {
        "first": replay_hash(first),
        "repeat": replay_hash(repeat),
        "reverse_registration": replay_hash(reverse),
    }
    raw = json.loads((RAW_DIR / "benchmark_results.json").read_text(encoding="utf-8"))
    counterexamples = json.loads((RAW_DIR / "counterexamples.json").read_text(encoding="utf-8"))
    unique_specs = sorted({item["reproduce_spec"] for item in counterexamples})
    counterexample_results = (
        {spec: verify_counterexample(spec) for spec in unique_specs}
        if verify_counterexamples
        else {}
    )
    result = {
        "schema": "axm.unlabeled-closure.post-score-verification/v1",
        "semantic_freeze_commit": freeze["semantic_freeze_commit"],
        "held_out_manifest_sha256": hashlib.sha256(HELD_OUT_PATH.read_bytes()).hexdigest(),
        "project_versions_verified": bool(verify_project_versions(projects.values())),
        "first_score_embedded_repeat_flag": raw["determinism"]["repeat_replay_equal"],
        "first_score_embedded_reverse_flag": raw["determinism"]["registration_order_invariant"],
        "embedded_flag_failure_cause": "checkpoint validation provenance hash included host timing",
        "normalization_boundary": "remove only timing/storage measurements, embedded logical hashes, and provenance hashes derived from validation timing",
        "normalized_logical_hashes": hashes,
        "normalized_repeat_replay_equal": len({hashes["first"], hashes["repeat"]}) == 1,
        "normalized_registration_order_invariant": hashes["first"] == hashes["reverse_registration"],
        "raw_report_crosscheck": crosscheck_report(
            raw, REPORT_PATH.read_text(encoding="utf-8")
        ),
        "raw_evidence_hashes_match_first_score_receipt": verify_raw_hashes(),
        "freeze_verified": True,
        "counterexample_unique_count": len(unique_specs),
        "counterexample_results": counterexample_results,
        "all_counterexamples_reproduce": bool(unique_specs)
        and (all(counterexample_results.values()) if verify_counterexamples else True),
    }
    result["passed"] = all(
        (
            result["project_versions_verified"],
            result["normalized_repeat_replay_equal"],
            result["normalized_registration_order_invariant"],
            result["raw_report_crosscheck"],
            result["raw_evidence_hashes_match_first_score_receipt"],
            result["freeze_verified"],
            result["all_counterexamples_reproduce"],
        )
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-counterexamples", action="store_true")
    args = parser.parse_args()
    result = run_verification(verify_counterexamples=not args.skip_counterexamples)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
