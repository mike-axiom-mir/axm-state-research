# Final Report — Cross-Version Opaque Recovery Challenge

## WORKED

The frozen `VERSION_AWARE_BOUNDED` policy safely handled both held-out source
conditions in this controlled software fixture.

For v2, the evaluator's source hash differed from the training version while the
public callable, parameters, and observed reads exposed no new dependency. The
candidate quarantined the v1-bound checkpoint and guarded the single incompatible
opaque node after each event. All v2 decisions were resolved and correct.

For v3, the checkpoint and trusted evaluator source were unavailable. The
candidate did not invent or reconstruct the missing semantics. It kept
`opaque-guard` and `safety-summary` explicitly unresolved while the other ten
nodes continued to produce resolved outputs.

The candidate passed repeated replay and reversed-registration tests. Invalid
checkpoint reuse, comparison-policy misses, escalation receipts, and minimized
counterexamples remain in raw evidence.

## FAILED

Observed reads did not recover the changed hidden dependency: `OBSERVED_ONLY`
produced 4 wrong resolved outputs. There were no opaque reads to transfer.

Ordinary structural shape did not recover it either: `STRUCTURAL_ONLY` also
produced 4 wrong resolved outputs. The opaque node had no public path parameters
that pointed at the new field.

Canonical current state was not sufficient to execute the v3 decision by itself.
State supplied the data, but the decision semantics were missing. Two outputs had
to remain unresolved for all seven scored v3 snapshots.

The candidate did not learn the v2 dependency. It contained the uncertainty by
executing the changed opaque capability after every event. That is safe here, but
is not sparse closure for that node and may become expensive with many changed
opaque evaluators.

## MEASURED

| Measurement | Frozen result |
|---|---:|
| Registered nodes per project | 12 |
| Held-out projects | 2 |
| Held-out transitions | 12 |
| Scored node decisions | 168 |
| Candidate resolved decisions | 154 |
| Candidate resolved coverage | 91.6667% |
| Frozen minimum coverage | 85.0% |
| Wrong resolved outputs | 0 |
| False abstentions | 0 |
| Untrusted checkpoint replays | 0 |
| Explicit unresolved decisions | 14 |
| Final unresolved nodes in v3 | 2 |
| Candidate policy work | 41 operations |
| Full-oracle reference | 168 executions |
| Work reduction by this accounting | 75.5952% |
| Checkpoint validations / quarantines | 2 / 2 |
| Initial reconstruction executions | 22 |
| Sparse executions | 10 |
| Changed-source guard executions | 5 |
| Downstream replay executions | 2 |
| Escalation events | 7 |
| Repeat logical replay | PASS |
| Reversed registration | PASS |

The broken sparse policy used 23 operations, produced 6 wrong resolved outputs,
and replayed one source-mismatched checkpoint. Observed-only and structural-only
each used 34 operations and produced 4 wrong resolved outputs. `ABSTAIN_ALL`
performed no policy work but resolved 0% and created 154 false abstentions. The
full oracle used 168 executions and resolved 100%.

Fourteen wrong-output occurrences were retained across failing policies. They
reduced to six unique reproducible counterexamples; the observed and structural
failures each minimized to the single `v2-hidden-off` mutation.

## UNKNOWN

- Whether per-event guarding stays cheaper with tens, hundreds, or thousands of
  changed opaque evaluators.
- Whether a trustworthy language/runtime mechanism can emit complete dependency
  receipts for opaque code without executing it on every event.
- How much real escalation work, latency, or human attention the 14 unresolved
  decisions would cost.
- Whether the result transfers beyond these two synthetic six-transition worlds.
- Whether logical hashes remain invariant across operating systems, runtimes, or
  serialization implementations.
- Whether hostile policy code could violate the oracle boundary; this fixture
  enforces interface order, not process or security isolation.

## SURPRISE

Source-version invalidation was enough to make the policy honest without knowing
the new dependency. That is weaker than dependency discovery but still useful:
10 of 12 v3 nodes kept working while two remained unresolved. Also, six v2 guard
selections required only five guard executions because the inherited public
subscription already woke the opaque node once and deterministic deduplication
prevented double work.

## NEXT

Run one **Budgeted Opaque Version Swarm**: scale to hundreds or thousands of
changed opaque evaluators, impose a strict per-transition fallback budget, and
test whether signed/runtime-generated dependency receipts can restore sparse
routing without allowing wrong resolved outputs. This directly attacks the
candidate's weakest surviving behavior—running every changed opaque capability
after every event.
