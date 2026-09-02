# AXM State Research Map

## Verified so far

- A software runtime can register 10,000 small deterministic perspective variants while leaving 98.41% dormant in the measured scenario.
- Sparse subscriptions can substantially reduce executions relative to evaluating every registered node every cycle.
- Deterministic receipts, canonical hashes, explicit conflicts, and order-reversal tests can make replay claims testable.
- Current state can replace history for some predicates only when the canonical schema retains every decision-relevant fact.
- A missing routing dependency can leave a necessary check asleep even when the scheduler and handler are otherwise deterministic.
- A full-scan oracle can expose both missed wake-ups and unnecessary wake-ups.
- Activation closure and sufficient-state closure fail independently: the correct node may sleep, or it may wake without enough evidence.
- In one six-node fixture, traced missing edges/fields plus checkpoint replay restored exact output after planted faults; periodic and sampled audits still allowed bounded wrong-state intervals.
- Implicit defaults reduced resident/checkpoint bytes in one favorable 10,000-perspective State Debt fixture while preserving exact replay.
- In one six-mutation frozen held-out trial over 242 canonical real-project checks, combined declared-risk and observed-read auditing reached zero silent stale outputs with 110 audit+replay executions versus 1,452 for the full oracle.
- Observed reads alone did not cover a training-unseen conditional branch; its three silent stale occurrences were preserved and minimized.
- In one frozen cross-project transfer, combined structural+observed auditing reached zero silent stale outputs over ten unlabeled held-out mutations on two canonical repository project versions, with 597 total candidate check executions versus 1,955 full-oracle executions.
- Missing and corrupt checkpoints were detected and quarantined; verified full reconstruction restored trusted starting outputs, and all 391 reconstruction executions counted in the gate.
- Observed reads alone ended equal but still retained eight silent opaque-helper occurrences, reinforcing that final equality does not establish transition closure.

## Active hypotheses

1. Closure learned on one project/version may transfer across evaluator-source version changes without widening toward a full scan.
2. Total sparse+audit+replay+reconstruction work can remain below a full oracle when some checkpoints cannot be cheaply recovered.
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
- Auditors that pass final equality while never observing a dormant unresolved item.
- Learned dependencies that are valid for one branch but unsafe or incomplete elsewhere.
- Declared risk labels that are absent, incorrect, or adversarial.
- A verified checkpoint that is missing, incomplete, or corrupted before replay.
- Opaque helpers whose reads and public parameters expose no path-shaped dependency evidence.
- Replay hashes that accidentally commit to host measurements through nested provenance.

## Longer-range questions

- What is the smallest sufficient state for different classes of decisions?
- Which receipts stay hot, which can be compacted, and which evidence must remain lossless?
- Can real applications declare dependencies precisely enough to preserve zero missed wake-ups?
- When does process, thread, WASM worker, SIMD, or GPU mapping become useful after profiling?
- How much unresolved work reaches an AI boundary, and is that boundary stable as the deterministic floor improves?

## Hard boundary

These are software-runtime experiments. They do not establish physical computational nodes, brain or neuron equivalence, matter transfer, behavior below the software/runtime layer, or a mapping to CPU cores, GPU units, firmware, drivers, kernel mechanisms, or privileged memory. Any future substrate claim requires a genuine implementation and direct measurement on that substrate.
