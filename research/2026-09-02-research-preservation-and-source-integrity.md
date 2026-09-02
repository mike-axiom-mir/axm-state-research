# Research Preservation and Source Integrity

**Status:** lane proposal / research-governance rule  
**Date:** 2026-09-02

## Purpose

The state-research direction overlaps with fast-moving academic and industry work. Because the field is changing quickly, this repository should preserve not only polished conclusions but also enough of the path to recover how each conclusion was reached.

This is an AXM-side research choice. It is not a claim about how every outside organization works.

## Preservation rule

For material research steps, preserve four layers whenever practical:

```text
1. RAW OBSERVATION / QUESTION
2. WORKING HYPOTHESIS
3. EXTERNAL SOURCES + EXPERIMENTAL EVIDENCE
4. CURRENT COMPRESSED MODEL
```

Compression is useful, but the root evidence should remain recoverable.

## Do not silently erase the path

Do not reduce a research result to a capability while silently discarding:

- where the idea came from;
- which part was user observation;
- which part was model reasoning;
- which part came from external research;
- which experiments supported it;
- which experiments contradicted it;
- which uncertainty remains;
- what was intentionally excluded.

If a later abstraction hides lower-level detail for usability, preserve a path back to the underlying research record.

## Source integrity

When external research materially influences a lane:

- store direct source links where possible;
- prefer official research pages, papers, repositories, and documentation;
- distinguish a company publication from independent evidence;
- record publication/check dates when useful;
- do not convert research adjacency into a novelty claim;
- keep future-watch anchors for organizations whose work may move closer to the state layer.

## Claim labels

Use explicit labels when useful:

- **OBSERVED** - directly measured in an AXM experiment;
- **EXTERNAL FACT** - supported by a cited external source;
- **INFERENCE** - reasoned from evidence but not directly measured;
- **HYPOTHESIS** - testable proposed explanation or architecture;
- **ANALOGY** - explanatory mapping only;
- **UNKNOWN** - unresolved;
- **REJECTED** - contradicted by retained evidence.

Do not upgrade one label into another without new evidence.

## Preserve failures

A failed route is useful state.

When practical, failures should retain:

```text
input state
expected transition
actual transition
missed dependency or failed assumption
measured cost
repair if any
whether the hypothesis changed
```

This prevents future work from repeatedly rediscovering the same dead path after conversational context is gone.

## Preserve disagreement and boundaries

If external research converges with AXM, record it.

If it challenges AXM, record it just as clearly.

If a broad mechanism already exists elsewhere, narrow the AXM claim rather than stretching novelty.

Example already applied in this lane:

```text
NOT CLAIMED UNIQUE:
- sparse specialists
- MoE routing
- dependency-aware recomputation
- stateful routing
- event-driven computation

STILL OPEN TO TEST:
- canonical deterministic machine state
- extremely small declared-state specialist nodes
- dependency-derived wake-up
- evidence-backed local deltas
- activation closure + sufficient-state closure
- compute scaling with changed state rather than total capacity
```

## Simple interfaces are allowed

A simple user interface is not the problem.

A future tool may expose commands such as:

```text
"make this"
"check this"
"optimize this"
```

while hiding implementation complexity during ordinary use.

The requirement is that the underlying research record remains inspectable and attributable rather than being erased merely because the interface becomes simple.

## Research-to-product ladder

Recommended structure:

```text
RAW LOGS
   |
   v
RESEARCH NOTES
   |
   v
MEASURED EXPERIMENTS
   |
   v
COMPRESSED ARCHITECTURE
   |
   v
PRODUCT / USER INTERFACE
```

The ladder should remain traversable downward.

## Why this matters here

The state-research direction is early enough that premature abstraction could erase information needed to discover whether apparently separate fields share a lower structure.

A future system should be able to answer:

- Which experiment first exposed this dependency rule?
- Which outside paper independently converged with it?
- Which claim was later weakened?
- Which state representation failed?
- What was measured versus inferred?
- What did we deliberately keep out of scope?

## Minimal artifact set for substantial research lanes

Prefer:

1. a lane manifest;
2. a raw or near-raw checkpoint/log;
3. a compressed research note;
4. source/prior-art links;
5. experiment receipts/results when available;
6. a visual map when it improves recovery;
7. explicit out-of-scope and falsification sections.

## Current lane decision

This PR preserves:

- the raw state/friction conversation checkpoint;
- current compressed hypotheses;
- corporate/academic prior-art anchors;
- explicit novelty boundaries;
- measurable failure conditions;
- separate research boundaries for unrelated branches such as matter transfer.

No CANON status is implied by adding this file.
