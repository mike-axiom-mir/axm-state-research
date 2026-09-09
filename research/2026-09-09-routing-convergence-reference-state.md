# Routing Convergence Update: Shared Control State, Reference State, and Dependency Execution

**Status:** external convergence + hypothesis refinement, not canon  
**Date checked:** 2026-09-09  
**Primary lane:** state-level specialist fabric / implicit-zero positive-state propagation  
**Purpose:** preserve materially relevant new research without rewriting the 2026-09-02 snapshot.

## Why this belongs here

The new work does not demonstrate the full AXM state-level specialist fabric. It does, however, independently strengthen three subclaims and materially challenges one over-simple interpretation of implicit-zero execution:

```text
1. routing/control state can contain reusable shared structure;
2. fine-grained dependency scheduling can remove false synchronization boundaries;
3. event-driven sparse execution can scale much farther than tiny toy systems;
4. skipped execution does NOT imply that all skipped state contribution is dispensable.
```

The fourth point changes an AXM correctness boundary and therefore deserves a durable research update.

---

## 1. Shared routing geometry across MoE depth

**Source:** Kirill Labzin, Stepan Kulibaba, Artem Dzhalilov, Artem Gorokhov, *Evidence for Shared Routing Geometry and Dynamics in Sparse Mixture-of-Experts*, arXiv:2609.02404, submitted 2026-09-02.  
https://arxiv.org/abs/2609.02404

The authors isolate routing-control subspaces from multiple sparse MoE layers, align them into a shared canonical representation, and report that one linear transition retains 79--90% of the predictive power of separately fitted layer-specific dynamics across the evaluated architectures.

### AXM connection

This is meaningful convergence with a possible architecture of:

```text
canonical machine state
  -> compact shared control / routing representation
  -> local specialist decoder or dependency rule
  -> local work
```

It suggests that specialist routing may not require every layer/node/family to maintain a fully independent routing representation.

### What AXM should NOT claim

- Their canonical representation is a learned/aligned MoE routing space, not AXM canonical machine truth.
- It does not prove deterministic dependency routing.
- It does not show that a low-dimensional shared control state is sufficient for arbitrary software/system state.

### Research consequence

Add a candidate experiment: derive a **non-authoritative shared control summary** from canonical state and test whether multiple specialist families can use it to reduce routing bookkeeping while preserving exact oracle equality.

The control summary must remain derivable/cache-like. It must never replace canonical truth unless exact equivalence is independently established.

---

## 2. Halving active experts while retaining reference probability mass

**Source:** Xing Chen, Hengshuai Yao, *Training-Free Halving of Activated Experts in Fine-Grained Mixture-of-Experts Models*, arXiv:2609.04575, submitted 2026-09-04.  
https://arxiv.org/abs/2609.04575

The paper separates two things normally coupled in MoE inference:

```text
experts that execute
!=
experts whose probability mass participates in normalization/reference state
```

On the reported Qwen models, substantially fewer experts can execute while a broader reference probability mass is still retained for normalization. Removing that reference is catastrophic in their experiments.

### Direct challenge to the AXM shorthand

The existing implicit-zero direction can be misread as:

```text
inactive -> absent -> irrelevant
```

That is too strong.

The safer distinction is:

```text
ACTIVE EXECUTION
  state/work must run now

REFERENCE-ONLY STATE
  does not execute, but still contributes to a required invariant,
  normalization, bound, aggregate, future decision, or proof

IMPLICIT DEFAULT
  safely omitted because its contribution is exactly derivable or null
```

### New correctness invariant: reference-state closure

A state contribution may be omitted from execution only if every required downstream/global effect remains represented or exactly derivable.

```text
skip_execution(x)
AND contribution(x, invariant_or_future) != 0
=> preserve_or_derive(contribution(x))
```

This is distinct from:

- **activation closure** — did every affected specialist wake?
- **sufficient-state closure** — did an awakened specialist receive enough state?

AXM now needs a third explicit gate:

> **reference-state closure:** did sparse execution preserve every non-executed contribution still required by normalization, aggregation, constraints, bounds, proofs, or future behavior?

### Hypothesis refinement

Replace the informal rule:

```text
asleep = absent
```

with:

```text
asleep = no active execution

absence is allowed only when the omitted contribution is
null, derivable, or proven irrelevant to the declared future.
```

This strengthens rather than rejects the implicit-zero hypothesis by making its safety boundary testable.

---

## 3. Cohere North Mini Code megakernel: fine-grained dependency execution

**Source:** Xiaochun Tong, Conway Zhu, Donglu Wang, *Inside the megakernel serving engine for North Mini Code*, Cohere, 2026-09-08.  
https://cohere.com/blog/megakernels

Cohere decomposes decode into small GPU tasks. Dependencies are represented with explicit counters, allowing a task to begin when its own producers have satisfied the required count rather than waiting for a whole-operation or whole-GPU synchronization boundary.

Cohere reports 1.25x--1.41x end-to-end speedups over vLLM on its tested single-H100 BF16 serving setup and describes dynamic work queues for attention and MoE stages whose tile counts depend on live state/routing.

### AXM connection

This is strong evidence for the **execution-plane** part of the AXM idea:

```text
small task
+ declared dependencies
+ local readiness condition
-> execute when dependency closure is satisfied
```

It also provides a concrete warning: their implementation requires memory fences around the counter protocol to avoid silent data corruption. Dependency truth alone is insufficient if the execution layer can observe stale/incomplete writes.

### What is not new or not proven

- Counter-based dependency synchronization predates this implementation; Cohere explicitly credits earlier Hazy Research work.
- This is not evidence for AXM deterministic routing from canonical application state.
- It does not prove that dependency metadata is always cheaper than global scheduling.

### Research consequence

Add an execution-layer test dimension:

```text
logical dependency closure
+
memory/publication visibility closure
```

A node becoming logically ready must not be allowed to consume state before the producing writes are visible under the relevant runtime/hardware memory model.

---

## 4. TTFS spiking LLM at 1.5B parameters

**Source:** Zhuoya Zhao, Parsa Omidi, Aref Jafari, Richard Naud, *Large Language Models with At Most One Spike per Neuron*, arXiv:2609.05151, submitted 2026-09-04.  
https://arxiv.org/abs/2609.05151

The paper builds a fully time-to-first-spike architecture with at most one spike per neuron and introduces reference-based encodings for LLM components that are difficult for conventional TTFS systems, including embeddings, layer normalization, attention-related operations, and dropout. The authors report scaling to 1.5B parameters.

### AXM connection

This strengthens the plausibility of a future physical execution layer where sparse event-driven work is not limited to tiny demonstrations.

### Boundary

The paper still reports a clear language-model perplexity gap and its energy result is a modeled spike-count proxy, not measured neuromorphic-hardware energy. It therefore does **not** satisfy AXM's exact-output/equality gate.

### Research consequence

Keep neuromorphic/event-driven hardware as a later execution substrate candidate, not as evidence that the current state-floor hypothesis is already solved.

---

## Updated compact AXM hypothesis

The strongest version after this research pass is now:

```text
CANONICAL AUTHORITATIVE STATE
  + explicit dependency topology
  + sparse local specialist activation
  + optional derived shared control summaries
  + retained reference/global invariants where required
  + activation closure
  + sufficient-state closure
  + reference-state closure
  + publication/visibility correctness at the execution layer
  + evidence-backed deltas
  + escalation only when local machinery is insufficient
```

The efficiency target remains:

```text
executed work ~= state actually disturbed
```

but the memory/state target should be stated more carefully:

```text
resident active execution state
  can be much smaller than total registered capability,
WHILE
all future-relevant/reference contributions remain represented or exactly derivable.
```

---

## New experiment to add to the work floor

### G. Active / reference-only / implicit-state separation

Run the same deterministic workload through three engines:

**Engine A — dense oracle**
- all relevant state explicit;
- all registered checks evaluated or their exact baseline equivalent.

**Engine B — sparse execution + reference closure**
- execute only dependency-reachable specialists;
- keep required reference/global contributions without running the associated specialist body;
- allow truly default/null state to remain implicit.

**Engine C — aggressive sparse/implicit**
- same wake set as B;
- deliberately remove one required reference contribution.

Measure:

```text
canonical output equality
replay equality
wake-up count
executed work
reference-state bytes
implicit/default bytes avoided
normalization/aggregate/constraint equality
missed reference contributions
settling work
```

Expected gate:

```text
A == B
A != C  (for at least one injected reference-dependency case)
```

If A == B across the declared workload while B reduces executed work or residency, the refined hypothesis is strengthened.

If B requires so much retained reference state that the savings disappear, the hypothesis is weakened in that domain.

---

## Repo impact map

### `axm-state-research`
**Direct update required.** This repository owns the hypothesis, prior-art boundary, and experiments. This file is that update.

### `axm-ignition-fabric`
**No implementation change yet.** Its retained-checkpoint work already supports the broader principle that preserved truth should be reused rather than rebuilt. The new MoE reference-state result suggests a future audit question: can any non-resident/non-executed domain still contribute to a global invariant that must remain represented? Do not alter the sealed v0.23 lane without a dedicated experiment.

### `axm-universal-creation`
**No immediate change required.** Its dependency-aware organ assembly is compatible with the direction, but the cited results do not establish a new creation-fabric requirement yet. Promote only after a concrete state-routing implementation exists.

---

## Hypothesis status after 2026-09-09

**Convergence:** stronger.  
**Direct falsification:** none found.  
**Material refinement:** yes — inactive execution must be separated from absent/irrelevant state.  
**New required gate:** reference-state closure.  
**Canonical-state claim:** unchanged and still experimental.  
**Deterministic dependency-routing claim:** still unproven at scale.  
**Neuromorphic mapping:** plausible future substrate, not present proof.

## Source-integrity note

These sources are research/architecture references only. No third-party code, weights, datasets, or implementation assets are imported by this update. Their inclusion does not grant runtime reuse permission and does not change the repository's Apache-2.0 project license.
