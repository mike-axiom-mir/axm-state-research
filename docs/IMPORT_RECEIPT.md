# Import Receipt

## Repository lane

```text
repository: mike-axiom-mir/axm-state-research
base branch: main
base commit: b41efd033baf291809d00bdc9b1f48f314bc04dd
lane branch: ai/state-research-import-2026-09-02
receipt date: 2026-09-02 UTC
```

## Imported artifacts

| Artifact | SHA-256 |
|---|---|
| `AXM_State_Floor_v0.1.0.zip` | `bbdeefe7cecc79bd9096d7c9db6a2462833b1319ec8e350eef2bb121a0b7854d` |
| `AXM_Workfloor_Sentinel_v0.1.0.zip` | `eb2dafc8db088e5d2073b8133672b44c862fd26bb2926ad99e886e11f0704c84` |

The sealed standalone ZIPs are unchanged under `artifacts/`. Readable source trees are under `experiments/`.

The standalone Sentinel ZIP remains self-contained with its embedded State Floor foundation. To avoid a duplicated live source tree in this repository, the readable Sentinel experiment resolves the canonical sibling `experiments/01-state-floor` source.

## Freshness and verification

The source trees and archives were re-observed on 2026-09-02 UTC immediately before import. Archive hashes were recomputed. The imported suites were then run from their required experiment working directories:

```text
cd experiments/01-state-floor
python3 -m unittest discover -s tests -v
result: 8/8 PASS

cd experiments/02-workfloor-sentinel
python3 -m unittest discover -s tests -v
result: 6/6 PASS
```

An earlier verification attempt launched discovery from the parent workspace and failed during import because the packages were not on that working directory's module path. That was a command-location failure, not a test failure. The corrected experiment-root commands above passed and are the commands automated by CI.

## No-loss statement

No failed result or raw evidence was removed from the imported standalone artifacts. The State Floor pre-hash-cache results remain in `experiments/01-state-floor/results/pre_hash_cache/`. Sentinel's defective dependency-map receipts remain beside the repaired receipts. The only repository-layout deduplication is the readable Sentinel copy of its already-sealed embedded State Floor source; the unchanged standalone ZIP preserves that original bundle byte for byte.
