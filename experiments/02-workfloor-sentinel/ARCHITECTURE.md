# Architecture

## Foundation reuse

Sentinel imports canonical JSON, SHA-256 hashing, structured deltas, and the deterministic merge gate from the bundled AXM State Floor v0.1.0 foundation. It adds a project snapshot, heterogeneous check contracts, dependency indexing, a full-scan oracle, missed-wakeup analysis, and a three-way benchmark.

## Check contract

```text
id
perspective
dependencies
evaluator
params
version
```

Dependencies are exact keys:

```text
file:axm_state_floor/runtime.py
category:python
directory:results
```

File changes produce keys for their exact path, parent directory, and old/new file categories. The router uses an inverted index to select checks. Checks never talk directly to other checks.

## Oracle

For each transition, the shared-snapshot oracle recomputes all 242 outputs. A check is **necessary** when its oracle output differs from the previous oracle output.

```text
missed wake-up = necessary − awakened
false wake-up  = awakened − necessary
```

Sparse correctness requires:

```text
all missed sets empty
sparse retained outputs == full oracle outputs
```

This output-based oracle is stronger than merely asking whether declared dependencies were honored. It detected a checker that read an undeclared file.

## State update

Every awakened check emits one structured delta to its unique `check_results.<id>` path. The inherited deterministic merge gate applies those results and retains evidence hashes under canonical provenance. Because each check owns one unique result path, result conflicts indicate a runtime error rather than a majority decision.

## Adversarial trace

The seven in-memory changes:

1. Reverse the software-not-hardware claim boundary in `README.md`.
2. Inject a syntactically valid `eval` call into the runtime.
3. Change one raw output-equivalence flag without updating the final report.
4. Remove the named explicit-conflict regression test.
5. Delete the Apache license file.
6. Change the required Python version from `>=3.11` to `>=99`.
7. Add a new Python file with invalid syntax.

The third change targets cross-file dependency completeness. The seventh targets category-level routing for files absent at registry construction.

## Determinism

The logical replay hash excludes timing and includes:

- each change;
- necessary, awakened, missed, and false check sets;
- output mismatch sets;
- final check results.

Three repeated repaired runs produced the same logical hash. Reversing registration order produced that same hash.

## Comparison fairness

- Sparse, oracle, and duplicated baseline use identical check contracts and evaluators.
- The shared oracle avoids per-check state copies and is the stronger performance comparison.
- The duplicated baseline implements the previous experiment's deliberately wasteful architecture.
- Common file-change construction is outside all three evaluator timings.
