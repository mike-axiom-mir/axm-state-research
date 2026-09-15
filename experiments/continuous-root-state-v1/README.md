# Continuous Root State v1

This bounded experiment tests one small question:

> Can a compact constitutional/root state stay alive while machine state changes, update only the affected predicates for each event, and still reconstruct the same result as an independent full recomputation?

It is a State Research mechanism test. It is **not** a claim that AXM roots are fully solved, that Walmi is safe, or that continuous evaluation should be promoted into Mirror or Walmi.

## Donor

The frozen root fixture is copied from:

- repository: `mike-axiom-mir/axm-collaboration-platform`
- branch: `mirror`
- commit: `4a3727505576c4c95198a8287dd8ce1e82619f32`
- path: `roots/AXM_ROOTS_v1.json`

The experiment computes its own SHA-256 over canonical JSON for the frozen donor:

`59651fbab19647713ea4f94aff98adab1c0a539cb3b61a7ad3f0b3374b4838cd`

That is this experiment's donor digest. It is **not** claimed to be Mirror's internal `State.digest` value.

The donor fixture is retained verbatim as source evidence, including its historical `amendmentAuthority` field. This experiment does not import that field as current State Research governance; repository governance remains the AXM-root merge gate declared in `AGENTS.md`.

## Bounded hypothesis

For the modeled predicates and event types in this experiment:

1. a live incremental root state can update only root checks affected by each state change;
2. an independent full recomputation can verify that incremental state;
3. a planted dependency omission is detected as drift before it is accepted;
4. changed root content is detected before the next event;
5. checkpoint content is digest-bound and a restart can reconstruct the same live root state.

A pass is evidence only for this software fixture.

## What is modeled

The executable predicates are deliberately limited to the checks already represented by the frozen Mirror Principle Cell semantics:

- `agency-non-domination`
- `truth-before-story`
- `source-integrity`
- `no-silent-rewrite`
- `restraint`
- `repairability`

The donor also declares:

- `no-fake-done`
- `continuity`
- `wisdom-over-speed`

This experiment does **not** invent executable predicates for those three. They remain `UNMODELLED`, so an otherwise clean state reports `INCOMPLETE`, never a fake all-roots `PASS`.

## Event surface

The live state accepts bounded events for:

- permissions;
- required/present/supporting evidence;
- contradiction state;
- risk and accepted risk;
- whether a mutation is pending;
- whether a recovery path is declared.

Each event maps to the smallest set of checks that should wake. Every `verify_every` events, the complete root projection is recomputed independently and compared with the incremental state.

The first probe uses `verify_every=1`, so every event is cross-checked. This demonstrates equivalence/detection in the tested sequence, **not** a performance advantage.

## Run

Python standard library only.

```bash
cd experiments/continuous-root-state-v1
python -m unittest -v
python run_probe.py
```

## Evidence

Current local authoring evidence:

- 11/11 unit tests pass on Python 3.13.5;
- 12-event deterministic probe completes;
- incremental and full recomputation agree after every probe event;
- a planted missing dependency edge raises `IncrementalDriftError` and rolls the attempted state transition back;
- root-donor tampering is detected;
- checkpoint tampering is rejected;
- checkpoint restore reconstructs the same live state;
- final probe state is `INCOMPLETE` because three donor roots are intentionally unmodelled.

Committed evidence:

- `results/raw/probe_results.json`
- `RESULTS.md`

## Boundary

This experiment does not prove:

- production AI safety;
- that these predicates fully express the AXM roots;
- that continuous checking cannot be bypassed by a hostile process;
- protection against hardware writers, firmware, power loss, debugger/root access, or malicious replacement of the whole runtime;
- cryptographic authorship;
- neural-model correctness;
- that incremental root evaluation is faster or cheaper than full recomputation.

It tests a much smaller mechanism: **continuous constitutional state with explicit drift detection, root identity binding, and restartable software state.**

If this mechanism survives later adversarial experiments, Mirror is a possible downstream integration target. Walmi is intentionally not modified by this experiment.
