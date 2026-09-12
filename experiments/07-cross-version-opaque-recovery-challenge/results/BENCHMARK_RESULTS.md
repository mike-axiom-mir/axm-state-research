# Cross-Version Opaque Recovery — Benchmark Results

Frozen candidate: `VERSION_AWARE_BOUNDED`. Oracle facts were loaded only after each policy action.

| Policy | Work | Full reference | Resolved coverage | Wrong resolved | Unresolved | False abstentions | Untrusted replay |
|---|---:|---:|---:|---:|---:|---:|---:|
| `BROKEN_SPARSE` | 23 | 168 | 91.6667% | 6 | 14 | 0 | 1 |
| `OBSERVED_ONLY` | 34 | 168 | 91.6667% | 4 | 14 | 0 | 0 |
| `STRUCTURAL_ONLY` | 34 | 168 | 91.6667% | 4 | 14 | 0 | 0 |
| `VERSION_AWARE_BOUNDED` | 41 | 168 | 91.6667% | 0 | 14 | 0 | 0 |
| `ABSTAIN_ALL` | 0 | 168 | 0.0000% | 0 | 168 | 154 | 0 |
| `FULL_ORACLE` | 168 | 168 | 100.0000% | 0 | 0 | 0 | 0 |

## Frozen gate

- wrong resolved outputs: **0**;
- resolved coverage: **91.6667%** (minimum **85.0%**);
- false abstentions: **0**;
- untrusted checkpoint replays: **0**;
- total policy work: **41** versus **168** full-oracle executions;
- deterministic repeat: **PASS**;
- reversed registration: **PASS**;
- gate: **PASS**.

## Per project

| Project/version | Source available | Source changed | Coverage | Wrong resolved | Final unresolved | Work |
|---|:---:|:---:|---:|---:|---:|---:|
| `opaque-workcell-v2` | yes | yes | 100.0000% | 0 | 0 | 25 |
| `opaque-workcell-v3-unavailable` | no | yes | 83.3333% | 0 | 2 | 16 |

## Retained failures

Comparison policies produced **14** wrong-output occurrences. Each occurrence carries an automatically minimized reproduction.

## Boundary

These are controlled versioned software fixtures. The unavailable-source oracle is a sealed post-action answer record, not proof that arbitrary missing source can be reconstructed. No hardware, brain, production, or component-novelty claim is made.

Held-out manifest SHA-256: `976e4bd3153ff2cc9201417f19e5d33e8f2eeff00f778f203e7b34e49e25d188`.
