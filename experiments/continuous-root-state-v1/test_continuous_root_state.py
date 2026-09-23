import copy
import os
import unittest

from continuous_root_state import (
    CheckpointIntegrityError,
    ContinuousRootState,
    EVENT_ROOTS,
    IncrementalDriftError,
    RootIntegrityError,
    load_root_bundle,
)


HERE = os.path.dirname(__file__)
FIXTURE = os.path.join(HERE, "fixture", "mirror_roots_v1.json")
EXPECTED_ROOT_DIGEST = "59651fbab19647713ea4f94aff98adab1c0a539cb3b61a7ad3f0b3374b4838cd"


class ContinuousRootStateTests(unittest.TestCase):
    def setUp(self):
        self.bundle = load_root_bundle(FIXTURE)

    def make_live(self, verify_every=1):
        return ContinuousRootState(
            self.bundle,
            expected_root_digest=EXPECTED_ROOT_DIGEST,
            verify_every=verify_every,
        )

    def assert_incremental_matches_full(self, live):
        incremental = live.snapshot()
        full = live.full_recompute_snapshot()
        self.assertEqual(incremental.machine_state_digest, full.machine_state_digest)
        self.assertEqual(incremental.aggregate_status, full.aggregate_status)
        self.assertEqual(incremental.checks, full.checks)

    def test_initial_state_is_incomplete_not_pass(self):
        live = self.make_live()
        snap = live.snapshot()
        self.assertEqual("INCOMPLETE", snap.aggregate_status)
        self.assertEqual("UNMODELLED", snap.checks["continuity"]["status"])
        self.assertEqual("UNMODELLED", snap.checks["wisdom-over-speed"]["status"])
        self.assertEqual("UNMODELLED", snap.checks["no-fake-done"]["status"])
        self.assert_incremental_matches_full(live)

    def test_permission_failure_refuses_then_recovers(self):
        live = self.make_live()
        snap = live.apply({"type": "require_permission", "value": "world.write"})
        self.assertEqual("REFUSE", snap.aggregate_status)
        self.assertEqual("REFUSE", snap.checks["agency-non-domination"]["status"])

        snap = live.apply({"type": "grant_permission", "value": "world.write"})
        self.assertEqual("INCOMPLETE", snap.aggregate_status)
        self.assertEqual("PASS", snap.checks["agency-non-domination"]["status"])
        self.assert_incremental_matches_full(live)

    def test_evidence_and_contradiction_are_live_holds(self):
        live = self.make_live()
        snap = live.apply({"type": "require_evidence", "value": "receipt:1"})
        self.assertEqual("HOLD", snap.aggregate_status)
        self.assertEqual("HOLD", snap.checks["truth-before-story"]["status"])

        live.apply({"type": "add_evidence", "value": "receipt:1"})
        snap = live.apply({"type": "support_evidence", "value": "receipt:1"})
        self.assertEqual("INCOMPLETE", snap.aggregate_status)

        snap = live.apply({"type": "mark_contradicted", "value": "receipt:1"})
        self.assertEqual("HOLD", snap.aggregate_status)
        self.assertEqual("HOLD", snap.checks["no-silent-rewrite"]["status"])

        snap = live.apply({"type": "clear_contradicted", "value": "receipt:1"})
        self.assertEqual("INCOMPLETE", snap.aggregate_status)
        self.assert_incremental_matches_full(live)

    def test_mutation_requires_support_and_recovery(self):
        live = self.make_live()
        snap = live.apply({"type": "set_mutating", "value": True})
        self.assertEqual("HOLD", snap.aggregate_status)
        self.assertEqual("HOLD", snap.checks["source-integrity"]["status"])
        self.assertEqual("HOLD", snap.checks["repairability"]["status"])

        live.apply({"type": "add_evidence", "value": "receipt:mut"})
        live.apply({"type": "support_evidence", "value": "receipt:mut"})
        snap = live.apply({"type": "set_recovery", "value": True})
        self.assertEqual("INCOMPLETE", snap.aggregate_status)
        self.assertEqual("PASS", snap.checks["source-integrity"]["status"])
        self.assertEqual("PASS", snap.checks["repairability"]["status"])
        self.assert_incremental_matches_full(live)

    def test_risk_over_limit_refuses(self):
        live = self.make_live()
        live.apply({"type": "set_max_risk", "value": "medium"})
        snap = live.apply({"type": "set_risk", "value": "high"})
        self.assertEqual("REFUSE", snap.aggregate_status)
        self.assertEqual("REFUSE", snap.checks["restraint"]["status"])

        snap = live.apply({"type": "set_max_risk", "value": "high"})
        self.assertEqual("INCOMPLETE", snap.aggregate_status)
        self.assert_incremental_matches_full(live)

    def test_checkpoint_round_trip_reconstructs_same_live_state(self):
        live = self.make_live()
        events = [
            {"type": "require_permission", "value": "world.write"},
            {"type": "grant_permission", "value": "world.write"},
            {"type": "require_evidence", "value": "receipt:1"},
            {"type": "add_evidence", "value": "receipt:1"},
            {"type": "support_evidence", "value": "receipt:1"},
            {"type": "set_mutating", "value": True},
            {"type": "set_recovery", "value": True},
        ]
        for event in events:
            live.apply(event)

        checkpoint = live.checkpoint()
        restored = ContinuousRootState.restore(self.bundle, checkpoint)
        self.assertEqual(live.snapshot(), restored.snapshot())
        self.assertEqual(live.export_machine_state(), restored.export_machine_state())

        after = restored.apply({"type": "mark_contradicted", "value": "receipt:1"})
        self.assertEqual("HOLD", after.aggregate_status)
        self.assert_incremental_matches_full(restored)

    def test_tampered_checkpoint_is_rejected(self):
        live = self.make_live()
        checkpoint = live.checkpoint()
        checkpoint["machine_state"]["risk"] = "severe"
        with self.assertRaises(CheckpointIntegrityError):
            ContinuousRootState.restore(self.bundle, checkpoint)

    def test_changed_root_bundle_is_rejected_at_start(self):
        changed = copy.deepcopy(self.bundle)
        changed["roots"][0]["meaning"] = "silently changed"
        with self.assertRaises(RootIntegrityError):
            ContinuousRootState(
                changed,
                expected_root_digest=EXPECTED_ROOT_DIGEST,
            )

    def test_live_root_tampering_is_detected_before_next_event(self):
        live = self.make_live()
        before = live.sequence
        live._root_bundle["roots"][0]["meaning"] = "tampered during runtime"
        with self.assertRaises(RootIntegrityError):
            live.apply({"type": "set_recovery", "value": True})
        self.assertEqual(before, live.sequence)

    def test_full_recompute_catches_planted_dependency_omission(self):
        live = self.make_live(verify_every=1)
        before = live.snapshot()
        original = EVENT_ROOTS["require_permission"]
        EVENT_ROOTS["require_permission"] = set()
        try:
            with self.assertRaises(IncrementalDriftError):
                live.apply({"type": "require_permission", "value": "world.write"})
        finally:
            EVENT_ROOTS["require_permission"] = original
        self.assertEqual(before, live.snapshot())

    def test_unknown_event_rolls_back_transactionally(self):
        live = self.make_live()
        before = live.snapshot()
        with self.assertRaises(ValueError):
            live.apply({"type": "invented-event", "value": "x"})
        self.assertEqual(before, live.snapshot())


if __name__ == "__main__":
    unittest.main()
