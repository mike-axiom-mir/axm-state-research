from __future__ import annotations

import unittest

from sentinel.benchmark import run_trace_variant
from sentinel.checks import make_checks
from sentinel.foundation_loader import FOUNDATION_ARCHIVE_SHA256, stable_hash
from sentinel.runtime import SemanticInvalidationRuntime, duplicated_packet_full_scan, full_scan_outputs
from sentinel.snapshot import load_project_snapshot
from sentinel.trace import make_adversarial_trace


class SentinelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.snapshot = load_project_snapshot()

    def test_foundation_and_heterogeneous_registry_are_present(self) -> None:
        checks = make_checks(self.snapshot)
        self.assertEqual(64, len(FOUNDATION_ARCHIVE_SHA256))
        self.assertGreaterEqual(len(checks), 100)
        self.assertLessEqual(len(checks), 300)
        self.assertGreaterEqual(len({check.perspective for check in checks}), 15)

    def test_known_dependency_bug_is_detected(self) -> None:
        result = run_trace_variant(repaired_dependencies=False, include_duplicated_baseline=False)
        self.assertEqual(1, result["totals"]["missed_wakeups"])
        step = next(item for item in result["steps"] if item["change_id"] == "break-output-equivalence-claim")
        self.assertEqual(["cross--report-matches-raw-results"], step["missed_check_ids"])
        self.assertFalse(result["totals"]["final_sparse_output_equivalent_to_oracle"])

    def test_repaired_dependencies_have_zero_misses_and_oracle_equivalence(self) -> None:
        result = run_trace_variant(repaired_dependencies=True, include_duplicated_baseline=False)
        self.assertEqual(0, result["totals"]["missed_wakeups"])
        self.assertTrue(result["totals"]["final_sparse_output_equivalent_to_oracle"])
        self.assertTrue(all(step["sparse_output_equivalent_to_oracle"] for step in result["steps"]))

    def test_registration_order_is_invariant(self) -> None:
        normal = run_trace_variant(repaired_dependencies=True, include_duplicated_baseline=False)
        reverse = run_trace_variant(
            repaired_dependencies=True,
            include_duplicated_baseline=False,
            reverse_registration=True,
        )
        self.assertEqual(normal["logical_replay_hash"], reverse["logical_replay_hash"])

    def test_shared_and_duplicated_full_scans_are_equivalent(self) -> None:
        checks = make_checks(self.snapshot)
        shared = full_scan_outputs(self.snapshot, checks)
        duplicated, duplicated_bytes = duplicated_packet_full_scan(
            self.snapshot, checks, [{"event": "fixture"}]
        )
        self.assertEqual(shared.outputs, duplicated.outputs)
        self.assertGreater(duplicated_bytes, 0)

    def test_trace_is_in_memory_and_does_not_mutate_snapshot(self) -> None:
        before = stable_hash(self.snapshot)
        trace = make_adversarial_trace(self.snapshot)
        runtime = SemanticInvalidationRuntime(make_checks(self.snapshot))
        initialized, _ = runtime.initialize(self.snapshot)
        runtime.transition(initialized, trace[0], 0)
        self.assertEqual(before, stable_hash(self.snapshot))


if __name__ == "__main__":
    unittest.main()
