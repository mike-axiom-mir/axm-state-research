# Simulation as reusable experience

Status: reusable research method, 2026-09-25. This note shares an integration
pattern grounded in existing AXM experiments. It introduces no runtime, mandatory
architecture, automatic adoption rule, or claim of scientific novelty.

The useful loop is: expose a real capability through a small repeatable world,
vary the conditions, observe actual consequences, retain what helps, and test
the retained result on conditions that did not guide its construction.

## What can accumulate

| Route | Retained body | Receiving-domain check |
| --- | --- | --- |
| Deterministic creation | Controls, typed workflows, reusable parts and dependency pins | Rebuild a fresh artifact and measure it again |
| Verification | Minimized counterexamples, model boundaries and regression fixtures | Replay the failure against the actual implementation |
| Neural learning | Weights, learner state, experience source and complete continuation state | Frozen evaluation on unused conditions |
| Compute search | Route/policy candidates and full cost observations | Same canonical result as the reference under new workloads |
| Game or world practice | Explicit simulated episodes and named experimental saves | Native world validation, then a separate transfer trial |

A rendered output, accepted action, changed checkpoint or large episode count
alone does not establish useful retained capability. Keep the construction
causes, failures and provenance needed to reproduce the narrower result.

## Bounded experiment recipe

1. Name a concrete gap and an observable outcome. Choose the smallest useful
   transition system; call the existing implementation where possible. A copied
   approximation must declare its difference from the real capability.
2. Identify source revision, provider version, parameters, allowed actions,
   initial conditions and units. Label authored/synthetic, simulated and external
   observations separately. A digest proves byte identity, not simulator fidelity.
3. Freeze disjoint development and evaluation conditions before selection.
   Separate seeds test new examples; separate mechanisms or tasks test broader
   transfer. Do not repeatedly tune against a supposedly untouched test set.
4. Compare the existing method, a simple fixed method and seeded random selection
   before adopting a more complex curriculum. Match useful work budgets; report
   evaluation, setup, replay, failed trials, time and memory separately.
5. Record consequences and limits. Retain failed cases, invalid actions, unknown
   observations and exhausted budgets. Model PASS means only the checked model
   and bound; missing evidence remains unknown.
6. Preserve enough state for the intended continuation claim. For a persistent
   learner this includes weights, optimizer/learner state, provider identities,
   seed splits, scheduler state and accounting. Test actual serialization and
   resumed execution. A deterministic recipe may need only its complete causes.
7. Test a candidate in fresh receiver-owned state. Evaluate canonical invariants
   before speed, usefulness before volume, and actual rendered/runtime output
   when the goal is perceptual. A simulation success does not grant adoption.
8. Retain a useful candidate through the receiver's existing acceptance path,
   preserving the prior working body and meaningful failures. Reopen the model
   when real observations contradict it.

These are experiment design questions, not a new global requirement for every
AXM machine to keep action logs, use GitHub, train a neural model or grow
continuously. Match persistence and recovery to the receiving system.

## Existing implementation and bounded evidence

| Owner | Existing implementation |
| --- | --- |
| Neural Network | [Provider descriptors, finite packets and replay contract](https://github.com/mike-axiom-mir/axm-neural-network/blob/0dc91d6b0324fc2dec2173c73b9e3310e945a254/SIMULATION_CONTRACT.md) |
| Neural Brain | [Persistent sessions, isolated descendants and fixed/random/error-guided scheduling](https://github.com/mike-axiom-mir/axm-neural-brain/blob/a463363ac84543f1a4289830793e9f1a0993e6fe/SIMULATION_SESSIONS.md) |
| UC neural experiment | [Canvas-fit adapter and runnable save/resume lab](https://github.com/mike-axiom-mir/axm-uc-neural/blob/a8d1e766ebed88153054392c02de0c78ae2d31e0/docs/UC_SIMULATION_LAB.md) |

The UC adapter calls the real `axm_uc.simulation._fit_shape` function. Inside,
overflow and mixed families vary rectangle inputs to **one capability**; they
are not three independent learned domains.

The retained [comparison data](https://github.com/mike-axiom-mir/axm-uc-neural/blob/a8d1e766ebed88153054392c02de0c78ae2d31e0/verification/2026-09-25-simulation-bridge/curriculum-comparison.json)
uses brain seeds 17, 41 and 73, three scheduling policies, and 768 training
transitions per run. Every one of the nine runs improved mean held-out prediction
error from its initial state and restored exactly. Mean final held-out MSE:

| Policy | MSE, lower is better |
| --- | ---: |
| Fixed | 0.0041558357 |
| Seeded random | 0.0041141777 |
| Error-guided | 0.0041231795 |

Error-guided scheduling is a moving-error heuristic, not a learned meta-selector,
and did not beat random overall. Fixed remains the lab default. These are retained
measurements, not a new benchmark run for this documentation change. They do not
prove external transfer, broad creation quality, million-simulation throughput,
temporal credit assignment, hardware performance or general intelligence.

The UC lab is on `axm-uc-neural`'s experimental
`codex/uc-waldo-wiring-proof-v1` branch. It is not automatically present in
Universal Creation main and does not train or reconfigure WALDO/WALMI.

## Where to reuse the method

- State Research: extend [frozen cross-project closure trials](../experiments/06-unlabeled-multiproject-closure-challenge/README.md)
  and [reference-state closure](../experiments/reference-state-closure-v1/README.md)
  with retained failure families. Count recovery and auditing work.
- Creation systems: compare executable construction recipes and rebuild winners.
  Visual acceptance remains a separate observation.
- Invariant Lab: minimize failing transition sequences and check the donor model.
  Exploration agreement does not establish model fidelity.
- Compute Substrate: vary workload shapes and compare declared routes against a
  full recomputation reference; simulated storage is not physical crash evidence.
- Organ Fabric: compare genuinely executable candidates in a host adapter.
  Descriptive anatomy is not an executable organ.
- Gameplay and characters: explore timing, action sequences, geometry controls
  and export boundaries; preserve external collision and visual truth.
- WALMI and the three simulator worlds: reuse the existing
  [observed-experience boundary](https://github.com/mike-axiom-mir/axm-walmi/blob/8648815cdbd0cb8a7d997ff1e904a59553a63f66/docs/adr/9044-simulator-play-is-observed-experience-not-hidden-training.md)
  and [persistent named-play boundary](https://github.com/mike-axiom-mir/axm-walmi/blob/8648815cdbd0cb8a7d997ff1e904a59553a63f66/docs/adr/9045-persistent-paced-simulator-play-is-not-a-disposable-probe.md).
  Offline rapid probes must remain labelled separately from paced play. Do not
  overwrite personal saves, silently train, or count menu acceptance as strategy.

Further research could test curriculum selection, reusable repairs, simulator
fidelity checks, curriculum transfer and physical-system surrogates. Each needs
its own adapter, baseline and receiver evidence. None becomes implemented by
being listed here.

## Minimal handoff

Retain the question, source identities, domain/units, condition split, declared
budgets, reference method, observed result, failed cases, retained body, resume
evidence where relevant, and the next receiver test. Prefer the receiver's
existing receipt format over a second universal schema.

Truth keeps claims bounded; Agency keeps experimental action and adoption
explicit; Continuity preserves source, working state and failures; Wisdom before
speed asks whether the retained result is useful. These roots support sharing
the technique without transferring another repository's authority.
