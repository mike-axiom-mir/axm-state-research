# Lane receipt — Stateborn checkpoint-owned replay

- Date: 2026-09-10
- Chat lane: Truth Sentinel checkpoint recovery repair
- Branch: `ai/stateborn-checkpoint-replay-2026-09-10`
- Base commit: `686201db2a17d343fc5e63123a93bb3f03d343ee`
- Prerequisite: open PR #9, exact head above
- Intended pull request base: `main`
- Merge authority: human only

## Scope

Repair the v0.7 hostile-transport recovery proof without changing its frozen
fixture universe. A checkpoint must carry the receipt bodies it needs and must
reconstruct the checkpoint-owned state even when the pre-disconnect engine
object no longer exists.

## Preserved failure

Before the repair, the disconnect regression passed only while the original
engine remained in memory. Replacing it with a fresh engine before reconnect
made the focused suite fail: 17 tests passed and the recovery test failed with
deadlock outcome 3 instead of solved outcome 1. The old recovery path replayed
zero live receipts rather than the receipt ID sealed into the checkpoint.

## Verification before publication

- pre-fix focused suite: 17 / 18 passed; restart recovery failed with
  deadlock outcome 3 instead of solved outcome 1;
- post-fix focused hostile-transport suite: 18 / 18 passed;
- complete Stateborn suite: 97 / 97 passed;
- capsule, state-language, and hostile-transport probes: passed; regenerated
  transport evidence matched the retained raw JSON byte-for-byte;
- static validation: 33 required files and 20 JavaScript files passed with no
  external runtime dependency;
- all six earlier experiment suites: passed (58 / 58 tests);
- diff validation: passed;
- repository-wide CI: pending publication;
- browser, real network, process restart, and durable-storage behavior: not
  tested by this lane.

## Claim boundary

The repaired test can establish deterministic reconstruction from a
self-contained in-memory checkpoint after simulated loss of live engine state.
It cannot establish filesystem durability, crash atomicity, authenticated
checkpoints, cross-process recovery, real networking, merge, release, or canon.
The previously sealed v0.7 ZIP remains historical and is not rewritten by this
corrective branch.

This lane is intentionally stacked on PR #9 because that exact head contains
the v0.7 transport experiment. It does not take over PR #17's presentation-only
transport-feedback lane. Human merge authority remains unchanged.
