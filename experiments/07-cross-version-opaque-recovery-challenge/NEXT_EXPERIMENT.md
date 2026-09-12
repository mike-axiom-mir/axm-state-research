# Next Experiment — Budgeted Opaque Version Swarm

## Single strongest question

Does the version-aware fallback remain useful when many opaque evaluators change
at once, or does “execute every incompatible evaluator after every event” collapse
toward a full scan?

## Frozen challenge

Register 100, 1,000, and—if practical—10,000 deterministic opaque evaluator
variants. Change source hashes for a controlled fraction while keeping public
contracts uninformative. Impose a strict execution budget per transition before
scoring.

Compare:

- source-hash guard on every incompatible evaluator;
- explicit unresolved for every incompatible evaluator;
- a bounded scheduler using trusted runtime-generated read/dependency receipts;
- randomized or sampled auditing as a failure control;
- abstain-all; and
- full oracle.

Freeze the evaluator versions, mutation stream, budget, coverage threshold,
receipt format, and scoring rules before the first run. Oracle data must remain
post-action only. Every wrong resolved output and unnecessary abstention must be
retained and minimized.

## Pass gate

- zero wrong resolved outputs;
- zero untrusted replay;
- a pre-frozen minimum resolved-coverage target;
- total execution plus receipt/validation work below full oracle;
- explicit budget compliance on every transition;
- repeat and reversed-order logical replay;
- no claim that generated variants are unique disciplines.

## Why this is next

Experiment 07's candidate passed because only one changed evaluator needed a
per-event guard. Scaling that exact weakness is more informative than adding an
AI capability or another richer application now.
