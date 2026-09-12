"""Frozen contracts and committed evidence checks for Experiment 07."""

from __future__ import annotations

import hashlib
import json
import unittest

from opaque_recovery.runtime import (
    CANDIDATE_POLICY,
    FORBIDDEN_HELD_OUT_KEYS,
    HELD_OUT_PATH,
    OPAQUE_ID,
    ORACLE_PATH,
    POLICIES,
    build_nodes,
    file_hash,
    load_inputs,
    run_experiment,
    verify_counterexample,
)
from run_benchmarks import RAW_DIR, REPORT_PATH, crosscheck_report, verify_freeze


class OpaqueRecoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_experiment()

    def test_public_opaque_contract_has_no_path_parameters_or_observed_reads(self) -> None:
        opaque = next(item for item in build_nodes() if item.id == OPAQUE_ID)
        self.assertEqual((), opaque.reads)
        self.assertEqual(("state:identity.name",), opaque.subscriptions)
        self.assertEqual({}, self.result["training"]["opaque_public_parameters"])
        self.assertEqual([], self.result["training"]["opaque_observed_reads"])

    def test_evaluator_source_really_changes_after_training(self) -> None:
        training, _, _, _ = load_inputs()
        projects = self.result["policies"][CANDIDATE_POLICY]["projects"]
        self.assertNotEqual(
            file_hash(training.source_path), projects["opaque-workcell-v2"]["current_source_hash"]
        )
        self.assertFalse(projects["opaque-workcell-v3-unavailable"]["source_available"])

    def test_held_out_manifest_has_no_labels_or_oracle_answers(self) -> None:
        raw = json.loads(HELD_OUT_PATH.read_text(encoding="utf-8"))

        def keys(value: object) -> set[str]:
            if isinstance(value, dict):
                return set(value) | set().union(*(keys(child) for child in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(child) for child in value)) if value else set()
            return set()

        self.assertFalse({key.lower() for key in keys(raw)} & FORBIDDEN_HELD_OUT_KEYS)
        self.assertNotEqual(HELD_OUT_PATH, ORACLE_PATH)

    def test_candidate_passes_frozen_safe_usefulness_gate(self) -> None:
        candidate = self.result["policies"][CANDIDATE_POLICY]
        self.assertTrue(self.result["gate"]["passed"])
        self.assertEqual(0, candidate["wrong_resolved_outputs"])
        self.assertEqual(0, candidate["false_abstentions"])
        self.assertEqual(0, candidate["untrusted_checkpoint_replays"])
        self.assertGreaterEqual(candidate["resolved_coverage_percentage"], 85.0)
        self.assertLess(candidate["total_policy_work"], candidate["full_oracle_reference_work"])

    def test_unavailable_source_remains_explicitly_unresolved(self) -> None:
        project = self.result["policies"][CANDIDATE_POLICY]["projects"][
            "opaque-workcell-v3-unavailable"
        ]
        self.assertEqual((OPAQUE_ID, "safety-summary"), tuple(project["final_unresolved_ids"]))
        self.assertEqual(0, project["wrong_resolved_outputs"])

    def test_comparison_failures_and_abstain_all_control_are_retained(self) -> None:
        self.assertEqual(set(POLICIES), set(self.result["policies"]))
        self.assertGreater(self.result["policies"]["BROKEN_SPARSE"]["wrong_resolved_outputs"], 0)
        self.assertGreater(self.result["policies"]["OBSERVED_ONLY"]["wrong_resolved_outputs"], 0)
        self.assertGreater(self.result["policies"]["STRUCTURAL_ONLY"]["wrong_resolved_outputs"], 0)
        self.assertEqual(0.0, self.result["policies"]["ABSTAIN_ALL"]["resolved_coverage_percentage"])

    def test_every_retained_counterexample_reproduces(self) -> None:
        specs = sorted({item["reproduce_spec"] for item in self.result["counterexamples"]})
        self.assertTrue(specs)
        self.assertTrue(all(verify_counterexample(spec) for spec in specs))

    def test_repeat_and_registration_order_are_deterministic(self) -> None:
        self.assertTrue(self.result["determinism"]["repeat_replay_equal"])
        self.assertTrue(self.result["determinism"]["registration_order_invariant"])

    def test_execution_receipt_contract_is_complete(self) -> None:
        required = {
            "node_id",
            "input_state_hash",
            "triggering_event",
            "output_delta",
            "evidence_refs",
            "output_hash",
            "execution_time_ns",
            "changed_state",
        }
        self.assertTrue(self.result["execution_receipts"])
        self.assertTrue(all(required <= set(item) for item in self.result["execution_receipts"]))

    def test_committed_first_score_evidence_crosschecks(self) -> None:
        verify_freeze()
        raw = json.loads((RAW_DIR / "benchmark_results.json").read_text(encoding="utf-8"))
        self.assertTrue(crosscheck_report(raw, REPORT_PATH.read_text(encoding="utf-8")))
        receipt = json.loads((RAW_DIR / "first_score_receipt.json").read_text(encoding="utf-8"))
        for name, expected in receipt["files"].items():
            path = REPORT_PATH if name == REPORT_PATH.name else RAW_DIR / name
            self.assertEqual(expected, hashlib.sha256(path.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
