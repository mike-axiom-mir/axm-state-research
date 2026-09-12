# Failures and Limitations

## Failures retained

- `BROKEN_SPARSE` produced 6 wrong resolved outputs and replayed one checkpoint
  bound to the wrong evaluator source hash.
- `OBSERVED_ONLY` produced 4 wrong resolved outputs because the opaque helper
  exposed no reads to its tracer.
- `STRUCTURAL_ONLY` produced 4 wrong resolved outputs because the public contract
  exposed no useful path-shaped parameter.
- `ABSTAIN_ALL` produced no wrong resolved output only by resolving nothing. Its
  0% coverage and 154 false abstentions fail the frozen usefulness gate.
- The candidate left 14 v3 decisions unresolved. This is intended safe behavior,
  but it is still work the deterministic floor could not perform.

All 14 failing-policy occurrences remain in `results/raw/counterexamples.json`.
They collapse to six unique reproduction specifications, all verified.

## What the passing gate does not mean

The candidate did not infer the new v2 hidden path. Source-hash mismatch caused a
bounded fallback execution after every event. With many incompatible opaque
nodes, that rule can approach a full scan.

The v3 oracle answer record lets the offline scorer say whether abstention was
appropriate. It does not give the runtime a way to reconstruct unavailable code,
and it is not evidence that state alone contains decision semantics.

The oracle boundary is architectural, not adversarial. The scorer loads its file
after policy action, but everything runs in one Python process and repository. A
malicious policy is outside this experiment.

“Work” counts deterministic operations, not equal-cost CPU instructions. A
checkpoint validation, field read, opaque handler, and full-oracle check may have
different real costs. The observed millisecond timings are too small and too
host-specific for a performance claim.

The worlds, version changes, checkpoint faults, and evaluator implementations are
synthetic controlled fixtures. There are only 12 nodes per project and 12
held-out transitions. No production, security, distributed, AI, hardware,
cross-machine, or novelty conclusion follows.

Receipt sizes were measured, but receipt compaction, long-duration growth, and
retrieval cost were not tested. Conflicting node deltas were not exercised here;
earlier merge/conflict behavior is not widened by this experiment.

After scoring, the evidence verifier required one receipted portability correction:
the original form required the exact local freeze commit ID to exist, while the
authorized GitHub connector preserves trees and creates different commit IDs. The
corrected verifier resolves the exact frozen tree in ancestry and checks original
blob hashes. The policy, fixtures, oracle, gate, score, and raw evidence did not
change.
