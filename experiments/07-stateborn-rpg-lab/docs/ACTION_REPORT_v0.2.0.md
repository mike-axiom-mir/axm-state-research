# Stateborn v0.2.0 — Action Report

Date: 2026-09-04

## Built

- deterministic sparse field representing 1,048,576 logical cells without instantiating them all;
- root commitment binding seed, generator version, dimensions, and chunk size;
- canonical sparse overrides for changed cells only;
- three independently addressable actors with pressure, inventory, disposition, relation, and memory state;
- shared move, gather, share, consume, request, build, rest, and wait transforms;
- bounded autonomous actor decisions using the same validation and application path as player intent;
- causal event evidence and generic `mutual_aid` / `unanswered_need` situation projections;
- indexed rule wake-up from changed state families;
- receipt-bound actor events, autonomous choices and causes, changed paths, digests, and revisions;
- exact replay, stale refusal, operation idempotency, atomic rollback, and sealed local save/import;
- offline browser microscope exposing sleeping/materialized/changed cells and causal work.

## Verified result

- 25 / 25 automated tests passed;
- static build validation passed;
- one player share caused Rhea to autonomously share water back;
- those two receipts projected `mutual_aid` with evidence indices 0 and 1;
- reset + wait produced Rhea's autonomous food request and `unanswered_need` instead;
- both branches replayed exactly to distinct digests;
- save → reset → load restored the reciprocal branch and digest;
- no application-origin browser warning/error was observed.

## The bottom-up turn

v0.1 asked many materialized nodes to imitate a game world. v0.2 begins lower: deterministic cell truth, actor pressure, holdings, perception, relation memory, permissioned intent, and consequence. “Situation” is a projection after evidence exists, not an instruction before the action.

The lab seed still supplies compatible starting conditions. Therefore this is not spontaneous world invention. What is observed is narrower: a generic state transition changed what another actor selected, and the resulting two-actor pattern was recoverable from the causal ledger.

## Honest result

This is the first version that produced a small replayable social situation from two actor transitions rather than a prewritten quest. That is worth retaining. It does not demonstrate a satisfying RPG, broad novelty, rich character behavior, safe human-state portability, or networked multiplayer.

## Publication state

- local experiment only;
- no GitHub branch, PR, merge, release, or canon action;
- intended future destination: a bounded `axm-state-research` lane after GitHub 2FA is ready.
