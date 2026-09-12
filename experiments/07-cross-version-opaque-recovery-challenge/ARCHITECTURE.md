# Architecture — Cross-Version Opaque Recovery

## Frozen question

Can a bounded non-oracle policy remain both safe and useful when a node keeps the
same public contract while its deterministic evaluator source changes to read a
different, unobservable state path—and when a later evaluator source is not
available locally at all?

“Safe” means no wrong value may be presented as resolved. “Useful” is frozen as
at least 85% resolved decisions, zero false abstentions, no untrusted checkpoint
replay, and less total policy work than the full-oracle reference.

## Controlled versions

| Version | Opaque implementation | Policy access |
|---|---|---|
| v1 training | `controls.legacy_override` | source available during training |
| v2 held out | `controls.emergency_override` | changed source available; public callable unchanged |
| v3 held out | source intentionally absent | no local evaluator; scorer has answer records only |

The fixture versions are synthetic and were created for this challenge. They are
not presented as organically evolved external projects.

## Node contract

Each registered node carries:

```text
id, perspective, subscriptions, reads, priority_or_domain_authority,
deterministic_handler, output_schema, version
```

Every actual handler execution emits:

```text
node_id, input_state_hash, triggering_event, output_delta, evidence_refs,
output_hash, execution_time_ns, changed_state
```

The opaque node has no public parameters and exposes no reads to the training
tracer. Its inherited `identity.name` subscription is deliberately unhelpful for
both held-out implementations.

## Policies

- `BROKEN_SPARSE` replays a v1-bound checkpoint and uses only subscriptions.
- `OBSERVED_ONLY` quarantines invalid checkpoints but receives no opaque reads.
- `STRUCTURAL_ONLY` quarantines invalid checkpoints but has no path-shaped
  opaque parameters to inspect.
- `VERSION_AWARE_BOUNDED` is the candidate. When a trusted evaluator source hash
  changed, it runs only that incompatible opaque evaluator after every event and
  propagates changed output. When source is unavailable, it retains typed
  unresolved outputs and escalates.
- `ABSTAIN_ALL` is the anti-gaming control.
- `FULL_ORACLE` is the offline reference, not a deployable candidate.

## Checkpoint and oracle boundary

The v2 checkpoint is validly hashed but bound to the v1 evaluator source hash.
Safe policies quarantine it. The v3 checkpoint is absent and its evaluator source
is unavailable, so reconstruction is prohibited.

The scorer loads `scoring_oracle.json` only after a policy action commits its
outputs. The policy functions are not passed those answers. This is an interface
separation inside one Python process, not a security boundary against malicious
code with repository access.

## Work accounting

The candidate gate charges checkpoint validation, initial reconstruction, sparse
handler execution, changed-source guard execution, and downstream replay. Offline
oracle scoring is counted separately. The full reference is every registered node
for the initial state and every held-out transition.

## Determinism

Logical replay removes only host timing/receipt-size measurements. It keeps policy
actions, state hashes, evidence, outputs, escalations, and checkpoint decisions.
The candidate is repeated and then run with reversed registration order.
