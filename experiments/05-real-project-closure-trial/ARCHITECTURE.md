# Architecture

## Canonical reuse

`real_project_closure/foundation_loader.py` imports the canonical Workfloor Sentinel snapshot, 242 check contracts, 24 evaluator forms, and change semantics from sibling `experiments/02-workfloor-sentinel`. State Floor hashing is reached through that canonical source chain. Experiment 05 contains no copied Sentinel source tree and adds no alternative evaluators.

All policies start with the same 242 oracle outputs. Sparse and audited executions call the same `sentinel.checks.evaluate_check`; incomplete evidence is represented only by a typed `ABSTAIN` at the experiment's slice wrapper until the missing field is repaired.

## Train, freeze, held out

The split is explicit in `fixtures/mutation_split.json`:

1. Six training mutations may name training probes and may teach missing dependencies or record fields.
2. Training metadata is frozen and hashed.
3. Every policy receives the same verified post-training output checkpoint. The checkpoint prevents a training-phase stale output from contaminating held-out scoring; it does not repair metadata.
4. Six disjoint held-out mutations run without training probes or stored oracle answers.

The fixture loader rejects overlapping mutation IDs or held-out probes. The held-out manifest hash is attached to raw results, the evidence receipt, and every logical replay.

## Fault surfaces

| Fault | Planted metadata problem | Held-out attack |
|---|---|---|
| Direct file omission | Claim-boundary check omits `README.md`. | Unseen boundary wording. |
| Derived/report chain | Report/raw consistency check omits raw benchmark JSON. | A different scaling record than training used. |
| Incomplete evidence | Python-requirement check cannot initially read TOML content. | An unseen requirement value. |
| Conditional read | Recursive nonnegative-timing check omits raw JSON and is not exposed during training. | A negative timing in a different nested record. |
| Dormant invalid metadata | An unrelated Markdown check carries an unknown dependency kind. | New-file risk validation eventually surfaces and quarantines it. |

The dormant item does not change its check output in the held-out trace. It remains an explicit unresolved quarantine; it is not counted as a learned repair or silently deleted.

## Access observation and risk

File and record wrappers observe exact `file:path` and `file:path#field` accesses made by the canonical evaluators. A learned exact file edge is unnecessary when a declared category or directory edge already covers that access.

Declared-risk selection uses only mutation event tags and check perspectives:

- `claim` selects claim-boundary checks;
- `raw_results` selects cross-file, measurement, schema, and serialization checks;
- `config` selects configuration, identity, license, and runtime checks;
- `license` selects license checks; and
- `new_file` selects documentation, serialization, and syntax checks.

These tags are inputs in the frozen fixture, not oracle outputs. A training audit learns an edge/field proactively only for a named training probe; otherwise a discrepancy must exist. That prevents the training raw-result mutation from teaching the held-out-only conditional timing edge.

## Oracle non-leak boundary

For each transition the policy performs, in order:

1. apply the in-memory file mutation;
2. sparse route and evaluate;
3. choose audits from declared risk, frozen observed dependencies, or both;
4. audit selected checks with full evidence;
5. write provenance and replay any amended check; then
6. run all 242 checks offline for measurement.

Only step 6 computes the complete mismatch set. Its output is never consulted by steps 2–5. `oracle_measurement_*` fields are reported separately from policy work.

## Repair and provenance

An audited discrepancy may add only the exact observed file edge or attempted record field. Each repair receipt records policy, phase, transition, mutation, state hash, current/audited output hashes, observed reads, metadata before/after, action, and a provenance hash. The amended check is replayed once against current state. All checks own independent cached outputs, so no additional downstream check-result replay exists in this canonical registry.

Invalid dependency kinds are quarantined as unresolved metadata. The evidence remains in the receipt; it is not removed from the contract during the run.

## Metrics

The benchmark records exact sparse, audit, replay, full-oracle, and offline-measurement check executions; necessary, awakened, missed, and false wakes; pre-repair, detected, and silent staleness; maximum silent window; learned edges/fields; quarantines/unresolved items; wall/CPU and component times; final output hashes/equality; and replay/order determinism.

The gate's work comparison is exactly:

```text
held-out audit check executions
+ held-out replay check executions
< 242 checks * 6 held-out mutations
```

Sparse executions are reported separately. Full-oracle policy work counts all 1,452 executions and therefore cannot satisfy the strict reduction term; it is the equality/work reference.

## Counterexample minimization

Every silent stale occurrence is recorded. The minimizer greedily removes held-out mutations while replaying the complete fixed training phase until the named check's silent mismatch no longer reproduces. Each occurrence retains its minimized mutation IDs and runnable command. In this fixture, the 21 occurrences reduce to five unique policy/check reproductions, each containing one held-out mutation.

