# AXM State Floor — Final Report

## WORKED

- A runnable deterministic software floor registered 10,000 node contracts while routing only relevant subscriptions.
- The 10,000-node run woke 159 unique nodes, executed handlers 188 times, accepted 11 state deltas, and had only 9 unique nodes cause canonical changes.
- Two deliberate disagreements became two explicit unresolved conflict objects and two escalation entries. Neither target value was silently written.
- All four scales produced identical final state hashes in three repeated runs. Reversed execution order also produced the same final hashes.
- Sparse and naive implementations produced equivalent final state hashes at every measured scale.
- No AI model was needed. Unresolved ambiguity stopped at the escalation boundary.

## FAILED

- An under-specified canonical current state did not replace history: 407 of 500 generated cases diverged from full-history decisions.
- Scaling variants added mostly redundant support rather than meaningfully new results: 169 deltas were deduplicated at 10,000 registrations.
- “Nearly free registration” is too strong. Registration had measurable memory and startup cost.
- The initial receipt design recomputed state hashes per node and caused a large avoidable slowdown.

## MEASURED

| Registered | Triggered | Producing deltas | Changing state | Dormant | Sparse wall | Naive wall | Naive / sparse | Registry bytes |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 7 | 7 | 7 | 30.00% | 7.404 ms | 21.974 ms | 2.97× | 6,861 |
| 100 | 13 | 13 | 9 | 87.00% | 26.035 ms | 343.736 ms | 13.20× | 43,609 |
| 1,000 | 31 | 31 | 9 | 96.90% | 79.667 ms | 3,968.625 ms | 49.82× | 415,648 |
| 10,000 | 159 | 159 | 9 | 98.41% | 158.105 ms | 53,936.096 ms | 341.14× | 3,658,200 |

At 10,000 registrations:

- startup: 35.089 ms;
- retained registry/router estimate: 365.82 bytes per node;
- sparse routing: 32.569 ms;
- handler time: 23.215 ms;
- merge time: 33.690 ms;
- sparse traced peak after registry construction: 427,266 bytes;
- process RSS snapshot after the run: 25,464,832 bytes;
- naive cumulative duplicated packet bytes: 1,091,770,000;
- specialist-evaluation reduction: 99.3733%;
- stabilization: 3 iterations;
- conflicts: 2, both unresolved;
- replay, reversed order, and baseline output equivalence: PASS.

State/history test:

- cases: 500;
- plain current-state equivalence: 18.6%;
- mismatches caused by absent maximum historical load: 223;
- mismatches caused by absent material-transition count: 353;
- enriched-state equivalence after adding both aggregates: 100% for the two tested predicates.

The 341.14× ratio is specific to the duplicated JSON packet baseline. It is not a claim against optimized shared-state systems.

## UNKNOWN

- Whether sparse routing can avoid missed wake-ups in a genuinely heterogeneous real project.
- Whether an optimized shared-snapshot full scan narrows the advantage substantially.
- Whether state summaries remain compact when decisions are causal, order-sensitive, explanatory, or audit-bound.
- Whether provenance and conflicts remain manageable over long executions.
- Whether determinism survives other languages, machines, concurrency models, and numeric representations.
- Whether an AI used only at the escalation boundary improves total cost and quality.

## SURPRISE

The first performance ceiling was not node registration or handler work. It was integrity bookkeeping: repeated hashing for receipts. One cycle-level hash cache cut the 10,000-node sparse run from 667.410 ms to 158.105 ms without changing its output. Proof machinery must itself use the state floor's no-duplication rule.

## NEXT

Run a real-trace semantic invalidation experiment with genuinely different checks and three baselines. The decisive metric is not speed; it is **zero missed necessary wake-ups while preserving output equivalence**.
