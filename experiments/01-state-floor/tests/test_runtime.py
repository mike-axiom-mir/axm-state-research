from __future__ import annotations

import unittest

from axm_state_floor.baseline import NaiveSpecialistRuntime
from axm_state_floor.contracts import ProposedDelta
from axm_state_floor.nodes import generate_nodes
from axm_state_floor.runtime import StateFloorRuntime, merge_proposals
from axm_state_floor.world import make_initial_state, make_standard_changes


class RuntimeTests(unittest.TestCase):
    def test_sparse_routing_leaves_most_nodes_dormant(self) -> None:
        result = StateFloorRuntime(generate_nodes(1000)).run(make_initial_state(), make_standard_changes())
        self.assertLess(result.metrics["triggered_nodes_unique"], 1000)
        self.assertGreater(result.metrics["dormant_percentage"], 90.0)
        self.assertTrue(result.metrics["quiescent"])

    def test_replay_and_registration_order_are_deterministic(self) -> None:
        nodes = generate_nodes(100)
        first = StateFloorRuntime(nodes).run(make_initial_state(), make_standard_changes())
        second = StateFloorRuntime(tuple(reversed(nodes))).run(make_initial_state(), make_standard_changes())
        self.assertEqual(first.final_state_hash, second.final_state_hash)
        self.assertEqual(first.replay_fingerprint(), second.replay_fingerprint())

    def test_execution_order_does_not_change_final_state(self) -> None:
        runtime = StateFloorRuntime(generate_nodes(100))
        normal = runtime.run(make_initial_state(), make_standard_changes(), order_strategy="id")
        reverse = runtime.run(make_initial_state(), make_standard_changes(), order_strategy="reverse")
        self.assertEqual(normal.final_state_hash, reverse.final_state_hash)

    def test_genuine_conflicts_are_explicit_and_unresolved(self) -> None:
        result = StateFloorRuntime(generate_nodes(100)).run(make_initial_state(), make_standard_changes())
        conflicts = result.final_state["_meta"]["conflicts"]
        self.assertEqual(2, len(conflicts))
        self.assertTrue(all(item["status"] == "UNRESOLVED" for item in conflicts.values()))
        self.assertEqual({}, result.final_state["recommendations"])
        self.assertEqual(2, len(result.final_state["_meta"]["escalations"]))

    def test_domain_authority_resolves_but_preserves_dissent(self) -> None:
        proposals = [
            ProposedDelta("cost-authority", "derived.cost_estimate_cents", 1400, ("measure:1",), 1.0, "cost", 100),
            ProposedDelta("unrelated", "derived.cost_estimate_cents", 2, ("guess:1",), 0.2, "optimization", 999),
        ]
        outcome = merge_proposals(make_initial_state(), proposals, 0)
        self.assertEqual(1400, outcome.state["derived"]["cost_estimate_cents"])
        conflict = next(iter(outcome.state["_meta"]["conflicts"].values()))
        self.assertEqual("RESOLVED_BY_DOMAIN_AUTHORITY", conflict["status"])
        self.assertEqual(2, len(conflict["proposals"]))

    def test_naive_and_sparse_outputs_are_equivalent(self) -> None:
        nodes = generate_nodes(100)
        sparse = StateFloorRuntime(nodes).run(make_initial_state(), make_standard_changes())
        naive = NaiveSpecialistRuntime(nodes).run(
            make_initial_state(), make_standard_changes(), history_context=[{"event": "fixture", "value": 1}]
        )
        self.assertEqual(sparse.final_state_hash, naive.final_state_hash)
        self.assertGreater(naive.metrics["specialist_evaluations"], sparse.metrics["node_executions"])

    def test_receipts_have_required_verification_fields(self) -> None:
        result = StateFloorRuntime(generate_nodes(10)).run(make_initial_state(), make_standard_changes())
        receipt = result.receipts[0]
        self.assertEqual(64, len(receipt.input_state_hash))
        self.assertEqual(64, len(receipt.output_hash))
        self.assertIn("event_type", receipt.triggering_event)
        self.assertIsInstance(receipt.changed_state, bool)


if __name__ == "__main__":
    unittest.main()
