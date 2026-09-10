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

## Local fsync evidence provider

`local_commit_store.py` is a bounded provider for the previously abstract `commit_evidence` input. It keeps the state machine generic while giving local/offline callers one directly invokable evidence path:

1. verify the exact pre-genesis bundle is still in `VALIDATED`;
2. combine that bundle with the admitting identity;
3. encode it as strict canonical JSON and bind it to `prep:<sha256>`;
4. publish it to a content-addressed path with a create-only hard link;
5. return `durable: true` only after this process observed successful file and directory `fsync` calls;
6. pass that bounded evidence back into the existing Genesis admission machine.

There is deliberately no `latest` pointer and no overwrite path. Same-content publication is idempotent; an existing content-address with different bytes is preserved and held instead of silently repaired.

`verify_local_genesis_bundle()` additionally compares a later `GENESIS`/`ACTIVE` bundle with the exact prepared artifact. This binds the final configuration, instance inputs, candidate, validation, and admitting identity back to the evidence that was persisted before G0 appeared. Its authority is `EVIDENCE_ONLY_NO_MERGE_NO_CANON`.

## Run

```bash
cd experiments/genesis-admission-contract-v1
python3 -m py_compile genesis_admission.py local_commit_store.py test_genesis_admission.py test_local_commit_store.py run_probe.py
python3 -m unittest -v
python3 run_probe.py
```

## Boundaries

The generic contract still accepts caller-supplied commit evidence so future storage/consensus providers are not hard-coded to one filesystem implementation. `LocalGenesisCommitStore` proves only that this process observed the local file and directory `fsync` calls before returning its evidence and that the exact prepared artifact survives the tested process restart. It is **not** proof against device/firmware lies, sudden-power-loss loss, hostile raw-filesystem writers, distributed consensus failure, or cryptographic authorship. The create-only hard-link publication path is currently tested on hosted Ubuntu, not Windows/macOS. SHA-256 binds exact content but does not prove external truth. No network, AI/model, account, cloud, or paid service is used.
