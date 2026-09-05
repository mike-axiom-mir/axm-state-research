# Lane Receipt — State Research Import

```text
date: 2026-09-02 UTC
branch: ai/state-research-import-2026-09-02
base: main@b41efd033baf291809d00bdc9b1f48f314bc04dd
chat lanes claimed: 1
pull requests allowed for this chat: 1
merge authority: human maintainer
status: pull request open; human merge pending
pull request: https://github.com/mike-axiom-mir/axm-state-research/pull/3
```

## Bounded scope

Import the two completed AXM state-runtime experiments and their sealed standalone archives, establish a cross-experiment research index and honest claim boundaries, wire Sentinel to the canonical sibling State Floor source, add continuous tests, and codify one AI chat instance per PR lane.

## Included

- AXM State Floor v0.1.0 source, tests, reports, raw results, receipts, and pre-cache failure evidence.
- AXM Workfloor Sentinel v0.1.0 source, tests, reports, defective and repaired receipts, and raw results.
- Both unchanged standalone ZIP artifacts.
- Root governance, research map, claim boundaries, import receipt, and CI.

## Source verification

```text
AXM_State_Floor_v0.1.0.zip
SHA-256 bbdeefe7cecc79bd9096d7c9db6a2462833b1319ec8e350eef2bb121a0b7854d
source tests before import: 8/8 PASS

AXM_Workfloor_Sentinel_v0.1.0.zip
SHA-256 eb2dafc8db088e5d2073b8133672b44c862fd26bb2926ad99e886e11f0704c84
source tests before import: 6/6 PASS
```

## Repository verification

```text
experiments/01-state-floor: 8/8 PASS
experiments/02-workfloor-sentinel: 6/6 PASS
archive hashes: MATCH
git diff --check: PASS
GitHub Actions run 1: PASS
```

The lane is open as pull request #3. This receipt must be amended if the lane is handed off or verification later fails.
