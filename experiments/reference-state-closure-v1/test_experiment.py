from __future__ import annotations

import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from experiment import load_fixture, run_experiment, validate_fixture  # noqa: E402


class ReferenceStateClosureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = load_fixture()

    def test_sparse_engine_matches_dense_oracle(self) -> None:
        report = run_experiment(self.fixture)
        self.assertEqual(report["status"], "PASS")
        self.assertTrue(report["correctness"]["canonical_output_equality_A_B"])
        self.assertEqual(
            report["correctness"]["replay_digest_A"],
            report["correctness"]["replay_digest_B"],
        )

    def test_negative_control_proves_reference_dependency(self) -> None:
        report = run_experiment(self.fixture)
        self.assertGreater(
            report["correctness"]["aggressive_control_divergences_A_C"], 0
        )
        self.assertGreater(
            report["correctness"]["missed_reference_contributions_C"], 0
        )

    def test_sparse_engine_reduces_work_and_state_encoding(self) -> None:
        report = run_experiment(self.fixture)
        self.assertGreater(report["work"]["executions_avoided_B"], 0)
        self.assertLess(
            report["state_encoding"]["max_derived_reference_bytes_B"],
            report["state_encoding"]["max_dense_reference_bytes_A"],
        )
        self.assertGreater(
            report["state_encoding"]["implicit_default_bytes_avoided_B"], 0
        )

    def test_dropped_reference_update_fails_closed(self) -> None:
        report = run_experiment(self.fixture, fault="drop-reference-summary-update")
        self.assertEqual(report["status"], "HOLD")
        self.assertFalse(report["correctness"]["canonical_output_equality_A_B"])

    def test_replay_is_deterministic(self) -> None:
        first = run_experiment(self.fixture)
        second = run_experiment(copy.deepcopy(self.fixture))
        self.assertEqual(first, second)

    def test_fixture_rejects_unknown_signal(self) -> None:
        broken = copy.deepcopy(self.fixture)
        broken["events"][0]["signals"] = {"unknown": 1}
        with self.assertRaisesRegex(ValueError, "unknown signal"):
            validate_fixture(broken)

    def test_fixture_rejects_nonpositive_reference(self) -> None:
        broken = copy.deepcopy(self.fixture)
        broken["nodes"][0]["reference"] = 0
        with self.assertRaisesRegex(ValueError, "must be >= 1"):
            validate_fixture(broken)

    def test_cli_emits_machine_readable_passing_report(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(HERE / "experiment.py")],
            check=True,
            capture_output=True,
            text=True,
        )
        report = json.loads(completed.stdout)
        self.assertEqual(report["schema"], "axm.reference-state-closure.report.v1")
        self.assertEqual(report["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
