# Prior-Art Convergence Snapshot

**Date checked:** 2026-09-02  
**Purpose:** preserve nearby research that converges with or challenges the AXM state-level specialist-fabric hypothesis.  
**Novelty discipline:** convergence is evidence that the direction is technically meaningful, not evidence that AXM owns the broad mechanism.

## 1. Sparse Mixture-of-Experts

Modern sparse MoE systems route each token/input through only a subset of expert subnetworks. The broad direction is conditional computation: maintain large total capacity without activating all capacity for every input.

**Connection:** specialist selection + sparse activation.  
**Difference:** common MoE routing is usually learned/statistical and operates inside neural-model layers, not from a canonical application/machine-state dependency graph.

## 2. Path-Constrained Mixture-of-Experts / PathMoE

Apple, July 2026.

PathMoE studies the sequence of expert selections across layers as an expert path. Apple reports that tokens naturally concentrate into a small fraction of possible paths and proposes constraining the path space by sharing router parameters across blocks of layers.

**Connection:** useful computation appears concentrated in a small subset of possible specialist routes.  
**Difference:** path concentration is learned inside an MoE model; AXM's experiment asks whether explicit state dependencies can determine routes at a lower machine/runtime layer.

Source: https://machinelearning.apple.com/research/path-constrained-mixture-experts

## 3. Cordis / reactive coeffects

Yifan Shi, Wei Zhang, Tianyi Cui. *A Programming Paradigm for Spatiotemporal Composability*, posted 2026-08-26.

The paper formalizes **reactive coeffects**: every context change is classified against a component's declared coeffect specification to drive activation/deactivation. It implements the model in the Cordis runtime/meta-framework.

**Strong convergence:**

```text
context/state change
  -> declared dependency specification
  -> selective component activation/deactivation
```

This is unusually close to the state-floor wake-up mechanism.

**Difference:** Cordis is framed around dynamic software composition and context-mediated component behavior. AXM is testing a more granular state-specialist work floor whose nodes may perform deterministic checks, evidence production, or bounded learned work.

Source: https://arxiv.org/abs/2608.25512

## 4. BoardroomAI

Sanjeev Manivannan. *BoardroomAI: Dependency-Aware Human-Steerable Multi-Agent Deliberation through Evolving Decision Graphs*, posted 2026-08-13.

BoardroomAI uses a typed decision graph containing evidence, assumptions, constraints, claims, objections, alternatives, risks, decisions, semantic dependencies, and specialist responsibility. Human interventions become graph updates; dependency-aware propagation identifies affected subgraphs, preserves unaffected artifacts, and selectively reactivates relevant specialists.

Reported prototype result:

- 600 generated decision-DAG interventions;
- propagation matched exhaustive impact computation;
- only 14.59% of nodes were inspected.

The paper also reports a critical limitation: correct intervention routing can still provide insufficient context for synthesis, motivating a "decision-sufficient context closure."

**Strong convergence:** selective specialist reactivation from dependency changes.  
**Direct challenge/lesson:** routing correctness and context sufficiency are separate gates.

This maps neatly to the AXM distinction:

```text
activation closure != sufficient-state closure
```

Source: https://arxiv.org/abs/2608.13046

## 5. vLLM Semantic Router / stateful routing

During 2026, vLLM Semantic Router moved from prompt-level model selection toward session-aware, stateful routing. Session-Aware Agentic Routing (SAAR) adds router-owned session state, hard locks around tool loops/provider state, safe reset boundaries, switch economics, and replayable traces.

**Connection:** routing decisions depend on retained state and continuity rather than only the current prompt.  
**Difference:** the unit being routed is still a model/service request. AXM asks whether routing can be pushed down to state-level micro-specialists and deterministic dependency truth.

Sources:

- https://vllm-project.github.io/2026/06/02/session-aware-agentic-routing.html
- https://vllm-project.github.io/2026/06/05/v0.3-vllm-sr-themis-release.html
- https://vllm-project.github.io/2026/07/21/vllm-sr-new-chapter-mom.html

## Novelty boundary update

The following broad ideas should **not** be treated as AXM-unique claims:

- specialist routing;
- sparse conditional computation;
- stateful routing;
- dependency-aware recomputation;
- selective component/specialist reactivation;
- preserving unaffected state/artifacts.

The narrower experimental contribution still worth testing is the combination:

```text
canonical deterministic state
+ extremely small declared-state specialist nodes
+ dependency-derived activation
+ deterministic/evidence-first local functions
+ activation closure
+ sufficient-state closure
+ evidence-backed state deltas
+ compute scaling with changed state rather than total registered capacity
```

## What would materially challenge the hypothesis?

The hypothesis weakens if experiments show one or more of the following:

1. dependency maintenance costs approach or exceed full recomputation;
2. indirect dependency closure becomes intractable at useful scale;
3. local nodes require so much context that sparsity disappears;
4. false/missed wake-ups grow faster than the savings from sparse activation;
5. evidence/provenance overhead dominates node work;
6. global reasoning repeatedly outperforms local-state composition at lower total cost;
7. canonical-state synchronization becomes the dominant bottleneck.

## What would strengthen it?

1. exact oracle equality with very low wake-up fractions;
2. bounded work per local mutation as registered node count rises;
3. reliable automatic detection of insufficient local state;
4. deterministic routing outperforming semantic routing where dependencies are known;
5. graceful escalation from deterministic node -> small model -> large model;
6. retained-state checkpoints reproducing full-history behavior at much lower memory/work cost.

## Status

**Broad convergence:** strong.  
**Novelty claim:** intentionally narrow and still open.  
**Engineering hypothesis:** alive.  
**Next step:** measure scaling, closure correctness, and total work rather than arguing from analogy.
