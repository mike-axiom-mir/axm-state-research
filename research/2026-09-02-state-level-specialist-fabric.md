# State-Level Specialist Fabric

**Status:** experimental research lane, not canon  
**Date:** 2026-09-02  
**Scope:** canonical state, dependency-triggered specialist nodes, sparse activation, retained-state compression, and measurable compute reduction.

## Core inversion

Most current systems place the intelligence above the machine:

```text
hardware
  -> generic compute
  -> runtime/software
  -> model/agent
  -> specialist routing
```

This experiment asks whether part of the routing/work fabric can move down into the state layer:

```text
canonical machine state
  -> explicit dependency topology
  -> tiny local specialist nodes
  -> evidence + state deltas
  -> canonical state update
  -> only newly affected nodes wake
```

A node is **not** a full AI agent. The smallest useful node is closer to:

```text
state subset
+ trigger
+ deterministic function/check
+ evidence/delta output
```

Example:

```yaml
perspective: structural_weakness
reads:
  - geometry
  - material
  - load
trigger:
  - geometry_changed
  - material_changed
  - load_changed
produces:
  - result
  - evidence
  - confidence_if_applicable
```

## Why this is interesting

The system does not have to ask a large model to repeatedly inspect the whole world. If the state dependencies are explicit, routing can sometimes be derived from truth rather than guessed semantically.

```text
geometry changed
  -> geometry-validity node wakes
  -> collision node wakes
  -> structural node wakes

unrelated audio/licensing/typography nodes stay asleep
```

The long-term efficiency target is:

```text
compute used ~= state actually disturbed
```

rather than:

```text
compute used ~= total system/model size
```

This is only a target. It must be measured, not assumed.

## Two correctness closures

### 1. Activation closure

If a state change can alter a node's output, that change must be able to wake the node.

The earlier sleeping-specialist failure demonstrates this directly: a checker read `final_report + raw_results`, subscribed only to `final_report`, and stayed asleep when `raw_results` changed. The later canonical state was therefore poisoned even though the local function itself was correct.

Invariant:

```text
output(node, S) != output(node, S')
=> transition S -> S' must make node reachable for activation
```

### 2. Sufficient-state closure

Correct activation is not sufficient. A correctly awakened node can still fail if it receives an incomplete state slice.

Invariant:

```text
node wakes
=> supplied state slice must be sufficient for a correct result,
   or the node must detect insufficiency and escalate/abstain
```

This separates two failure classes that are easy to blur:

- wrong specialist routing;
- right specialist, insufficient state.

## Cheapest sufficient mechanism

AI remains useful, but it becomes one possible implementation of node work instead of the universal coordinator.

Preferred escalation ladder:

```text
deterministic check
  -> bounded algorithm
  -> tiny learned specialist
  -> larger reasoning model
```

Use the cheapest mechanism that can satisfy the required correctness/evidence gate.

## Brain analogy, kept bounded

The architecture resembles biological cognition only at a very abstract level:

- local state;
- sparse/event-driven activation;
- specialization;
- dependency topology;
- state propagation.

A pile of nodes is not a brain. Biological cognition also depends on timing, topology, plasticity, inhibition, signaling, modulation, learning, memory, and mechanisms that are not captured here.

The useful question is not "did we build a brain?" It is:

> Can a machine gain useful capability from coordinated local state transitions while avoiding unnecessary global computation?

## Measurable experiments

### A. Sparse scaling

Increase registered node count while keeping mutations local.

Measure:

- total registered nodes;
- awakened nodes per mutation;
- necessary awakenings;
- false awakenings;
- missed awakenings;
- total work;
- work avoided versus a full oracle;
- canonical output equality.

Desired pattern: node count can grow substantially without local mutations waking a proportional fraction of the whole fabric.

### B. Dependency-closure attacks

Deliberately remove direct and indirect subscriptions.

Measure:

- oracle mismatch;
- number of transitions before visible corruption;
- provenance path to the missed wake-up;
- repair after dependency correction.

### C. Sufficient-state attacks

Wake the correct node but hide one required indirect dependency.

Measure whether the node:

- returns a wrong result;
- correctly abstains;
- detects missing evidence;
- requests/escalates to a larger state slice.

### D. Mechanism routing

Run the same bounded task through:

1. deterministic function;
2. tiny specialist model;
3. larger reasoning model.

Compare correctness, latency, compute, energy proxy, evidence quality, and failure detectability.

### E. History compression

Delete historical logs while preserving the canonical checkpoint.

Compare future behavior against a full-history oracle.

```text
behavior changes -> checkpoint omitted relevant retained state
behavior identical -> removed history was no longer execution-relevant
```

### F. Capability versus unnecessary work

Add specialist coverage and task breadth while measuring total unnecessary activation.

Core test:

> Can capability increase while unnecessary computation decreases?

## Current compact architecture

```text
canonical state
+ explicit dependency topology
+ sparse local activation
+ activation closure
+ sufficient-state closure
+ evidence-backed deltas
+ escalation only when local machinery is insufficient
```

## Truth boundary

This is an engineering hypothesis. Sparse specialization, dependency-aware recomputation, and stateful routing already exist in adjacent research. The open question is whether pushing these principles into a canonical machine-state fabric, with extremely small nodes and deterministic dependency closure, creates useful scaling or efficiency advantages.

Matter-transfer research is intentionally outside this lane.
