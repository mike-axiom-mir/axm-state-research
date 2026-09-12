# Lane receipt — Stateborn fresh-process checkpoint verification

- Date: 2026-09-11
- Chat lane: AXM Truth, Verification & Resilience Sentinel
- Branch: `ai/stateborn-checkpoint-process-verifier-2026-09-11`
- Exact prerequisite: PR #19 head `8f121cbcea12a68904ead3042897e7d3f49124b0`
- Upstream dependency retained by PR #19: PR #9 head `686201db2a17d343fc5e63123a93bb3f03d343ee`
- Intended pull request base: `main`, per repository governance
- Merge / CANON authority: human only
- Handoff state: HOLD / draft / unmerged / not CANON

## Bounded objective

Close one evidence gap left explicit by PR #19: checkpoint v2 had been shown to
reconstruct after discarding the live engine object inside one process, but the
checkpoint had not been demonstrated to verify from serialized bytes in a
fresh process that cannot access that engine object.

This lane adds detached verification only. It does not implement automatic
transport resume, durable checkpoint persistence, a complete transport-session
snapshot, peer routing, merge, release, or CANON authority.

## Coordination / non-overlap

Before claim, current State Research PRs, visible branches, recent work, and
checkpoint/process-restart semantics were rescanned. PR #19 owns checkpoint
replay/recovery correctness. The unpublished
`ai/stateborn-clean-runner-evidence-2026-09-10` branch was also found and
inspected before writing: it owns hosted clean-runner evidence only and
explicitly leaves process-level restart outside its claim. PR #17 owns
presentation. PR #18/#20/#21 own Genesis admission/fsync/observer work. No
fresh-process Stateborn checkpoint-verifier lane existed.

`axm-index` was checked as supplemental coordination evidence. It exposes no
trusted `current` coordination snapshot that overrides live GitHub, so live
GitHub remains the operative coordination truth.

## Preserved red evidence

Regression-only/workflow head:
`6fb31b2cc5e978fb9d1b48a3e8e5f42f6ff236d5`.

GitHub Actions run `34586012358`: **FAILURE** on Node 20 and Node 22.

In both jobs checkout, the exact-authored-source/prerequisite-ancestry check,
Node setup, and syntax checks passed. The focused fresh-process checkpoint
regression then failed before the detached verifier existed. The complete
Stateborn suite, static validation, retained probes, and byte-for-byte retained
transport-evidence check were skipped after that red gate and are not claimed
for the red checkpoint.

## Change

- add `dist/state-transport-checkpoint.js`, a detached verifier for PR #19's v2
  checkpoint evidence;
- reconstruct a fresh `StateLanguageTrial` only from checkpoint-owned receipt
  bodies and the frozen fixture identity;
- verify outer checkpoint digest, schema/fixture binding, receipt ID binding,
  replay identity, reconstructed engine-state digest, and source digests;
- emit deterministic PASS/HOLD verification receipts whose authority explicitly
  excludes automatic resume, transport mutation, canonical-state mutation,
  merge, and CANON;
- add `tools/verify-state-transport-checkpoint.mjs`, a dependency-free bounded
  stdin process adapter with a 1 MiB input ceiling and fatal UTF-8 decode;
- add a real child-process regression proving that the serialized checkpoint
  verifies identically in a fresh Node process;
- add a second child-process regression proving that changing a receipt body and
  recomputing only the outer checkpoint digest is rejected by replay;
- add a branch-triggered Node 20/22 workflow so this stacked lane receives
  hosted evidence even though the prerequisite workflow is not on `main`.

No historical sealed ZIP is rewritten. No v0.7 fixture, packet schema, transport
schedule, state-language semantics, replay barrier, or runtime recovery path is
changed by this lane.

## Green evidence before documentation checkpoint

Exact functional head: `0297edee9416216ec57bb8682fb97db1a23d8f4b`.

GitHub Actions run `34586168799`: **SUCCESS** on Node 20 and Node 22.

Both jobs passed:

- exact authored source identity and ancestry of PR #19 exact head;
- syntax checks;
- **2/2 focused fresh-process checkpoint regressions**;
- complete Stateborn `npm test` suite, including the inherited recovery tests;
- offline static validation;
- capsule, state-language, and hostile-transport probes; and
- byte-for-byte reproduction of retained `results/raw/state_transport_probe.json`.

The final documentation/receipt head receives the same branch-triggered gate;
its exact hosted result is reported on the pull request instead of recursively
editing this receipt after every evidence-only commit.

No benchmark or performance measurement was run or claimed.

## Truth boundary / limitations

This proves detached reconstruction/verification of PR #19's checkpoint-owned
state-language evidence across a fresh Node process on the tested hosted Linux
Node 20/22 paths. It is not a full process-resume implementation. Checkpoint v2
does not contain the complete transport tick, queue, retry counters, event
ledger, or every live transport field, and this verifier deliberately has no
authority to publish a recovered runtime or continue transport.

The process adapter's 1 MiB ceiling is an admission policy for this verifier,
not a measured optimal checkpoint size. The adapter does not claim duplicate
JSON-member rejection or producer authentication. SHA-256 and deterministic
replay prove content/reconstruction relationships, not authorship or external
truth. Windows/macOS, durable storage, crash/power-loss behavior, concurrent
writers, hostile peers, real networking, and distributed recovery remain
untested.
