from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from real_project_closure.engine import POLICIES, run_experiment, verify_counterexample
from real_project_closure.foundation_loader import SENTINEL_ROOT, evaluate_check, load_project_snapshot, make_checks
from real_project_closure.model import FIXTURE_PATH, held_out_manifest_hash, load_fixture
from run_benchmarks import crosscheck_report, markdown_report, run_all


class RealProjectClosureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_experiment()

    def test_uses_exact_canonical_sentinel_registry_without_copy(self) -> None:
        checks = make_checks(load_project_snapshot(), repaired_dependencies=True)
        self.assertEqual(242, len(checks))
        self.assertTrue(Path(evaluate_check.__code__.co_filename).is_relative_to(SENTINEL_ROOT))
        self.assertEqual(24, len({check.evaluator for check in checks}))

    def test_split_is_disjoint_machine_readable_and_frozen(self) -> None:
        raw, training, held_out, _ = load_fixture()
        self.assertFalse({item.id for item in training} & {item.id for item in held_out})
        self.assertTrue(all(not item.training_probes for item in held_out))
        self.assertEqual(self.result["held_out_manifest_hash"], held_out_manifest_hash(raw))
        self.assertEqual(6, len(training))
        self.assertEqual(6, len(held_out))

    def test_all_five_fault_surfaces_are_planted(self) -> None:
        _, _, _, faults = load_fixture()
        self.assertEqual(
            {
                "direct_file_dependency_omission",
                "derived_report_chain",
                "incomplete_evidence_access",
                "conditional_read",
                "dormant_invalid_metadata",
            },
            {fault.kind for fault in faults},
        )

    def test_required_policy_comparison_is_complete(self) -> None:
        self.assertEqual(set(POLICIES), set(self.result["policies"]))
        self.assertEqual(242, self.result["canonical_check_count"])

    def test_broken_and_observed_failures_are_preserved(self) -> None:
        broken = self.result["policies"]["BROKEN_NO_AUDIT"]
        observed = self.result["policies"]["OBSERVED_READS"]
        self.assertGreater(broken["held_out"]["silent_stale_outputs"], 0)
        self.assertGreater(observed["held_out"]["silent_stale_outputs"], 0)
        self.assertFalse(broken["gate"]["final_oracle_equality"])
        self.assertFalse(observed["gate"]["final_oracle_equality"])
        self.assertGreater(broken["counterexample_count"], 0)
        self.assertGreater(observed["counterexample_count"], 0)

    def test_combined_policy_passes_all_frozen_gate_terms(self) -> None:
        combined = self.result["policies"]["COMBINED_RISK_OBSERVED"]
        self.assertTrue(self.result["gate"]["passed"])
        self.assertEqual(0, combined["held_out"]["silent_stale_outputs"])
        self.assertTrue(combined["gate"]["final_oracle_equality"])
        self.assertEqual(110, combined["audit_plus_replay_work"])
        self.assertEqual(1452, combined["full_oracle_work"])
        self.assertLess(combined["audit_plus_replay_work"], combined["full_oracle_work"])

    def test_repairs_have_provenance_and_invalid_metadata_is_quarantined(self) -> None:
        combined = self.result["policies"]["COMBINED_RISK_OBSERVED"]
        self.assertTrue(combined["gate"]["all_repairs_retain_provenance"])
        self.assertEqual(3, combined["learned_edge_total"])
        self.assertEqual(1, combined["learned_field_total"])
        self.assertEqual(1, combined["quarantine_total"])
        self.assertEqual(1, combined["unresolved_item_total"])
        for receipt in self.result["repair_receipts"]:
            self.assertEqual(64, len(receipt["provenance_hash"]))

    def test_replay_and_registration_order_are_deterministic(self) -> None:
        self.assertTrue(self.result["determinism"]["repeat_replay_equal"])
        self.assertTrue(self.result["determinism"]["registration_order_invariant"])

    def test_every_minimized_counterexample_reproduces(self) -> None:
        unique = {}
        for item in self.result["counterexamples"]:
            key = (item["policy"], item["check_id"], item["minimized_mutation_ids"])
            unique[key] = item["reproduce_command"].split("--verify-counterexample ", 1)[1]
        self.assertGreater(len(unique), 0)
        self.assertTrue(all(verify_counterexample(spec) for spec in unique.values()))

    def test_report_crosschecks_raw_metrics(self) -> None:
        raw = dict(self.result)
        raw.pop("transition_receipts")
        raw.pop("repair_receipts")
        raw.pop("counterexamples")
        self.assertTrue(crosscheck_report(raw, markdown_report(raw)))

    def test_runner_writes_all_evidence_without_mutating_fixture(self) -> None:
        before = hashlib.sha256(FIXTURE_PATH.read_bytes()).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = run_all(root / "raw", root / "BENCHMARK_RESULTS.md")
            self.assertTrue(data["gate"]["passed"])
            self.assertEqual(before, hashlib.sha256(FIXTURE_PATH.read_bytes()).hexdigest())
            expected = {
                "benchmark_results.json",
                "counterexamples.json",
                "mutation_split.json",
                "receipt.json",
                "repair_receipts.jsonl",
                "transition_receipts.jsonl",
            }
            self.assertEqual(expected, {path.name for path in (root / "raw").iterdir()})
            parsed = json.loads((root / "raw" / "benchmark_results.json").read_text())
            self.assertEqual(0, parsed["policies"]["COMBINED_RISK_OBSERVED"]["held_out"]["silent_stale_outputs"])


if __name__ == "__main__":
    unittest.main()
