from __future__ import annotations

import hashlib
import unittest
from pathlib import Path

from adaptive_closure.engine import POLICIES, run_policy, run_suite
from adaptive_closure.foundation_loader import FOUNDATION_ROOT
from adaptive_closure.model import generate_events
from adaptive_closure.state_debt import run_state_debt_fixture


class AdaptiveClosureTests(unittest.TestCase):
    def test_no_audit_preserves_broken_counterexample(self) -> None:
        result = run_policy("NO_AUDIT", generate_events(1), frozenset({"direct"}))
        self.assertFalse(result["final_equality"])
        self.assertEqual(result["detections"], 0)
        self.assertEqual(result["learned_edges"], 0)

    def test_direct_and_indirect_activation_faults_are_repaired(self) -> None:
        for fault in ("direct", "indirect"):
            result = run_policy("RISK_ADAPTIVE", generate_events(100), frozenset({fault}))
            self.assertGreaterEqual(result["learned_edges"], 1)
            self.assertTrue(result["final_equality"])

    def test_incomplete_slice_abstains_then_repairs_field(self) -> None:
        result = run_policy("RISK_ADAPTIVE", generate_events(30), frozenset({"slice"}), capture=True)
        self.assertGreater(result["abstentions"], 0)
        self.assertEqual(result["learned_fields"], 1)
        self.assertTrue(result["final_equality"])
        self.assertTrue(any(item["missing_fields"] == ["slice_evidence"] for item in result["evidence"]))

    def test_branch_dependent_read_change_is_detected(self) -> None:
        result = run_policy("RISK_ADAPTIVE", generate_events(30), frozenset({"branch"}))
        self.assertEqual(result["learned_edges"], 1)
        self.assertTrue(result["final_equality"])

    def test_dormant_invalid_state_is_quarantined_not_rewritten(self) -> None:
        result = run_policy("RISK_ADAPTIVE", generate_events(30), frozenset({"dormant"}))
        unresolved = [item for item in result["evidence"] if item["node"] == "dormant"]
        self.assertEqual(unresolved[0]["action"], "quarantine_unresolved")
        self.assertEqual(unresolved[0]["current"], "ABSTAIN:invalid_dormant_value")
        self.assertEqual(result["learned_edges"], 0)

    def test_rollback_replay_restores_full_oracle_equality(self) -> None:
        result = run_policy("FIXED_INTERVAL", generate_events(100), frozenset({"direct", "indirect", "slice"}))
        self.assertGreater(result["rollback_events"], 0)
        self.assertGreater(result["replay_handler_executions"], 0)
        self.assertTrue(result["final_equality"])

    def test_adaptive_policy_is_reproducible(self) -> None:
        events = generate_events(250, 99)
        first = run_policy("RISK_ADAPTIVE", events, frozenset({"direct", "branch", "slice"}), 99, True)
        second = run_policy("RISK_ADAPTIVE", events, frozenset({"direct", "branch", "slice"}), 99, True)
        self.assertEqual(first["replay_hash"], second["replay_hash"])

    def test_registration_order_does_not_change_replay(self) -> None:
        events = generate_events(250, 101)
        forward = run_policy("RISK_ADAPTIVE", events, frozenset({"direct", "indirect"}), 101, True)
        reverse = run_policy("RISK_ADAPTIVE", events, frozenset({"direct", "indirect"}), 101, True, True)
        self.assertEqual(forward["replay_hash"], reverse["replay_hash"])

    def test_all_policies_complete_same_workload(self) -> None:
        result = run_suite(100)
        self.assertEqual(set(result), set(POLICIES))
        self.assertFalse(result["NO_AUDIT"]["final_equality"])
        self.assertTrue(result["FULL_ORACLE"]["final_equality"])

    def test_state_debt_implicit_defaults_preserve_outputs_and_replay(self) -> None:
        result = run_state_debt_fixture(1_000, 20)
        self.assertTrue(result["initial_output_equality"])
        self.assertTrue(result["replay_equality"])
        self.assertLess(result["implicit"]["resident_bytes"], result["dense"]["resident_bytes"])
        self.assertLess(result["implicit"]["checkpoint_bytes"], result["dense"]["checkpoint_bytes"])

    def test_experiment_does_not_mutate_source_or_sibling(self) -> None:
        root = Path(__file__).resolve().parents[1]

        def digest(paths: list[Path]) -> str:
            hasher = hashlib.sha256()
            for base in paths:
                for path in sorted(base.rglob("*.py")):
                    if "__pycache__" not in path.parts:
                        hasher.update(path.relative_to(base).as_posix().encode())
                        hasher.update(path.read_bytes())
            return hasher.hexdigest()

        before = digest([root, FOUNDATION_ROOT])
        run_suite(100)
        self.assertEqual(before, digest([root, FOUNDATION_ROOT]))


if __name__ == "__main__":
    unittest.main()
