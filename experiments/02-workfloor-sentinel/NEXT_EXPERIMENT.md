# Next Experiment — AXM Wakeup Fuzzer

The strongest next project is not another larger registry. It is an adversary for the registry.

## Goal

Generate thousands of deterministic project mutations and prove that sparse output remains equivalent to a full oracle after every one. When a miss occurs, reduce the mutation sequence to the smallest reproducible counterexample.

## Required capabilities

1. Mutate content, metadata, paths, categories, additions, deletions, renames, and cross-file references.
2. Remove or alter one dependency declaration at a time.
3. Compare sparse and oracle outputs after every transition.
4. Delta-debug failing traces into minimal counterexamples.
5. Build a deterministic new-file registry transaction before evaluating added files.
6. Distinguish direct dependencies, derived dependencies, category dependencies, and history requirements.
7. Learn no dependencies automatically unless replay evidence verifies them.
8. Optimize false wake-ups only behind a zero-miss gate.

## Pass gate

```text
0 missed wake-ups over at least 10,000 deterministic mutations
100% sparse/oracle output equivalence
new files receive complete registered coverage
counterexample minimizer verified on planted routing defects
```

## Failure gate

If accurate routing requires dependencies nearly as broad as a full scan, or dependency proof costs more than the evaluations it avoids, the architecture's practical advantage has not survived.
