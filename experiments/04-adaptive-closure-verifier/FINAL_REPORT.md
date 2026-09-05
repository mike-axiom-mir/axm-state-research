# Final Report

## WORKED

- Direct, indirect, incomplete-slice, branch-dependent, dormant-invalid, and combined faults ran through six policies with identical handlers.
- Read evidence repaired three missing activation edges and one missing permitted field in the combined fixture.
- Unsupported decisions abstained; the dormant invalid value was quarantined as unresolved rather than rewritten.
- Repair rolled back to a verified checkpoint, replayed a bounded suffix, and restored final oracle equality for every audited policy.
- Fixed-seed repeat and reversed registration produced the same logical replay hash.
- Observed-read reconciliation found the branch's new read before it caused stale output in this fixture.
- Implicit default state preserved exact outputs and replay in the bounded State Debt fixture.

## FAILED

- `NO_AUDIT` was cheapest but remained incorrect: 10,000/10,000 transitions contained at least one corrupted output and final equality failed.
- Periodic and sampled auditing did not prevent damage. Fixed interval recorded 79 corrupt transitions; seeded sampling recorded 42 and a 131-transition maximum detection window.
- The seeded sampler never selected the dormant invalid perspective, so it reported zero unresolved items even though that unresolved state existed.
- The risk policy needed 5,036 full six-node audits at 10,000 transitions—50.36% of transitions—to obtain its one-transition damage window in this fixture.
- Fixed interval and observed tracing recorded transient mismatches that self-healed before a later full audit; an audit cannot reconstruct every past transient solely from current equality.

## MEASURED

Host: CPython 3.12.13, Linux x86_64. Times are one instrumented run and exclude always-on offline oracle measurement.

At 10,000 transitions with all five faults:

| Policy | Sparse handlers | Audit handlers | Corrupt transitions | Max damage window | Rollback events | Final equality | Policy work |
|---|---:|---:|---:|---:|---:|---|---:|
| No audit | 7,930 | 0 | 10,000 | undetected | 0 | FAIL | 65.450 ms |
| Fixed interval | 10,873 | 2,400 | 79 | 25 | 75 | PASS | 87.140 ms |
| Seeded sample | 10,899 | 2,500 | 42 | 131 | 288 | PASS | 101.746 ms |
| Risk adaptive | 10,927 | 30,216 | 3 | 1 | 5 | PASS | 156.510 ms |
| Full oracle | 10,927 | 60,000 | 3 | 1 | 5 | PASS | 207.127 ms |
| Observed reconcile | 10,930 | 13,436 | 0 | 0 | 7 | PASS | 133.756 ms |

The audited policies learned three edges and one permitted field in the combined long run. Risk and full policies preserved one quarantined unresolved item. Observed tracing recorded 483 read-set changes and four proactive reconciliations. The raw counter receipts are in [results/raw](results/raw/).

State Debt fixture, 10,000 registered perspectives with 80 active:

| Representation | Resident bytes | Checkpoint bytes | Writes | Index edges | Materializations |
|---|---:|---:|---:|---:|---:|
| Explicit zeros/resident state | 885,657 | 110,001 | 10,000 | 10,000 | 10,000 |
| Implicit defaults/on demand | 7,325 | 881 | 80 | 80 | 80 |

The implicit fixture used 99.173% fewer measured resident bytes and 99.199% fewer checkpoint bytes while output and replay equality passed. This is a favorable synthetic fixture, not a universal State Debt law.

## UNKNOWN

- Detection probability for faults that do not coincide with these declared risk signals.
- Whether observed tracing remains complete with opaque functions, concurrency, I/O, or dynamically loaded handlers.
- Whether learned edges remain safe when read sets are nondeterministic or attacker-controlled.
- Performance with thousands of heterogeneous real handlers rather than six controlled nodes.
- Cross-machine and cross-language determinism.
- Whether State Debt reductions persist when implicit defaults require costly reconstruction or ambiguity metadata.

## SURPRISE

Observed reconciliation beat the risk policy on this particular fixture: it used 13,436 rather than 30,216 audit handlers and prevented every planted stale-output transition. The advantage came from six cold-start traces and learning `branch_q` when the mode flip exposed the new read set. This is exactly the kind of favorable case that can disappear when important reads remain hidden.

The cheaper seeded sampler ended equal but never saw the dormant unresolved item. Final equality alone therefore overstated what it knew.

## NEXT

Run one **real-project adaptive closure trial** against Workfloor Sentinel: instrument actual file/config reads, plant dependency and evidence-slice faults in real checks, and compare observed reconciliation with declared-risk audits. The single gate is zero silent stale outputs under a held-out mutation set; any missed held-out fault remains a published counterexample.
