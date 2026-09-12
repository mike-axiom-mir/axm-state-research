import unittest

from build_genesis_observer import PHASE_ORDER, build_html, build_story
from genesis_admission import canonical_bytes


class GenesisObserverExperienceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.story = build_story()
        cls.frames = cls.story["frames"]

    def test_story_uses_the_real_seven_phase_admission_chain(self):
        self.assertEqual([frame["phase"] for frame in self.frames], PHASE_ORDER)
        self.assertEqual([frame["receipt_count"] for frame in self.frames], list(range(7)))

    def test_pre_genesis_frames_never_claim_a_canonical_identity(self):
        for frame in self.frames[:5]:
            self.assertEqual(frame["zone"], "PRE-GENESIS EVIDENCE")
            self.assertEqual(frame["canonical_status"], "NOT ISSUED")
            self.assertIsNone(frame["canonical_id"])
            self.assertIsNone(frame["preparation_id"])

    def test_genesis_frame_exposes_real_local_fsync_evidence_without_widening_authority(self):
        genesis = self.frames[5]
        self.assertEqual(genesis["phase"], "GENESIS")
        self.assertTrue(genesis["canonical_id"].startswith("g0:observer-lineage:"))
        self.assertTrue(genesis["preparation_id"].startswith("prep:"))
        self.assertGreater(genesis["prepared_bytes"], 0)
        self.assertIs(genesis["file_fsync_observed"], True)
        self.assertIs(genesis["directory_fsync_observed"], True)
        self.assertEqual(genesis["local_verification"]["status"], "PASS")
        self.assertEqual(
            genesis["local_verification"]["authority"],
            "EVIDENCE_ONLY_NO_MERGE_NO_CANON",
        )

    def test_activation_preserves_the_same_g0_identity(self):
        self.assertEqual(self.frames[5]["canonical_id"], self.frames[6]["canonical_id"])
        self.assertEqual(self.frames[6]["canonical_status"], "ACTIVE CANONICAL")
        self.assertEqual(self.frames[6]["transition"], "GENESIS → ACTIVE")

    def test_story_is_deterministic_across_fresh_local_stores(self):
        second = build_story()
        self.assertEqual(canonical_bytes(self.story), canonical_bytes(second))

    def test_generated_surface_keeps_truth_boundaries_and_accessible_controls(self):
        rendered = build_html(self.story)
        self.assertIn("Display ≠ authority", rendered)
        self.assertIn("Pre-genesis ≠ canon", rendered)
        self.assertIn("FSYNC", rendered.upper())
        self.assertIn('aria-label="Genesis admission phases"', rendered)
        self.assertEqual(rendered.count('data-phase-index="'), 7)
        self.assertIn('aria-live="polite"', rendered)
        self.assertNotIn("https://", rendered)
        self.assertNotIn("http://", rendered)


if __name__ == "__main__":
    unittest.main()
