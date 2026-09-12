# Stateborn v0.3.0 — Action Report

Date: 2026-09-04

## Added without replacing v0.2

- separate offline Curiosity Garden game surface;
- six deterministic curiosity actors over the million-cell sparse field;
- strict machine-visible policy projection;
- novelty selection from unfamiliar states and least-tried context/action pairs;
- four state signals: `hush`, `pulse`, `turn`, and `open`;
- game-observer projection for growth, damage, bloom, scar, shared echo, and health drift;
- receipt-bound policy view, chosen intent, novelty basis, observer consequence, prior/result digest, and revision;
- exact replay, stale refusal, idempotency, deterministic reset, and multi-seed probe;
- navigation back to the preserved relational v0.2 lab.

## Verified

- 36 / 36 total automated tests passed;
- 12 / 12 sixty-four-step seed runs replayed exactly;
- all 12 stored policy-view sequences were free of forbidden outcome fields;
- all 12 runs produced both growth and damage;
- each run changed 22–31 cells and produced a shared echo;
- browser loop, observer/machine separation, replay, reset, navigation, layout, and application log checks passed.

## Important negative result

The displayed seed ended at health drift −3 after 64 looped questions. Curiosity was not rewarded for repairing that damage and did not optimize it away. That is evidence that the policy is not secretly following the observer's success label.

It is not evidence that damage is desirable. The experiment is isolated, resettable, deterministic, and game-only.

## Honest result

We built a curiosity-incentive mechanism, not machine curiosity. It repeatedly produces mixed world changes and cross-actor shared cells without natural-language messages. Its novelty formula and game consequence rules remain authored; open-ended emergence is not proven.

## Publication state

- local experiment only;
- no GitHub branch, PR, merge, release, or canon action;
- future research-lane intake remains blocked on Mike's GitHub 2FA decision/timing.
