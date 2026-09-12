from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "generate_research_index.py"
SPEC = importlib.util.spec_from_file_location("generate_research_index", MODULE_PATH)
assert SPEC and SPEC.loader
INDEXER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INDEXER)


class ResearchIndexTests(unittest.TestCase):
    def test_committed_index_matches_repository_sources(self):
        stale = INDEXER.check_outputs(ROOT, ROOT / "registry")
        self.assertEqual([], stale)

    def test_generation_is_deterministic_and_source_bound(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp)
            (repo / "research").mkdir()
            source = repo / "research" / "2026-09-09-small-proof.md"
            source.write_text("# Small proof\nbody\n", "utf-8")

            first = INDEXER.build_outputs(repo)
            second = INDEXER.build_outputs(repo)
            self.assertEqual(first, second)

            row = json.loads(first["research-sources.jsonl"])
            raw = source.read_bytes()
            expected_blob = hashlib.sha1(
                f"blob {len(raw)}\0".encode("ascii") + raw
            ).hexdigest()
            self.assertEqual("2026-09-09", row["source_date"])
            self.assertEqual("research-note", row["source_class"])
            self.assertEqual(expected_blob, row["git_blob_sha1"])
            self.assertEqual("SOURCE_DISCOVERY_ONLY", row["authority"])

            source.write_text("# Small proof\nchanged\n", "utf-8")
            changed = INDEXER.build_outputs(repo)
            self.assertNotEqual(first["research-sources.jsonl"], changed["research-sources.jsonl"])
            self.assertNotEqual(
                json.loads(first["research-sources.receipt.json"])["records_sha256"],
                json.loads(changed["research-sources.receipt.json"])["records_sha256"],
            )

    def test_only_bounded_source_roots_are_indexed(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp)
            (repo / "research").mkdir()
            (repo / "research" / "inside.md").write_text("inside", "utf-8")
            (repo / "README.md").write_text("outside", "utf-8")
            (repo / "tests").mkdir()
            (repo / "tests" / "outside.md").write_text("outside", "utf-8")

            rows = INDEXER.build_records(repo)
            self.assertEqual(["research/inside.md"], [row["source_path"] for row in rows])

    def test_symlink_source_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp)
            (repo / "research").mkdir()
            target = repo / "outside.md"
            target.write_text("outside", "utf-8")
            link = repo / "research" / "linked.md"
            try:
                link.symlink_to(target)
            except OSError as exc:
                self.skipTest(f"symlink unavailable: {exc}")
            with self.assertRaisesRegex(ValueError, "symlink"):
                INDEXER.build_records(repo)

    def test_capability_declaration_stays_non_authoritative(self):
        outputs = INDEXER.build_outputs(ROOT)
        capability = json.loads(outputs["capabilities.jsonl"])
        self.assertEqual("axm.public-capability/v1", capability["schema"])
        self.assertEqual("axm.state-research.source-index/v1", capability["id"])
        self.assertEqual(["axm-state-research"], capability["providers"])
        self.assertFalse(capability["truth"]["declaration_is_runtime_proof"])
        self.assertFalse(capability["truth"]["grants_authority"])


if __name__ == "__main__":
    unittest.main()
