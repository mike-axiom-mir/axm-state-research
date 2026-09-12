from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

import experiment
import portable


class PortableReferenceStateClosureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def build(self, name: str) -> Path:
        path = self.root / name
        receipt = portable.build_portable(path)
        self.assertEqual(receipt["result"], "PASS")
        self.assertFalse(receipt["authority"]["automatic_execution"])
        return path

    def run_external(self, artifact: Path, *args: str) -> subprocess.CompletedProcess[str]:
        consumer = self.root / "consumer"
        consumer.mkdir(exist_ok=True)
        copied = consumer / "reference-state-closure.pyz"
        shutil.copyfile(artifact, copied)
        env = os.environ.copy()
        env.pop("PYTHONPATH", None)
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        return subprocess.run(
            [sys.executable, str(copied), *args],
            cwd=consumer,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def rewrite(self, source: Path, target: Path, replacements: dict[str, bytes]) -> None:
        with zipfile.ZipFile(source, "r") as archive:
            bodies = {name: archive.read(name) for name in archive.namelist()}
        bodies.update(replacements)
        with zipfile.ZipFile(target, "w", allowZip64=False) as archive:
            for name in sorted(bodies):
                archive.writestr(portable._zip_info(name), bodies[name])

    def test_build_is_byte_deterministic_and_provider_bound(self) -> None:
        first = self.build("a.pyz")
        second = self.build("b.pyz")
        self.assertEqual(first.read_bytes(), second.read_bytes())
        receipt = portable.verify_portable(first)
        self.assertEqual(receipt["artifact_sha256"], hashlib.sha256(first.read_bytes()).hexdigest())
        self.assertEqual(
            receipt["provider_members"]["experiment.py"]["sha256"],
            hashlib.sha256(portable.EXPERIMENT_PATH.read_bytes()).hexdigest(),
        )
        self.assertEqual(
            receipt["provider_members"]["fixture.json"]["sha256"],
            hashlib.sha256(portable.FIXTURE_PATH.read_bytes()).hexdigest(),
        )

    def test_clean_external_run_matches_direct_provider_report(self) -> None:
        artifact = self.build("runner.pyz")
        process = self.run_external(artifact, "run")
        self.assertEqual(process.returncode, 0, process.stderr)
        observed = json.loads(process.stdout)
        expected = experiment.run_experiment(experiment.load_fixture())
        self.assertEqual(observed, expected)
        self.assertEqual(observed["status"], "PASS")

    def test_external_verify_and_describe_preserve_no_authority_boundary(self) -> None:
        artifact = self.build("runner.pyz")
        verified = self.run_external(artifact, "verify")
        self.assertEqual(verified.returncode, 0, verified.stderr)
        receipt = json.loads(verified.stdout)
        self.assertEqual(receipt["result"], "PASS")
        self.assertEqual(receipt["artifact_sha256"], hashlib.sha256(artifact.read_bytes()).hexdigest())
        self.assertTrue(all(value is False for value in receipt["authority"].values()))

        described = self.run_external(artifact, "describe")
        self.assertEqual(described.returncode, 0, described.stderr)
        descriptor = json.loads(described.stdout)
        self.assertEqual(descriptor["capability_id"], portable.CAPABILITY_ID)
        self.assertEqual(descriptor["runtime"]["third_party_dependencies"], [])
        self.assertFalse(descriptor["runtime"]["network_required"])

    def test_tampered_member_fails_standalone_verification(self) -> None:
        artifact = self.build("runner.pyz")
        tampered = self.root / "tampered.pyz"
        changed = b"raise SystemExit(99)\n"
        self.rewrite(artifact, tampered, {"experiment.py": changed})
        process = self.run_external(tampered, "verify")
        self.assertEqual(process.returncode, 2)
        self.assertEqual(json.loads(process.stderr.strip().splitlines()[-1])["result"], "HOLD")

    def test_resealed_source_drift_needs_provider_anchor(self) -> None:
        artifact = self.build("runner.pyz")
        with zipfile.ZipFile(artifact, "r") as archive:
            metadata = json.loads(archive.read(portable.METADATA_NAME))
        changed = portable.EXPERIMENT_PATH.read_bytes() + b"\n# self-consistent substitute\n"
        metadata["members"]["experiment.py"] = {
            "bytes": len(changed),
            "sha256": hashlib.sha256(changed).hexdigest(),
        }
        resealed = self.root / "resealed.pyz"
        self.rewrite(
            artifact,
            resealed,
            {
                "experiment.py": changed,
                portable.METADATA_NAME: portable.canonical_bytes(metadata),
            },
        )

        standalone = self.run_external(resealed, "verify")
        self.assertEqual(standalone.returncode, 0, standalone.stderr)
        with self.assertRaisesRegex(ValueError, "current provider source"):
            portable.verify_portable(resealed)

    def test_unexpected_archive_member_fails_closed(self) -> None:
        artifact = self.build("runner.pyz")
        widened = self.root / "widened.pyz"
        self.rewrite(artifact, widened, {"unexpected.txt": b"not admitted\n"})
        process = self.run_external(widened, "verify")
        self.assertEqual(process.returncode, 2)
        self.assertIn("unexpected archive member set", json.loads(process.stderr.strip().splitlines()[-1])["error"])


if __name__ == "__main__":
    unittest.main()
