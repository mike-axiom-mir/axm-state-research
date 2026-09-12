import copy
import unittest

from genesis_admission import AdmissionError, GenesisAdmissionMachine, digest, verify_bundle


def build_valid(lineage="demo"):
    machine = GenesisAdmissionMachine(lineage)
    machine.configure(
        rule_version="rules/1",
        executable_hashes={"engine": "sha256:abc"},
        platform_assumptions={"clock": "monotonic-local"},
    )
    machine.instantiate(
        source_inputs={"allocations": {"alpha": 3}, "provenance": "fixture:v1"},
        identities={"admitter": "operator:test", "roles": ["validator"]},
        initial_configuration={"mode": "offline"},
        randomness={"kind": "fixed", "seed": 7},
        timestamp_semantics="logical-only",
    )
    machine.propose({"members": ["alpha"], "balance": 3})
    machine.validate([
        {"name": "balance_nonnegative", "passed": True, "evidence": {"balance": 3}},
        {"name": "member_present", "passed": True, "evidence": {"member": "alpha"}},
    ])
    return machine


class GenesisAdmissionContractTests(unittest.TestCase):
    def test_g0_does_not_exist_before_durable_commit(self):
        machine = build_valid()
        self.assertEqual(machine.phase, "VALIDATED")
        self.assertIsNone(machine.genesis)

        machine.commit(admitted_by="operator:test", commit_evidence={"durable": False, "journal": "not-flushed"})
        self.assertEqual(machine.phase, "COMMIT_FAILED")
        self.assertIsNone(machine.genesis)

        machine.retry_commit(admitted_by="operator:test", commit_evidence={"durable": True, "journal": "fsync-ok"})
        self.assertEqual(machine.phase, "GENESIS")
        self.assertTrue(machine.genesis.canonical_id.startswith("g0:demo:"))

    def test_rejected_candidate_is_receipted_but_never_canonical(self):
        machine = GenesisAdmissionMachine("reject-demo")
        machine.configure(rule_version="rules/1", executable_hashes={"engine": "sha256:abc"}, platform_assumptions={})
        machine.instantiate(
            source_inputs={"provenance": "fixture:v1"}, identities={"admitter": "operator:test"},
            initial_configuration={}, randomness={"kind": "none"}, timestamp_semantics="logical-only"
        )
        machine.propose({"balance": -1})
        machine.validate([{"name": "balance_nonnegative", "passed": False, "evidence": {"balance": -1}}])

        self.assertEqual(machine.phase, "REJECTED")
        self.assertIsNone(machine.genesis)
        self.assertEqual(machine.receipts[-1]["to"], "REJECTED")

    def test_same_evidence_produces_same_g0_identity_and_changed_evidence_does_not(self):
        left = build_valid("stable")
        right = build_valid("stable")
        left.commit(admitted_by="operator:test", commit_evidence={"durable": True, "journal": "fsync-ok"})
        right.commit(admitted_by="operator:test", commit_evidence={"journal": "fsync-ok", "durable": True})
        self.assertEqual(left.genesis.canonical_id, right.genesis.canonical_id)

        changed = build_valid("stable")
        changed.commit(admitted_by="operator:test", commit_evidence={"durable": True, "journal": "replica-ack"})
        self.assertNotEqual(left.genesis.canonical_id, changed.genesis.canonical_id)

    def test_committed_genesis_cannot_be_silently_reconfigured_or_reproposed(self):
        machine = build_valid()
        machine.commit(admitted_by="operator:test", commit_evidence={"durable": True})
        original_id = machine.genesis.canonical_id

        with self.assertRaises(AdmissionError):
            machine.propose({"members": ["beta"], "balance": 9})
        with self.assertRaises(AdmissionError):
            machine.configure(rule_version="rules/2", executable_hashes={"engine": "sha256:def"}, platform_assumptions={})
        self.assertEqual(machine.genesis.canonical_id, original_id)

    def test_detached_bundle_detects_receipt_and_genesis_tampering(self):
        machine = build_valid()
        machine.commit(admitted_by="operator:test", commit_evidence={"durable": True, "journal": "fsync-ok"})
        machine.activate()
        bundle = machine.export_receipt_bundle()
        self.assertEqual(verify_bundle(bundle)["status"], "PASS")

        receipt_tamper = copy.deepcopy(bundle)
        receipt_tamper["pre_genesis_receipts"][1]["to"] = "CANDIDATE"
        self.assertEqual(verify_bundle(receipt_tamper)["status"], "HOLD")

        evidence_tamper = copy.deepcopy(bundle)
        evidence_tamper["genesis"]["evidence"]["rule_version"] = "rules/999"
        self.assertEqual(verify_bundle(evidence_tamper)["status"], "HOLD")

    def test_resealed_illegal_phase_chain_and_internal_digest_drift_hold(self):
        machine = build_valid()
        machine.commit(admitted_by="operator:test", commit_evidence={"durable": True, "journal": "fsync-ok"})
        bundle = machine.export_receipt_bundle()

        illegal = copy.deepcopy(bundle)
        first = illegal["pre_genesis_receipts"][0]
        first["to"] = "VALIDATED"
        body = {key: value for key, value in first.items() if key != "receipt_digest"}
        first["receipt_digest"] = digest(body)
        second = illegal["pre_genesis_receipts"][1]
        second["from"] = "VALIDATED"
        second_body = {key: value for key, value in second.items() if key != "receipt_digest"}
        second["receipt_digest"] = digest(second_body)
        self.assertEqual(verify_bundle(illegal)["status"], "HOLD")

        internal = copy.deepcopy(bundle)
        internal["genesis"]["evidence"]["candidate_digest"] = "0" * 64
        internal["genesis"]["evidence_digest"] = digest(internal["genesis"]["evidence"])
        internal["genesis"]["canonical_id"] = f"g0:demo:{internal['genesis']['evidence_digest']}"
        self.assertEqual(verify_bundle(internal)["status"], "HOLD")

    def test_non_portable_numeric_state_fails_closed(self):
        machine = GenesisAdmissionMachine("portable")
        with self.assertRaises(AdmissionError):
            machine.configure(
                rule_version="rules/1",
                executable_hashes={"engine": "sha256:abc"},
                platform_assumptions={"temperature": float("nan")},
            )

    def test_pre_genesis_bundle_can_be_verified_without_promoting_it(self):
        machine = build_valid()
        result = verify_bundle(machine.export_receipt_bundle())
        self.assertEqual(result, {"status": "PASS", "lineage": "demo", "phase": "VALIDATED", "canonical_id": None})


if __name__ == "__main__":
    unittest.main()
