# Stateborn v0.2.0 — Emergence Ledger

Purpose: retain useful accidents and failed approaches without promoting either into canon.

## Retained: reciprocal situation

**Status:** OBSERVED IN CURRENT AXM SOURCE

Starting compatibility was deliberately seeded:

- player holds food and has water pressure;
- Rhea holds water and has food pressure;
- the actors are adjacent.

No quest or bespoke “reciprocate” action was supplied. The chain was:

1. player executes generic `share(food, rhea)`;
2. Rhea receives food, gains a directed relation memory toward the player, and still perceives the player's water pressure;
3. Rhea's generic autonomy selects `share(water, player)` with cause `remembered_relation`;
4. the situation rule sees opposed share events and projects `mutual_aid` with evidence `[0, 1]`.

Why retain it: the second act was not the player's command, both actors used the same transform, and replay reproduces the exact branch.

What it does not prove: that Rhea understands gratitude, that the behavior generalizes, or that the result is fun.

## Retained: wait counterfactual

**Status:** OBSERVED IN CURRENT AXM SOURCE

With the same genesis, player `wait` yields:

1. player wait event;
2. Rhea request-food event with cause `observed_holder:player`;
3. `unanswered_need(rhea, food)`.

Why retain it: it demonstrates that a different player state transition changes another actor's selected intent and produces a different situation/digest.

## Rejected architecture, retained lesson

**Status:** OBSERVED FAILURE

v0.1 materialized, cloned, and hashed dormant nodes. At 50,000 added dormant nodes, a single action took about 2.3 seconds and added about 140 MiB in the measured process even though only five rule nodes woke.

Lesson: sleeping nodes must be commitments or recoverable addresses, not mandatory in-memory objects inside every transaction.

## Suspected authored bias

**Status:** NOT YET RESOLVED

The initial holdings, pressure values, adjacency, thresholds, and deterministic priority order were designed by us. They strongly enable reciprocity. The result is not spontaneous from an empty universe.

Next falsification test: randomize compatible and incompatible genesis conditions across many seeds, hold transforms fixed, and measure situation diversity, dead ends, loops, and frequency. Do not add new “story” rules until those distributions are known.

## Reuse rule

An output may be reused only when its source seed, prior digest, events, causes, resulting digest, and replay status are preserved. A visually attractive but causally untraceable output is not reusable research evidence.
