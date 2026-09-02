"""Frozen semantics, checkpoint safety, score, evidence, and replay tests."""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from run_benchmarks import (
    FREEZE_RECEIPT_PATH,
    RAW_DIR,
    REPORT_PATH,
    crosscheck_report,
    markdown_report,
    run_all,
    verify_freeze,
)
from verify_evidence import run_verification
from unlabeled_closure.checkpoint import create_checkpoint, recover_checkpoint, validate_checkpoint
from unlabeled_closure.engine import CANDIDATE_POLICY, POLICIES, full_outputs, run_experiment, verify_counterexample
from unlabeled_closure.foundation_loader import EXPERIMENT_ROOT, stable_hash
from unlabeled_closure.model import (
    FORBIDDEN_HELD_OUT_KEYS,
    HELD_OUT_PATH,
    load_manifests,
    load_project,
    verify_project_versions,
)


class UnlabeledClosureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_experiment()

    def test_project_versions_are_canonical_disjoint_subtrees(self) -> None:
        projects, training, held, _ = load_manifests()
        verified = verify_project_versions(projects.values())
        self.assertEqual(3, len(verified))
        self.assertFalse({item.project_id for item in training} & {item.project_id for item in held})
        self.assertEqual(
            {"workfloor-sentinel-v0.1.0-at-7ba2b1d", "adaptive-closure-v0.1.0-at-7ba2b1d"},
            {item.project_id for item in held},
        )

    def test_held_out_manifest_has_no_risk_or_oracle_routing_fields(self) -> None:
        raw = json.loads(HELD_OUT_PATH.read_text(encoding="utf-8"))

        def keys(value: object) -> set[str]:
            if isinstance(value, dict):
                return set(value) | set().union(*(keys(child) for child in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(child) for child in value)) if value else set()
            return set()

        self.assertFalse({key.lower() for key in keys(raw)} & FORBIDDEN_HELD_OUT_KEYS)
        self.assertFalse(self.result["held_out_contains_declared_risk_labels"])

    def test_required_surfaces_and_policy_comparison_are_present(self) -> None:
        _, _, held, _ = load_manifests()
        operation_kinds = {
            operation.kind for mutation in held for operation in mutation.operations
        }
        self.assertTrue({"append_text", "json_set_top", "rename", "delete"} <= operation_kinds)
        self.assertEqual({"absent", "corrupt_payload"}, {item.checkpoint_case for item in held if item.checkpoint_case})
        self.assertEqual(set(POLICIES), set(self.result["policies"]))

    def test_checkpoint_corruption_never_replays_silently(self) -> None:
        projects, _, _, _ = load_manifests()
        project = projects["workfloor-sentinel-v0.1.0-at-7ba2b1d"]
        state = load_project(project)
        outputs = {"fixture": {"status": "PASS", "value": 1, "detail": "fixture"}}
        checkpoint = create_checkpoint(
            project=project,
            snapshot_hash=stable_hash(state["project"]),
            policy_hash="0" * 64,
            outputs=outputs,
        )
        checkpoint["payload"]["outputs"]["fixture"]["value"] = 2
        valid, recovered, receipt = validate_checkpoint(
            checkpoint,
            project=project,
            snapshot_hash=stable_hash(state["project"]),
            policy_hash="0" * 64,
        )
        self.assertFalse(valid)
        self.assertIsNone(recovered)
        self.assertEqual("quarantined_untrusted", receipt["status"])

    def test_unresolved_checkpoint_recovery_abstains_and_escalates(self) -> None:
        projects, _, _, _ = load_manifests()
        project = projects["workfloor-sentinel-v0.1.0-at-7ba2b1d"]
        state = load_project(project)
        outputs, work, receipts, unresolved = recover_checkpoint(
            project=project,
            snapshot_hash=stable_hash(state["project"]),
            policy_hash="1" * 64,
            checkpoint=None,
            trusted_source_available=False,
            reconstruct=lambda: ({}, 0),
        )
        self.assertIsNone(outputs)
        self.assertEqual(0, work)
        self.assertTrue(unresolved)
        self.assertEqual("abstain_escalate_unresolved", receipts[-1]["action"])

    def test_frozen_candidate_passes_total_work_gate(self) -> None:
        candidate = self.result["policies"][CANDIDATE_POLICY]
        self.assertTrue(self.result["gate"]["passed"])
        self.assertEqual(0, candidate["silent_stale_outputs"])
        self.assertTrue(candidate["final_oracle_equality"])
        self.assertLess(candidate["total_policy_check_work"], candidate["full_oracle_reference_work"])
        totals = candidate["totals"]
        expected = (
            totals["sparse_check_executions"]
            + totals["audit_check_executions"]
            + totals["replay_check_executions"]
            + totals["reconstruction_check_executions"]
            + totals["full_oracle_check_executions"]
        )
        self.assertEqual(expected, candidate["total_policy_check_work"])

    def test_failures_are_retained_and_every_counterexample_reproduces(self) -> None:
        self.assertGreater(self.result["policies"]["BROKEN_SPARSE_NO_AUDIT"]["silent_stale_outputs"], 0)
        self.assertGreater(self.result["policies"]["OBSERVED_READS"]["silent_stale_outputs"], 0)
        specs = [item["reproduce_spec"] for item in self.result["counterexamples"]]
        self.assertTrue(specs)
        self.assertTrue(all(verify_counterexample(spec) for spec in sorted(set(specs))))

    def test_repeat_and_reverse_order_are_deterministic(self) -> None:
        # The first score retained an evidence-only failed flag because its
        # checkpoint validation provenance hash included host timing.
        self.assertFalse(self.result["determinism"]["repeat_replay_equal"])
        self.assertFalse(self.result["determinism"]["registration_order_invariant"])
        verified = run_verification(verify_counterexamples=False)
        self.assertTrue(verified["normalized_repeat_replay_equal"])
        self.assertTrue(verified["normalized_registration_order_invariant"])

    def test_transfer_is_reported_by_held_out_project_version(self) -> None:
        candidate = self.result["policies"][CANDIDATE_POLICY]
        self.assertEqual(2, len(candidate["projects"]))
        for project in candidate["projects"].values():
            self.assertEqual(0, project["metrics"]["silent_stale_outputs"])
            self.assertTrue(project["final_oracle_equality"])
            self.assertGreater(project["metrics"]["reconstruction_check_executions"], 0)

    def test_freeze_and_committed_raw_evidence_crosscheck(self) -> None:
        self.assertTrue(verify_freeze())
        if not (RAW_DIR / "benchmark_results.json").exists():
            self.skipTest("first score has not yet been persisted")
        raw = json.loads((RAW_DIR / "benchmark_results.json").read_text(encoding="utf-8"))
        report = REPORT_PATH.read_text(encoding="utf-8")
        self.assertTrue(crosscheck_report(raw, report))
        receipt = json.loads((RAW_DIR / "first_score_receipt.json").read_text(encoding="utf-8"))
        for name, expected in receipt["files"].items():
            path = REPORT_PATH if name == REPORT_PATH.name else RAW_DIR / name
            self.assertEqual(expected, hashlib.sha256(path.read_bytes()).hexdigest())

    def test_temp_runner_writes_complete_evidence_without_manifest_mutation(self) -> None:
        before = hashlib.sha256(HELD_OUT_PATH.read_bytes()).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            evidence = run_all(root / "raw", root / "BENCHMARK_RESULTS.md")
            self.assertTrue(evidence["gate"]["passed"])
            expected = {
                "benchmark_results.json",
                "checkpoint_receipts.json",
                "counterexamples.json",
                "first_score_receipt.json",
                "provenance_receipts.jsonl",
                "transition_receipts.jsonl",
            }
            self.assertEqual(expected, {path.name for path in (root / "raw").iterdir()})
        self.assertEqual(before, hashlib.sha256(HELD_OUT_PATH.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
