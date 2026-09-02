# Architecture

## Canonical reuse and project versions

Experiment 06 imports canonical snapshot/check/evaluator contracts from Experiments 01, 02, and 05. Its training and held-out project roots are separate repository subtrees frozen by commit and Git tree hash. No earlier project source is copied. Custom challenge checks add one deliberately opaque helper and a three-stage derived-output chain; all policies execute those same checks.

## Train, freeze, score

Training applies five deterministic mutations only to State Floor. Full training traces learn parameter-to-read templates such as `raw_path -> file dependency` and `source_check -> output dependency`. Opaque helper reads bypass the access wrapper, so training observation cannot see them.

Before the first held-out score, these are frozen and hashed:

- policy and checkpoint semantics;
- canonical project/version manifest;
- training mutations;
- held-out mutations; and
- checkpoint protocol.

Held-out loading validates that no risk-label, oracle-answer, expected-output, or training-probe key exists. Offline oracle answers are created only after each policy transition and never enter routing or repair.

## Structural audit

The structural policy receives only ordinary state/event shape: operation kind, path, suffix, file category, path depth, rename presence, check ID/perspective/evaluator, and public contract parameters. It selects direct parameter/path matches, rename/delete aggregate checks, opaque config-generator checks for ordinary configuration/source shapes, and derived-output checks for ordinary source/raw shapes. It never receives fault metadata or a declared risk label.

## Checkpoint verification and recovery

Validation recomputes payload, output, binding, and provenance hashes. Missing/corrupt checkpoints are explicitly quarantined. Replay is prohibited until a trusted checkpoint exists. When the canonical repository subtree is verified, all checks reconstruct the output checkpoint and those executions count in the primary work gate. Without that source, the protocol emits `abstain_escalate_unresolved` and returns no outputs.

## Repair and replay

An audit compares the cached output with a fresh execution, without consulting the scorer. Traced missing file/output dependencies are added exactly. For the opaque helper, an audited mismatch may add only a changed path already exposed by the check's ordinary path parameters. Each repair records before/after dependencies, event shapes, reads, output hashes, and a provenance hash, then replays the amended check once.

## Accounting

The candidate's primary work is:

```text
sparse check executions
+ audit check executions
+ replay check executions
+ checkpoint reconstruction check executions
+ any full-oracle policy executions
```

Checkpoint validation hashes/timing, receipt bytes, storage estimates, wall/CPU time, and offline scoring-oracle executions/time are reported separately. Sparse work is never excluded from the gate.

## Determinism

Logical replay excludes host timing and byte estimates. Repeated replay and reversed registration/order must match. Timing and object-size observations remain host-specific.
