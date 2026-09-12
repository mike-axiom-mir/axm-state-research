# Architecture

## Foundation reuse

The experiment imports canonical hashing and deep-size measurement from the canonical sibling [AXM State Floor](../01-state-floor/). It does not duplicate that source tree.

## State and check contract

The controlled world is an in-memory mapping of 64 integer fields. A deterministic fixture registers 256 generated check variants in eight named perspective families. Four variants share each dependency signature. These are scale fixtures, not 256 unique expert disciplines.

Every check declares:

```text
id
perspective
subscriptions
actual_reads
weights
output_mode
bucket
version
```

The same handler reads one or two state fields and returns a deterministic integer or Boolean. Output modes deliberately include direct, bucketed, and parity results so a relevant wake does not always produce an output change.

## Truth oracle

For every mutation, the full oracle executes every check. A check is necessary when its current oracle output differs from its previous oracle output.

```text
missed wake = necessary check − awakened check
false wake  = awakened check − necessary check
```

Every other scheduler begins with the same outputs and is compared after every transition, not only at the end.

## Scheduling modes

### Polling / if-chain

Polling loops over every check and asks whether the changed field occurs in that check's declared subscriptions. It counts every question and every false branch. A `yes` runs the same handler used by all other modes.

### Declared sparse

An inverted index maps fields to check IDs. A mutation performs one field-key lookup; no entry means no activation. Only returned IDs execute.

### Observed reads

A read-tracking wrapper observes every field accessed by a handler. Cold start executes all checks once to learn initial read sets. Later executions can replace their indexed read sets.

This repairs the planted static omission in the tested fixture, but it has hazards:

- a cold start is mandatory;
- reads hidden behind a branch not taken during observation are not learned;
- a dependency can change while the check sleeps if the activating condition is itself unobserved;
- dynamic or external reads require stronger instrumentation;
- registry memory and handler overhead are higher.

The experiment does not claim observed routing is complete.

### Shared-condition matching

Checks with identical declared subscription tuples share one condition signature. A field index selects candidate signatures, each matched signature fans out to its checks. This exercises shared matching only; it lacks Rete's full alpha/beta network and working-memory semantics and is not called Rete.

## Broken and repaired variants

`check_00000` actually reads `f000` and `f001`. The broken contract declares only `f000`. The controlled trace changes `f001`, so polling, declared sparse, and shared matching all miss the necessary check. The repaired contract declares both fields. Both variants and their outcomes remain in raw evidence.

## Counterexample minimizer

The deterministic `ddmin` implementation removes chunks from a failing mutation list while the full oracle still proves a sparse missed wake. It stops at a one-mutation reproducer for this fixture. Mutations assign values, so removing earlier mutations preserves deterministic semantics.

## Positive-token cascade

The subordinate cascade fixture contains 10, 100, or 1,000 linear stages. Exactly one stage is active per quiescence iteration.

- polling scans every stage each iteration and discovers one positive guard;
- routed execution receives only the positive stage token;
- both produce the same terminal token after the same number of iterations.

A separate two-token `A → B → A` fixture hashes scheduler state and stops when a prior signature repeats. It demonstrates bounded oscillation detection, not general termination proof.

## Determinism boundary

Replay hashes exclude timings and include fixed seeds, mutations, ordered activation/necessity sets, output hashes, and final output hashes. Repeated and reversed-registration runs matched on CPython 3.12.13 on the measured Linux host. Cross-runtime and cross-machine determinism remain untested.
