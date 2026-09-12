from __future__ import annotations

import unittest

from axm_state_floor.state_history import run_state_vs_history


class StateHistoryTests(unittest.TestCase):
    def test_missing_aggregates_cause_divergence_and_enrichment_repairs_fixture(self) -> None:
        result = run_state_vs_history(cases=200, seed=20260901)
        self.assertGreater(result["full_history_vs_current_state_mismatches"], 0)
        self.assertEqual(0, result["full_history_vs_enriched_state_mismatches"])
        self.assertIn("maximum historical load absent", result["lost_information_reasons"])
        self.assertIn("material transition count absent", result["lost_information_reasons"])


if __name__ == "__main__":
    unittest.main()
