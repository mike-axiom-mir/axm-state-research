import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

from genesis_admission import GenesisAdmissionMachine, canonical_bytes, digest, verify_bundle
from local_commit_store import (
    AUTHORITY,
    LOCAL_EVIDENCE_SCHEMA,
    LocalCommitStoreError,
    LocalGenesisCommitStore,
    commit_with_local_store,
    verify_local_genesis_bundle,
)


def build_valid(lineage="durable-demo"):
    machine = GenesisAdmissionMachine(lineage)
    machine.configure(
        rule_version="rules/1",
        executable_hashes={"engine": "sha256:abc"},
        platform_assumptions={"filesystem": "local"},
    )
    machine.instantiate(
        source_inputs={"provenance": "fixture:v1"},
        identities={"admitter": "operator:test"},
        initial_configuration={"mode": "offline"},
        randomness={"kind": "fixed", "seed": 7},
        timestamp_semantics="logical-only",
    )
    machine.propose({"members": ["alpha"], "balance": 3})
    machine.validate([
        {"name": "balance_nonnegative", "passed": True, "evidence": {"balance": 3}},
    ])
    return machine


class LocalGenesisCommitStoreTests(unittest.TestCase):
    def test_fsync_evidence_precedes_g0_and_verifies_after_activation(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid()
            store = LocalGenesisCommitStore(tmp)

            self.assertEqual(machine.phase, "VALIDATED")
            self.assertIsNone(machine.genesis)
            commit_with_local_store(machine, store, admitted_by="operator:test")
            self.assertEqual(machine.phase, "GENESIS")
            self.assertIsNotNone(machine.genesis)

            commit_evidence = machine.genesis.evidence["commit_evidence"]
            self.assertEqual(commit_evidence["schema"], LOCAL_EVIDENCE_SCHEMA)
            self.assertTrue(commit_evidence["durable"])
            self.assertTrue(commit_evidence["storage"]["file_fsync_observed"])
            self.assertTrue(commit_evidence["storage"]["directory_fsync_observed"])
            self.assertEqual(commit_evidence["authority"], AUTHORITY)

            machine.activate()
            bundle = machine.export_receipt_bundle()
            self.assertEqual(verify_bundle(bundle)["status"], "PASS")
            verdict = verify_local_genesis_bundle(bundle, store)
            self.assertEqual(verdict["status"], "PASS")
            self.assertEqual(verdict["canonical_id"], machine.genesis.canonical_id)

    def test_fsync_failure_returns_no_commit_evidence_and_g0_does_not_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("fsync-failure")
            store = LocalGenesisCommitStore(tmp)

            with mock.patch("local_commit_store.os.fsync", side_effect=OSError("forced fsync failure")):
                with self.assertRaises(LocalCommitStoreError):
                    commit_with_local_store(machine, store, admitted_by="operator:test")

            self.assertEqual(machine.phase, "VALIDATED")
            self.assertIsNone(machine.genesis)
            prepared = Path(tmp) / "prepared"
            if prepared.exists():
                self.assertEqual(list(prepared.glob("*.json")), [])

    def test_exact_prepared_admission_survives_fresh_python_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("restart")
            store = LocalGenesisCommitStore(tmp)
            before = machine.export_receipt_bundle()
            evidence = store.persist_validated_admission(before, admitted_by="operator:test")

            script = (
                "import json,sys;"
                "from local_commit_store import LocalGenesisCommitStore;"
                "store=LocalGenesisCommitStore(sys.argv[1]);"
                "value=store.load_prepared(sys.argv[2]);"
                "print(json.dumps(value,sort_keys=True,separators=(',',':')))"
            )
            run = subprocess.run(
                [sys.executable, "-c", script, tmp, evidence["preparation_id"]],
                cwd=Path(__file__).resolve().parent,
                check=True,
                capture_output=True,
                text=True,
            )
            reloaded = json.loads(run.stdout)
            self.assertEqual(canonical_bytes(reloaded["validated_bundle"]), canonical_bytes(before))
            self.assertEqual(reloaded["admitted_by"], "operator:test")

    def test_same_preparation_is_idempotent_but_admitting_identity_changes_content_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("idempotent")
            store = LocalGenesisCommitStore(tmp)
            before = machine.export_receipt_bundle()

            first = store.persist_validated_admission(before, admitted_by="operator:test")
            second = store.persist_validated_admission(before, admitted_by="operator:test")
            other = store.persist_validated_admission(before, admitted_by="operator:other")

            self.assertEqual(first["preparation_id"], second["preparation_id"])
            self.assertFalse(first["storage"]["reused_existing"])
            self.assertTrue(second["storage"]["reused_existing"])
            self.assertNotEqual(first["preparation_id"], other["preparation_id"])

    def test_corrupt_existing_content_address_is_preserved_and_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("corrupt")
            store = LocalGenesisCommitStore(tmp)
            before = machine.export_receipt_bundle()
            evidence = store.persist_validated_admission(before, admitted_by="operator:test")
            path = Path(tmp) / "prepared" / f"{evidence['prepared_sha256']}.json"
            path.write_bytes(b'{"corrupt":true}')
            corrupted = path.read_bytes()

            with self.assertRaises(LocalCommitStoreError):
                store.persist_validated_admission(before, admitted_by="operator:test")
            self.assertEqual(path.read_bytes(), corrupted)
            self.assertEqual(
                store.verify_commit_evidence(evidence, expected_bundle=before)["status"],
                "HOLD",
            )

    def test_local_verifier_binds_final_genesis_to_prepared_causal_receipts(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("causal")
            store = LocalGenesisCommitStore(tmp)
            commit_with_local_store(machine, store, admitted_by="operator:test")
            machine.activate()
            original = machine.export_receipt_bundle()
            self.assertEqual(verify_local_genesis_bundle(original, store)["status"], "PASS")

            tampered = copy.deepcopy(original)
            genesis_evidence = tampered["genesis"]["evidence"]
            genesis_evidence["initial_configuration"] = {"mode": "online"}
            genesis_evidence["candidate_digest"] = digest(genesis_evidence["candidate_state"])
            genesis_evidence["validation_digest"] = digest(genesis_evidence["validation"])
            new_evidence_digest = digest(genesis_evidence)
            new_id = f"g0:causal:{new_evidence_digest}"
            tampered["genesis"]["evidence_digest"] = new_evidence_digest
            tampered["genesis"]["canonical_id"] = new_id

            for receipt in tampered["pre_genesis_receipts"]:
                if receipt["to"] == "GENESIS":
                    receipt["evidence"]["canonical_id"] = new_id
                    receipt["evidence"]["evidence_digest"] = new_evidence_digest
                    body = {key: value for key, value in receipt.items() if key != "receipt_digest"}
                    receipt["receipt_digest"] = digest(body)
                elif receipt["to"] == "ACTIVE":
                    receipt["evidence"]["canonical_id"] = new_id
                    body = {key: value for key, value in receipt.items() if key != "receipt_digest"}
                    receipt["receipt_digest"] = digest(body)

            # The generic v1 verifier checks internal re-sealing but has no persisted
            # pre-commit artifact to compare with.
            self.assertEqual(verify_bundle(tampered)["status"], "PASS")
            local = verify_local_genesis_bundle(tampered, store)
            self.assertEqual(local["status"], "HOLD")
            self.assertIn("INSTANTIATED", local["reason"])

    def test_noncanonical_and_oversized_prepared_artifacts_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            machine = build_valid("bounded")
            before = machine.export_receipt_bundle()
            with self.assertRaises(LocalCommitStoreError):
                LocalGenesisCommitStore(tmp, max_bytes=64).persist_validated_admission(
                    before, admitted_by="operator:test"
                )

            store = LocalGenesisCommitStore(tmp)
            evidence = store.persist_validated_admission(before, admitted_by="operator:test")
            path = Path(tmp) / "prepared" / f"{evidence['prepared_sha256']}.json"
            parsed = json.loads(path.read_text(encoding="utf-8"))
            path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
            self.assertEqual(store.verify_commit_evidence(evidence)["status"], "HOLD")

    def test_unvalidated_or_already_canonical_bundle_cannot_be_persisted_as_precommit_truth(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = LocalGenesisCommitStore(tmp)
            incomplete = GenesisAdmissionMachine("incomplete")
            incomplete.configure(
                rule_version="rules/1",
                executable_hashes={"engine": "sha256:abc"},
                platform_assumptions={},
            )
            with self.assertRaises(LocalCommitStoreError):
                store.persist_validated_admission(
                    incomplete.export_receipt_bundle(), admitted_by="operator:test"
                )

            complete = build_valid("already-committed")
            complete.commit(admitted_by="operator:test", commit_evidence={"durable": True})
            with self.assertRaises(LocalCommitStoreError):
                store.persist_validated_admission(
                    complete.export_receipt_bundle(), admitted_by="operator:test"
                )


if __name__ == "__main__":
    unittest.main()
