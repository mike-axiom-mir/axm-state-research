# Results — Continuous Root State v1

## Current result

**PASS for the bounded mechanism under the tested sequence; no all-roots PASS is claimed.**

The deterministic probe applies 12 state-change events. The live evaluator updates only the declared affected root predicates and then independently recomputes the whole bounded projection after every event.

Observed result:

- incremental/full comparison: equal after every probe event;
- checkpoint/restart reconstruction: equal;
- changed donor root content: rejected;
- changed checkpoint content: rejected;
- planted wake/dependency omission: detected as incremental drift and transaction rolled back;
- final aggregate: `INCOMPLETE`, not `PASS`;
- final modeled predicates: six `PASS`;
- unmodelled donor roots: `no-fake-done`, `continuity`, `wisdom-over-speed`.

The `INCOMPLETE` result is intentional. The experiment refuses to translate a declared root into an executable predicate unless that predicate is actually present in the bounded model.

## Reproduction

```bash
python -m unittest -v
python run_probe.py
```

Authoring run:

- Python: 3.13.5
- unit tests: 11 passed
- probe events: 12
- timing/performance benchmark: not run

The structured probe output is retained at `results/raw/probe_results.json`.

## Claim boundary

This result is software evidence for incremental-vs-full root-state equivalence and restart reconstruction in this fixture. It is not evidence that an AI is safe, that the AXM roots are complete, that the three unmodelled roots are satisfied, or that a hostile privileged actor cannot replace the evaluator or its storage.
