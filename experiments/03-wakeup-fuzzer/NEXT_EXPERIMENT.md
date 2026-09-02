# Next Experiment — Adaptive Dependency Verifier

## Single question

Can declared sparse routing retain most of its measured efficiency while a bounded verification layer detects dependency drift before stale outputs persist?

## Proposed fixture

Add checks whose read sets change because of:

- a declared selector field;
- a branch not taken during cold start;
- a new field appearing later;
- a compound dependency requiring two changes;
- an external read represented by a deterministic adapter.

Compare:

1. declared sparse only;
2. observed reads only;
3. periodic full-oracle sampling;
4. deterministic risk-weighted sampling;
5. a hybrid that expires dependency confidence and escalates uncertain checks.

## Required outcome

Report detection delay, stale-transition count, oracle/sample executions, extra registry bytes, total wall time, false alarms, and minimized counterexamples. Preserve every omission that escapes the verifier.

Do not add an AI model. Do not claim that sampled correctness proves complete dependency routing.
