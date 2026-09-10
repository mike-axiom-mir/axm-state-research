# Stateborn clean-runner evidence lane — 2026-09-10

## Lane

- branch: `ai/stateborn-clean-runner-evidence-2026-09-10`
- base / prerequisite: PR #19 exact head `8f121cbcea12a68904ead3042897e7d3f49124b0`
- upstream dependency retained by PR #19: PR #9 exact head `686201db2a17d343fc5e63123a93bb3f03d343ee`
- owner perspective: AXM Truth, Verification & Resilience Sentinel
- handoff state: HOLD / draft / unmerged / not CANON

## Bounded objective

Close one evidence gap left explicit by PR #19: the repaired checkpoint-owned recovery path had complete local evidence, but GitHub reported no hosted workflow run for the exact final PR #19 head. This lane adds clean-runner evidence only. It does not change checkpoint, transport, state-language, game, or recovery semantics.

## Pre-change evidence

- exact PR #19 head: `8f121cbcea12a68904ead3042897e7d3f49124b0`
- GitHub workflow runs observed for that exact head before this lane: `0`
- PR #19 therefore correctly reports hosted CI as `NOT RUN`, not PASS
- the inherited workflow already describes six retained Python experiment jobs plus the Stateborn suite, so this lane does not invent a different product contract; it makes the outstanding exact-head clean-runner boundary repeatable

## Coordination

Immediately before claiming this lane, open State Research PRs, Stateborn branches, and recent default-branch commits were rescanned. PR #19 owns checkpoint replay/recovery correctness; PR #17 owns hostile-transport presentation; PR #18 owns Genesis admission; PR #16 owns research-source discovery; PR #15 owns reference-state closure. No clean-runner / hosted-evidence continuation existed.

A separate candidate in `axm-factual-space-simulator` was abandoned before writing when a fresh rescan revealed new PR #12 already owned the same Git-worktree package-seal defect. That collision is retained here as coordination evidence for why the final target was changed instead of duplicated.

## Change

Add one read-only GitHub Actions workflow that:

1. runs all six retained Python experiment suites on Python 3.12;
2. runs the focused Stateborn hostile-transport recovery suite on Node 20 and Node 22;
3. runs the complete Stateborn suite on both Node versions;
4. validates the offline Stateborn surface;
5. replays capsule, state-language, and hostile-transport probes; and
6. requires the regenerated hostile-transport probe to match the retained raw JSON byte-for-byte.

Every job also requires this branch to retain PR #19 exact head `8f121cbcea12a68904ead3042897e7d3f49124b0` in its ancestry.

## Evidence

Initial clean-runner implementation head: `d7d4436bf19fce80f16e4b140f52af01ba4cfe78`.

GitHub Actions `Stateborn checkpoint clean-runner evidence` run `34419467463`: **SUCCESS**.

Eight clean Ubuntu 24.04.5 jobs completed successfully:

- Python 3.12: State Floor;
- Python 3.12: Workfloor Sentinel;
- Python 3.12: Wakeup Fuzzer;
- Python 3.12: Adaptive Closure Verifier;
- Python 3.12: Real-Project Closure Trial;
- Python 3.12: Unlabeled Multi-Project Closure;
- Node 20: Stateborn checkpoint/recovery;
- Node 22.23.2: Stateborn checkpoint/recovery.

Each Node job passed the exact PR #19 ancestry guard, recovery-boundary syntax checks, the focused hostile-transport suite, the complete Stateborn suite, offline static validation, all three retained probes, and exact-byte comparison of regenerated `state_transport_probe.json` to the retained raw evidence. The Node 22 log records **18/18 focused hostile-transport tests** and **97/97 complete Stateborn tests**. Static validation reports **33 required files, 20 JavaScript files, zero external dependencies**.

GitHub currently warns that `actions/checkout@v4` and `actions/setup-node@v4` themselves target its deprecated Actions Node 20 runtime and are forced onto Node 24 internally. The tested project process was still explicitly provisioned as Node 20 or Node 22 by `setup-node`; this warning is not presented as project-runtime evidence.

This receipt-only evidence update follows the same non-recursive publication pattern already used by PR #19: the next exact branch head receives the same push-triggered workflow, while its final hosted run is reported on the pull request rather than editing this receipt forever.

No benchmark or performance measurement is introduced by this lane. No visual/browser evidence is involved.

## Truth boundary

A green hosted run proves that the exact checkpoint-recovery stack and retained experiment suites execute successfully in the named GitHub Ubuntu environments exercised by the workflow. It does not add filesystem durability, crash atomicity, process-level restart, authenticated checkpoints, concurrent-writer safety, real networking, merge approval, release authority, or CANON authority.
