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

## 6. Corporate / industry research watch anchors

These links are preserved not as proof of AXM novelty, but as **future comparison anchors**. They are organizations actively working on sparse specialists, routing, event-driven hardware, local memory/compute, expert parallelism, or adjacent efficiency problems one or more layers above the AXM state-floor experiment.

Future research passes should revisit both the specific linked work and each organization's newer work, because the important comparison may appear later rather than in the paper currently listed.

### Apple Machine Learning Research

**Why watch:** Apple is actively exploring specialist paths, shared routers, adaptive expert-choice routing, and uncertainty-aware model routing. This is very close to the routing/specialization direction, but remains primarily at neural-model or model-selection level.

Official sources:

- PathMoE / Path-Constrained Mixture-of-Experts: https://machinelearning.apple.com/research/path-constrained-mixture-experts
- Omni-Router: https://machinelearning.apple.com/research/omni-router
- EC-DIT adaptive expert-choice routing: https://machinelearning.apple.com/research/ec-dit
- Apple Machine Learning Research root: https://machinelearning.apple.com/

**Future comparison question:** does Apple push expert-path or router state downward toward explicit dependency/state-triggered execution?

### Microsoft Research / DeepSpeed

**Why watch:** Microsoft has long-running MoE infrastructure work and, importantly, continues to research routing quality, routing stability, expert locality, and efficient sparse execution. This is useful both as convergence and as a source of failure modes for AXM routing.

Official sources:

- DeepSpeed project: https://www.microsoft.com/en-us/research/project/deepspeed/
- DeepSpeed publications: https://www.microsoft.com/en-us/research/project/deepspeed/publications/
- DeepSpeed-MoE: https://www.microsoft.com/en-us/research/publication/deepspeed-moe-advancing-mixture-of-experts-inference-and-training-to-power-next-generation-ai-scale/
- StableMoE routing: https://www.microsoft.com/en-us/research/publication/stablemoe-stable-routing-strategy-for-mixture-of-experts/
- 2026 ELDR expert-locality-aware routing: https://www.microsoft.com/en-us/research/publication/eldr-expert-locality-aware-decode-routing-for-pd-disaggregated-moe-serving/
- 2026 counterfactual MoE misrouting analysis: https://www.microsoft.com/en-us/research/publication/when-are-experts-misrouted-counterfactual-routing-analysis-in-mixture-of-experts-language-models/

**Future comparison question:** do routing-quality and locality methods evolve toward explicit state/dependency truth instead of learned top-k allocation alone?

### Google Research

**Why watch:** Google has foundational and continuing sparse-MoE work, including routing at different granularities and expert-choice routing. It is a strong reference for what happens when routing remains inside the model layer.

Official sources:

- Expert Choice Routing: https://www.research.google/blog/mixture-of-experts-with-expert-choice-routing/
- Task-level Mixture-of-Experts: https://research.google/pubs/beyond-distillation-task-level-mixture-of-experts-for-efficient-inference/
- Google Research root: https://research.google/

**Future comparison question:** does routing granularity continue moving from token -> task -> persistent state/context -> lower runtime state?

### Meta AI

**Why watch:** Meta has deployed sparse MoE as shared + specialized capacity, including automatic routing in multilingual systems. It is useful as a large-scale example of specialization under highly heterogeneous inputs.

Official source:

- No Language Left Behind / sparse MoE: https://ai.meta.com/research/no-language-left-behind/
- Meta AI research root: https://ai.meta.com/research/

**Future comparison question:** do large heterogeneous expert systems gain more explicit persistent-state or dependency-driven routing?

### DeepSeek

**Why watch:** DeepSeekMoE explicitly pursues fine-grained expert segmentation and shared-expert isolation, while later DeepSeek models scale sparse activation aggressively. Fine-grained experts are particularly relevant to the question of how small specialist units can become before routing/coordination cost dominates.

Official sources:

- DeepSeekMoE repository: https://github.com/deepseek-ai/DeepSeek-MoE
- DeepSeek-V2 repository: https://github.com/deepseek-ai/DeepSeek-V2
- DeepSeek-V3 repository: https://github.com/deepseek-ai/DeepSeek-V3
- DeepSeek organization: https://github.com/deepseek-ai

**Future comparison question:** how far can expert granularity increase while maintaining routing quality and bounded coordination overhead?

### NVIDIA

**Why watch:** NVIDIA operates at the model-to-hardware execution layer: expert parallelism, distributed experts, routing-aware serving, memory movement, and large-scale MoE scheduling. This is especially useful for understanding where sparse architecture benefits get eaten by communication and hardware friction.

Official sources:

- NVIDIA MoE overview: https://www.nvidia.com/en-us/glossary/mixture-of-experts/
- Megatron Core expert parallelism guide: https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html
- Wide Expert Parallelism: https://developer.nvidia.com/blog/scaling-large-moe-models-with-wide-expert-parallelism-on-nvl72-rack-scale-systems/
- NVIDIA Research root: https://research.nvidia.com/

**Future comparison question:** can state-local execution avoid or reduce the communication/scheduling costs now appearing in large expert-parallel systems?

### Intel Labs / neuromorphic computing

**Why watch:** Intel's Loihi/Hala Point research moves computation toward sparse, event-driven, brain-inspired hardware. This is below neural routing and closer to the physical-machine layer, although it is not the same architecture as AXM's canonical-state specialist fabric.

Official sources:

- Hala Point / Loihi 2 system: https://www.intel.com/content/www/us/en/newsroom/news/intel-builds-worlds-largest-neuromorphic-system.html
- Intel Labs root: https://www.intel.com/content/www/us/en/research/overview.html

**Future comparison question:** can event-driven hardware expose useful primitives for explicit state-change wake-ups rather than only neural spike/event workloads?

### IBM Research / NorthPole

**Why watch:** IBM NorthPole co-locates memory and processing in a distributed core array with local control, attacking the memory/compute separation and energy cost of conventional AI hardware. That makes it useful for the physical-friction side of the state-node hypothesis.

Official sources:

- NorthPole architecture paper: https://research.ibm.com/publications/ibm-northpole-an-architecture-for-neural-network-inference-with-a-12nm-chip
- NorthPole LLM efficiency results: https://research.ibm.com/blog/northpole-llm-inference-results
- IBM Research root: https://research.ibm.com/

**Future comparison question:** if computation and memory become increasingly local, does a state-dependency fabric map more naturally onto hardware than onto conventional CPU/GPU execution?

### Watch discipline

A future AXM research pass should not ask only "Did another company build AXM?"

It should separately check whether industry has advanced any of these subproblems:

```text
expert granularity
routing correctness
routing stability
stateful routing
explicit dependency routing
event-driven activation
local memory + local compute
expert locality
communication overhead
activation closure
context/state sufficiency
incremental recomputation
hardware support for sparse wake-ups
```

A result can be highly useful even when it lives one or two layers above AXM, because it may reveal a solved subproblem, a scaling wall, or a path for moving the mechanism downward later.

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
