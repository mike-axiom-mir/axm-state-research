# Stateborn v0.2.0 — Sparse Scale Report

Date: 2026-09-04  
Runtime: Node v24.19.0

Timing and heap deltas are environment-specific. The architectural comparison and growth shape matter more than individual milliseconds.

## v0.1 failure probe

v0.1 deep-cloned and hashed every materialized node during a turn, including dormant nodes that could not affect the action.

| Dormant nodes added | Construction | One action | Heap delta | Rules woken |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 6.784 ms | 5.321 ms | -0.429 MiB | 5 |
| 1,000 | 41.455 ms | 42.548 ms | 2.431 MiB | 5 |
| 10,000 | 417.492 ms | 551.375 ms | 38.865 MiB | 5 |
| 50,000 | 1869.753 ms | 2321.414 ms | 140.278 MiB | 5 |

Only five rules woke, yet cost grew with sleeping node count. The causal scheduler was already sparse; the canonical storage and digest boundary were not.

## v0.2 sparse probe

v0.2 commits to a deterministic generator and stores only actor state plus changed cell overrides. The field cache is runtime-only and excluded from the canonical digest.

| Logical cells | Logical nodes | Construction | One action | Heap delta | Cells materialized | Cells changed | Nodes woken | Actor events | Replay |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1,048,576 | 1,048,579 | 2.134 ms | 27.589 ms | 0.649 MiB | 2 | 1 | 4 | 2 | PASS |
| 100,000,000 | 100,000,003 | 0.608 ms | 4.177 ms | 0.382 MiB | 2 | 1 | 4 | 2 | PASS |

The second row should not be read as a speed win over the first; isolated runs are affected by warm-up and garbage collection. The supported claim is that increasing untouched logical extent did not increase materialization, changed cells, wake count, or event count.

## What “million nodes” means here

- A logical cell is independently addressable and deterministically recoverable from seed + coordinates.
- A sleeping cell is not an active object evaluating rules each turn.
- A viewed cell may be runtime-materialized without becoming canonical mutable state.
- A changed cell receives a sparse canonical override and contributes to the current digest.
- Actor and rule work remains bounded by relevance, not map area.

This does not prove performance with a million active agents, a million simultaneous changes, or a network of independent peers. Those are different experiments.
