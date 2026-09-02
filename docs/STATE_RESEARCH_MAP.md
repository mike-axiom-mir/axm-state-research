# AXM State Research Map

## Verified so far

- A software runtime can register 10,000 small deterministic perspective variants while leaving 98.41% dormant in the measured scenario.
- Sparse subscriptions can substantially reduce executions relative to evaluating every registered node every cycle.
- Deterministic receipts, canonical hashes, explicit conflicts, and order-reversal tests can make replay claims testable.
- Current state can replace history for some predicates only when the canonical schema retains every decision-relevant fact.
- A missing routing dependency can leave a necessary check asleep even when the scheduler and handler are otherwise deterministic.
- A full-scan oracle can expose both missed wake-ups and unnecessary wake-ups.

## Active hypotheses

1. Dependency completeness can be tested more aggressively with generated and minimized mutations.
2. False wake-ups can be reduced through finer dependency declarations without increasing missed wake-ups.
3. Canonical state can remain compact if temporal facts are represented as typed summaries rather than duplicated raw histories.
4. An expensive reasoning capability can operate on only the unresolved queue while deterministic work remains reproducible.
5. Receipts can support incremental verification without becoming the next dominant memory cost.

## Open failure surfaces

- Hidden dependencies and incomplete subscriptions.
- Cycles that fail to quiesce or oscillate between valid deltas.
- Conflicting authorities whose domains overlap or are underspecified.
- Non-deterministic handlers, clocks, random sources, iteration order, or environment input.
- Hashing, serialization, routing-index, receipt, and merge costs at larger state sizes.
- State schemas that silently discard decision-relevant temporal information.
- Generated variants that look numerous but exercise too little behavioral diversity.
- Cross-process and cross-machine canonicalization differences.

## Longer-range questions

- What is the smallest sufficient state for different classes of decisions?
- Which receipts stay hot, which can be compacted, and which evidence must remain lossless?
- Can real applications declare dependencies precisely enough to preserve zero missed wake-ups?
- When does process, thread, WASM worker, SIMD, or GPU mapping become useful after profiling?
- How much unresolved work reaches an AI boundary, and is that boundary stable as the deterministic floor improves?

## Hard boundary

These are software-runtime experiments. They do not establish physical computational nodes, brain or neuron equivalence, matter transfer, behavior below the software/runtime layer, or a mapping to CPU cores, GPU units, firmware, drivers, kernel mechanisms, or privileged memory. Any future substrate claim requires a genuine implementation and direct measurement on that substrate.
