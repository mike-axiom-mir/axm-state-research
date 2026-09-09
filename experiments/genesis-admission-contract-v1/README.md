# Genesis admission contract v1

This bounded experiment turns the merged `RESEARCH/GENESIS_STATE_MACHINE_WEB.md` proposal into an executable software contract.

The research says Genesis should be an **admission ceremony** rather than a magical creation event:

`UNFORMED -> CONFIGURED -> INSTANTIATED -> CANDIDATE -> VALIDATED -> GENESIS -> ACTIVE`

with explicit failure states for rejected candidates and failed commits.

## What is authoritative here

- Pre-genesis receipts are evidence about an admission attempt. They are **not canonical history**.
- A `g0:<lineage>:<sha256>` identity appears only after a candidate passes validation and the caller supplies explicit durable commit evidence.
- The Genesis evidence bundle binds rule version, executable hashes, platform assumptions, source/provenance input, identities/roles, initial configuration, randomness/time semantics, exact candidate state, validation results, admitting authority, and commit evidence.
- Once committed, the same machine instance cannot silently reconfigure or replace its Genesis candidate. A corrected Genesis needs a new named lineage or a separately versioned future contract.

`verify_bundle()` is verification-only. A `PASS` proves internal deterministic integrity of this software fixture; it does not grant merge, CANON, deployment, consensus, or social authority.

## Run

```bash
cd experiments/genesis-admission-contract-v1
python3 -m py_compile genesis_admission.py test_genesis_admission.py run_probe.py
python3 -m unittest -v
python3 run_probe.py
```

## Boundaries

This is a deterministic single-process Python experiment. `commit_evidence={"durable": true}` is a declared fixture input, not a real `fsync`, replicated-log, quorum, hardware, firmware, or storage durability measurement. SHA-256 binds exact content but does not prove authorship or the external truth of the evidence. No network, AI/model, account, cloud, or paid service is used.
