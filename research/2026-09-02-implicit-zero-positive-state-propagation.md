# Implicit-Zero / Positive-State Propagation

**Status:** working hypothesis / measurable architecture candidate  
**Date:** 2026-09-02  
**Lane:** `chatgpt/state-friction-specialist-fabric-2026-09-02`

## Origin observation

The usual human description of binary computation emphasizes two explicitly represented alternatives:

```text
0 / 1
false / true
off / on
```

The research observation here is different:

> For many higher-level state machines, an inactive/default branch may not need to be retained as active state at all. The useful primitive may be **absence versus causally relevant presence**, followed by propagation only along dependencies that become reachable.

This is not a claim about replacing physical binary hardware. It is an architectural hypothesis about how higher-level machine state, memory, specialist activation, and incremental computation might be represented more efficiently.

## Core inversion

Dense representation:

```text
A = 0
B = 0
C = 1
D = 0
E = 0
F = 1
G = 0
...
```

Sparse / implicit-zero representation:

```text
PRESENT:
C
F

DEPENDENCIES:
C -> H
C -> J
F -> K
```

In the second form, inactive/default state is implicit unless it is needed to distinguish future behavior.

Compact rule:

```text
ABSENT / DEFAULT
    -> no active consequence
    -> no specialist wake-up

PRESENT / CHANGED
    -> expose only reachable consequences
    -> wake only affected nodes
```

## `if/then` as propagation rather than stored duality

The useful interpretation is not "1 means yes and 0 means no."

It is closer to:

```text
IF state X becomes causally relevant
THEN expose the transitions reachable from X

IF one of those transitions produces Y
THEN expose the transitions reachable from Y

IF no relevant state changes
THEN no downstream work is required
```

This makes the machine resemble an event/state propagation fabric rather than a loop that repeatedly scans the entire possibility space.

## Relation to state-level specialist nodes

This hypothesis composes directly with the specialist-fabric lane:

```text
canonical state
    |
    v
small positive delta
    |
    v
dependency topology
    |
    v
only relevant nodes wake
    |
    v
local checks / transformations
    |
    v
new deltas
    |
    v
repeat until settled
```

The architecture trades repeated global scanning for a stronger requirement:

> The dependency topology must be extremely trustworthy.

A missing dependency can allow a node to remain asleep when its output should change. This was already observed in AXM state-floor experiments: an incomplete dependency subscription produced a missed wake-up and poisoned canonical correctness downstream until the dependency map was repaired.

Therefore sparse activation does not remove correctness cost. It relocates correctness pressure into **dependency truth, activation closure, and sufficient-state closure**.

## Memory interpretation

The observation is not:

> more memory creates more mistakes.

The stronger version is:

> Retained state has a lifetime cost even while inactive, and incorrect or unnecessary retained state can become disproportionately expensive if it is later activated or propagated.

Possible costs of retained state include:

- residency;
- indexing;
- serialization;
- checkpoint inclusion;
- migration/copy work;
- dependency bookkeeping;
- search/retrieval surface;
- validation burden;
- future activation risk;
- propagation and repair cost if stale or wrong.

## State Debt

Working term:

> **State Debt** = retained information that no longer contributes to reproducing the correct future, but still consumes resources or carries future activation/propagation risk.

This can include:

- obsolete state;
- duplicate state;
- irrelevant perspective state;
- stale dependencies;
- unnecessarily explicit default/false values;
- historical detail whose relevant consequences have already been compressed into current state;
- incorrect retained state that is currently dormant.

A first-order bookkeeping model:

```text
state_debt_cost
  = residency_cost
  + indexing_cost
  + checkpoint_cost
  + migration_cost
  + dependency_cost
  + validation_cost
  + expected_activation_risk
```

For incorrect state, add potential downstream cost:

```text
mistake_lifetime_cost
  = state_debt_cost
  + activation_cost
  + propagation_cost
  + rollback_or_repair_cost
```

These are conceptual terms until concrete units are defined by experiment.

## Minimum sufficient current state

The optimization target is **not minimum memory at any cost**.

It is:

> retain the minimum current state sufficient to reproduce the correct future under the declared scope.

This preserves an important truth boundary:

- if removing a historical/state element changes a correct future result, it was not unnecessary;
- if removing it leaves all relevant future behavior identical, the element may be compressible, derivable, or safely implicit under that scope.

This links directly to the checkpoint work already discussed in the lane:

```text
long history
    -> retained consequences
    -> sufficient checkpoint
    -> old path can be discarded if replay equality remains exact
```

## Perspective and memory

A "perspective" can be treated as a declared subset of state plus dependencies it must observe.

Adding a perspective may add:

```text
observed state
+ retained local state
+ dependency edges
+ wake conditions
+ possible outputs
```

The problem is not that broader perspective is inherently bad. The question is whether the perspective needs to remain resident when it has no reachable consequence from the current state.

Possible design target:

```text
PERSPECTIVE REGISTERED
but
PERSPECTIVE STATE NOT RESIDENT
until a dependency makes it relevant
```

This separates **capability availability** from **resident context cost**.

## Dense versus implicit-zero experiment

Build two engines that must produce the same canonical outputs.

### Engine A — dense state

- explicitly retain active and inactive/default state;
- scan or evaluate the full registered state/perspective set on each mutation, or the closest fair dense baseline;
- preserve the same deterministic transition semantics as Engine B.

### Engine B — implicit-zero / positive-state propagation

- omit default/inactive state where derivable;
- store only sufficient positive/relevant state plus dependency metadata;
- propagate deltas only through reachable dependencies;
- materialize additional perspective state only when required;
- discard or recompress state after it ceases to affect future behavior, where exactness permits.

## Required measurements

Compare at identical workload and identical output semantics:

```text
peak resident memory
steady resident memory
checkpoint size
cumulative checkpoint construction
migration/copy bytes
state writes
state reads
index lookups
dependency edges retained
node wake-ups
necessary wake-ups
false wake-ups
missed wake-ups
operations / work units
replay equality
oracle equality
repair cost after injected stale state
settling time per delta
```

## Core acceptance gate

The sparse representation is only stronger if:

```text
canonical_output_A == canonical_output_B
```

for every declared test case while Engine B measurably reduces one or more of:

```text
resident state
unnecessary wake-ups
checkpoint work
migration work
total executed operations
```

No memory reduction counts as success if exact output/replay truth is lost.

## Fault-injection tests

The hypothesis should be attacked directly.

### 1. Missing dependency

Remove one real dependency edge.

Expected result:

- a necessary wake-up is missed;
- oracle equality fails;
- the failure must be detected rather than silently accepted.

### 2. Dormant wrong state

Insert incorrect state that is initially inactive.

Measure:

- residency cost before activation;
- whether it is serialized/checkpointed;
- downstream impact if later activated;
- repair work required.

This directly tests the claim that dormant wrong state can accumulate lifetime cost even before it produces an incorrect output.

### 3. Redundant explicit zeros/defaults

Materialize large numbers of states that are equivalent to the implicit default.

Measure memory, checkpoint, migration, indexing, and verification cost with no output change.

### 4. Perspective over-registration

Register many specialists/perspectives that are valid capabilities but irrelevant to the current workload.

Compare:

- capability registered but dormant;
- perspective state permanently resident;
- perspective state materialized only on demand.

### 5. History compression

Run a long event history, then compare:

- full-history execution;
- retained sufficient checkpoint;
- aggressively compressed checkpoint.

The correct boundary is the smallest representation that still reproduces exact future behavior.

## Failure modes that would weaken the hypothesis

1. dependency metadata costs more than the state/work it removes;
2. sparse structures require frequent global scans to remain correct;
3. implicit defaults become ambiguous and must be materialized so often that savings vanish;
4. activation closure becomes expensive at scale;
5. state reconstruction/materialization latency dominates execution;
6. dormant perspectives require substantial hidden context even when inactive;
7. state-debt detection costs more than retaining the state;
8. exact replay repeatedly requires large amounts of apparently inactive history.

## Results that would strengthen the hypothesis

1. exact oracle equality with substantially lower resident state;
2. node work scales with the changed/reachable state rather than total registered capacity;
3. thousands or millions of registered dormant capabilities add little residency cost;
4. default/false states can remain implicit across long runs without ambiguity;
5. stale dormant state produces measurable lifetime cost, validating State Debt as a useful engineering metric;
6. checkpoint compression preserves exact replay while dropping historical detail;
7. on-demand perspective materialization reduces memory without increasing missed dependencies.

## Relationship to existing computing ideas

Pieces of this direction overlap with established areas such as:

- sparse representations;
- event-driven systems;
- reactive/dataflow programming;
- incremental computation;
- rule engines;
- dependency-driven recomputation;
- lazy/on-demand materialization;
- sparse expert routing.

No novelty claim is made for those broad mechanisms.

The narrower AXM research question is whether they can be combined with:

```text
canonical deterministic state
+ implicit default/zero state
+ positive delta propagation
+ tiny declared-state specialist nodes
+ activation closure
+ sufficient-state closure
+ exact replay checkpoints
+ explicit State Debt measurement
```

to make **registered capability much larger than resident working state** while preserving exact truth.

## Compact hypothesis

```text
Do not pay permanent memory/work cost for every possible state.

Keep only sufficient current state.
Treat default/inactive state as implicit where safe.
Propagate only real positive deltas through truthful dependencies.
Materialize additional perspective only when it becomes causally relevant.
Compress history into retained consequences whenever exact replay permits.
Measure the cost of everything that remains resident but no longer helps.
```

## Truth status

**OBSERVATION:** inactive retained state still consumes memory and related bookkeeping resources.  
**OBSERVATION:** a missed dependency can invalidate sparse specialist execution.  
**INFERENCE:** unnecessary retained state creates a lifetime engineering burden beyond immediate compute.  
**HYPOTHESIS:** implicit-zero / positive-state propagation can reduce resident state and work while preserving identical canonical behavior.  
**WORKING TERM:** State Debt.  
**UNKNOWN:** how far the architecture scales before dependency and materialization overhead dominate.
