# Lane receipt — Stateborn transport feedback

- Date: 2026-09-09
- Branch: `ai/stateborn-transport-feedback-2026-09-09`
- Base dependency: PR #9 exact head `686201db2a17d343fc5e63123a93bb3f03d343ee`
- Scope: human-readable transport consequence feedback only
- Merge/CANON authority: human maintainer only

## Bounded objective

Improve the existing `dist/transport.html` loop so one step answers the human question “what just happened, and did protocol state actually change?” without changing the hostile-transport simulator, packet language, fixture universe, consent rules, replay, source state, or transport authority.

The existing v0.7 surface already exposes routes, queue state, receipts, metrics and replay. Before this lane, the step button reported only that a tick was committed, so a drop, duplicate suppression, refusal, recovery, accepted packet, or deadlock still required the human to manually reconstruct the consequence from several ledgers.

## Coordination / non-overlap

Immediately before claiming this lane, open State Research PRs were rescanned newest-first. The newest work was PR #16 (deterministic research-source discovery) and PR #15 (reference-state closure execution); neither touches Stateborn transport experience. PR #9 owns the Stateborn v0.1–v0.7 research chain itself, so this lane is intentionally stacked on that exact head rather than copying or redefining its simulator.

This lane does not modify `state-transport.js`, `state-language.js`, frozen fixtures, probes, result reports, or the PR #9 bundle. It adds a presentation-only companion script and its verification surface.

## Changes

- add a receipt-derived `CURRENT CONSEQUENCE` panel showing new transport events for the last human action;
- distinguish `PROTOCOL STATE CHANGED` from `PROTOCOL STATE HELD` by comparing the real trial engine digest before and after the action;
- map existing ledger event types to bounded human-readable consequences without inventing missing causes;
- give the route rail state-driven applied/recovered/blocked/offline feedback while preserving reduced-motion behavior;
- expose the next honest action from visible trial state only;
- add bounded keyboard access: Space/Enter step, R run, V replay, Escape reset, and bracket keys change frozen route; form controls keep their native keyboard behavior;
- keep `DISPLAY ≠ AUTHORITY` visible in the consequence panel;
- add focused deterministic tests and include the companion script in static/offline validation.

## Evidence before publication

Focused local checks:

```text
node --check dist/transport-experience.js
PASS

node --test tests/transport-experience.test.mjs
4 tests / 4 PASS
```

A Chromium interaction harness exercised the changed transport DOM at 1440×1100 and 390×844 with representative receipt events matching the existing transport contract. It verified:

- first stepped DROP -> `PROTOCOL STATE HELD`;
- retry + `DELIVER_APPLIED` -> `PROTOCOL STATE CHANGED`;
- receipt-derived event copy updated after each step;
- zero page errors in the harness;
- no horizontal overflow at either viewport;
- the new consequence panel remained readable at desktop and narrow-screen sizes.

This browser evidence is **not** claimed as a real-engine served-browser PASS: the execution environment blocks local/file navigation and cannot clone GitHub. The harness therefore used the exact changed DOM/experience behavior with a bounded mock of the already-tested `AXM_STATE_TRANSPORT` browser contract. Exact repository/runtime verification is delegated to GitHub Actions after publication.

## Truth boundary

The experience layer may read existing trial state and receipt evidence. It does not apply packets, decide faults, mutate frozen fixtures, validate consent, create checkpoints, change replay, or become a second simulation authority. A visual pulse is a realization of an event already present in the ledger; it is not new state evidence.

No performance benchmark was run because this lane adds only small DOM updates on explicit human actions and no frame loop. No physical gamepad path is added or claimed.

## Handoff state

Ready for final overlap rescan, pull-request publication, and exact-head CI. PR URL and exact CI state should be appended after publication rather than guessed here.
