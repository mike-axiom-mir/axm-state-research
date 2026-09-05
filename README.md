# AXM State Research

[![Apache License 2.0](https://img.shields.io/badge/license-Apache--2.0-3b82f6)](LICENSE) ![Status research](https://img.shields.io/badge/status-research-8b5cf6) ![Deterministic focus](https://img.shields.io/badge/focus-deterministic%20state-16a085)

AXM State Research investigates a state-first way to build software: many small deterministic perspective nodes observe a bounded canonical state, wake only when relevant dependencies change, and emit evidence-backed results or proposed deltas.

The purpose is to measure what this changes about memory, replay, coordination, emergence, and human–AI creation—not to declare universal results before the experiments earn them.

## Research questions

- Can specialist behaviour be represented as small state subsets, triggers, deterministic checks, and evidence outputs?
- How much context and repeated work can dependency-aware wake-ups avoid without missing necessary work?
- Can exact replay and source integrity survive aggressive state compression?
- Can curiosity-driven rather than efficiency-only incentives create useful, inspectable emergent worlds?
- Where do deterministic nodes stop being sufficient and require neural, human, or other escalation?

## Current repository truth

The default branch is still a lightweight public root. Material research is deliberately separated into reviewable PR lanes; none becomes CANON merely because it is open or passing tests.

| Lane | Focus |
|---|---|
| [PR #2](https://github.com/mike-axiom-mir/axm-state-research/pull/2) | State/friction checkpoint and specialist-fabric foundation |
| [PR #3](https://github.com/mike-axiom-mir/axm-state-research/pull/3) | State-research import and lane governance |
| [PR #4](https://github.com/mike-axiom-mir/axm-state-research/pull/4) | Related state, routing, and incremental systems |
| [PR #5](https://github.com/mike-axiom-mir/axm-state-research/pull/5) | Wake-up fuzzer |
| [PR #6](https://github.com/mike-axiom-mir/axm-state-research/pull/6) | Adaptive closure verifier |
| [PR #7](https://github.com/mike-axiom-mir/axm-state-research/pull/7) | Real-project closure trial |
| [PR #8](https://github.com/mike-axiom-mir/axm-state-research/pull/8) | Unlabelled multi-project closure challenge |
| [PR #9](https://github.com/mike-axiom-mir/axm-state-research/pull/9) | Stateborn actor-state capsule chain |

## Evidence boundary

A measured result applies only to its recorded harness, inputs, state contract, and test gate. It does not automatically prove the same reduction, scale, or emergence in arbitrary software, games, AI systems, or physical machinery.

Research should preserve the path from observation to hypothesis, experiment, red evidence, repair, and bounded conclusion. Negative and ambiguous findings remain useful.

## Public boundary

Private state, raw memory, personal data, secrets, and unpublished continuity do not belong in public research exports.

Explore the wider family in the [AXM Public Project Map](https://github.com/mike-axiom-mir/axm-collaboration-platform/blob/main/docs/PUBLIC_PROJECTS.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
