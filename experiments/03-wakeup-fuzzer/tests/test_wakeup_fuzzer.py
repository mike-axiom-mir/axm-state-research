from __future__ import annotations

import hashlib
import unittest
from pathlib import Path

from wakeup_fuzzer.cascade import run_cascade, run_oscillation_fixture
from wakeup_fuzzer.engine import build_oracle_trace, run_mode
from wakeup_fuzzer.fixtures import generate_mutations, make_fixture
from wakeup_fuzzer.fuzzer import (
    build_counterexample,
    minimize_mutation_sequence,
    run_comparison,
    sparse_failure,
)


class WakeupFuzzerTests(unittest.TestCase):
    def test_fixed_seed_deterministic_replay(self) -> None:
        first = run_comparison(48, 60, seed=41, capture_transitions=True)
        second = run_comparison(48, 60, seed=41, capture_transitions=True)
        self.assertEqual(first["comparison_replay_hash"], second["comparison_replay_hash"])

    def test_registration_order_invariance(self) -> None:
        forward = run_comparison(48, 60, seed=42, capture_transitions=True)
        reverse = run_comparison(
            48, 60, seed=42, capture_transitions=True, reverse_registration=True
        )
        self.assertEqual(forward["comparison_replay_hash"], reverse["comparison_replay_hash"])

    def test_planted_subscription_omission_is_detected(self) -> None:
        result = run_comparison(64, 20, seed=43, broken=True, capture_transitions=True)
        self.assertGreater(result["modes"]["declared_sparse"]["missed_wakes"], 0)
        self.assertFalse(result["modes"]["declared_sparse"]["output_equivalence"])
        self.assertGreater(result["modes"]["polling"]["missed_wakes"], 0)
        self.assertTrue(result["modes"]["observed"]["output_equivalence"])

    def test_minimizer_preserves_failure(self) -> None:
        state, checks = make_fixture(64, seed=44, broken=True)
        mutations = generate_mutations(
            state, 20, seed=45, force_omission_trigger=True
        )
        minimized = minimize_mutation_sequence(state, checks, mutations)
        self.assertLess(len(minimized), len(mutations))
        self.assertTrue(sparse_failure(state, checks, minimized))

    def test_repaired_and_observed_routing_match_oracle(self) -> None:
        result = run_comparison(64, 100, seed=46)
        for mode in ("declared_sparse", "observed", "shared"):
            self.assertEqual(result["modes"][mode]["missed_wakes"], 0)
            self.assertTrue(result["modes"][mode]["output_equivalence"])

    def test_polling_baseline_has_same_output_semantics(self) -> None:
        result = run_comparison(64, 100, seed=47)
        polling = result["modes"]["polling"]
        full_scan = result["modes"]["full_scan"]
        self.assertTrue(polling["output_equivalence"])
        self.assertEqual(polling["final_output_hash"], full_scan["final_output_hash"])
        self.assertEqual(polling["condition_probes"], 64 * 100)

    def test_shared_matching_uses_fewer_probes_than_polling(self) -> None:
        result = run_comparison(128, 100, seed=48)
        self.assertLess(
            result["modes"]["shared"]["condition_probes"],
            result["modes"]["polling"]["condition_probes"],
        )

    def test_in_memory_fuzz_does_not_mutate_source(self) -> None:
        root = Path(__file__).resolve().parents[1]

        def digest() -> str:
            hasher = hashlib.sha256()
            for path in sorted(root.rglob("*.py")):
                if "__pycache__" not in path.parts:
                    hasher.update(path.relative_to(root).as_posix().encode())
                    hasher.update(path.read_bytes())
            return hasher.hexdigest()

        before = digest()
        run_comparison(32, 30, seed=49, broken=True)
        self.assertEqual(before, digest())

    def test_counterexample_fixture_is_machine_readable_and_minimal(self) -> None:
        evidence = build_counterexample(seed=50, original_size=16)
        self.assertTrue(evidence["failure_preserved"])
        self.assertEqual(evidence["minimized_sequence_size"], 1)
        self.assertEqual(
            evidence["minimized_mutations"][0]["field"],
            evidence["broken_check"]["actual_reads"][1],
        )

    def test_positive_token_cascade_and_oscillation_stop(self) -> None:
        cascade = run_cascade(100)
        self.assertTrue(cascade["output_equivalence"])
        self.assertEqual(cascade["active_steps"], 100)
        self.assertEqual(cascade["quiescence_iterations"], 100)
        self.assertGreater(cascade["condition_probes_avoided"], 0)
        oscillation = run_oscillation_fixture()
        self.assertEqual(oscillation["status"], "oscillation_detected")
        self.assertTrue(oscillation["stopped_before_limit"])

    def test_direct_mode_runner_matches_prebuilt_oracle(self) -> None:
        state, checks = make_fixture(24, seed=51)
        mutations = generate_mutations(state, 25, seed=52)
        oracle = build_oracle_trace(state, checks, mutations)
        result = run_mode("declared_sparse", state, checks, mutations, oracle, True)
        self.assertTrue(result.output_equivalence)
        self.assertEqual(result.missed_wakes, 0)


if __name__ == "__main__":
    unittest.main()
