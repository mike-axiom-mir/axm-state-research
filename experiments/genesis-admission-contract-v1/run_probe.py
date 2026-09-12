import json
from genesis_admission import GenesisAdmissionMachine, verify_bundle

m = GenesisAdmissionMachine("probe-lineage")
m.configure(
    rule_version="rules/1",
    executable_hashes={"engine": "sha256:fixture-engine"},
    platform_assumptions={"execution": "single-process deterministic fixture"},
)
m.instantiate(
    source_inputs={"allocations": {"alpha": 3}, "provenance": "probe-fixture/v1"},
    identities={"admitter": "operator:probe", "roles": ["validator"]},
    initial_configuration={"network": "offline"},
    randomness={"kind": "fixed", "seed": 7},
    timestamp_semantics="logical-only",
)
m.propose({"members": ["alpha"], "balance": 3})
m.validate([
    {"name": "balance_nonnegative", "passed": True, "evidence": {"balance": 3}},
    {"name": "member_present", "passed": True, "evidence": {"member": "alpha"}},
])
pre = verify_bundle(m.export_receipt_bundle())
m.commit(admitted_by="operator:probe", commit_evidence={"durable": True, "method": "fixture-commit"})
m.activate()
post = verify_bundle(m.export_receipt_bundle())
print(json.dumps({
    "schema": "axm.genesis-admission-probe/v1",
    "pre_commit": pre,
    "post_commit": post,
    "receipt_count": len(m.receipts),
    "claim_boundary": "software fixture only; no hardware, consensus, authorship, durability, or CANON claim",
}, sort_keys=True, indent=2))
