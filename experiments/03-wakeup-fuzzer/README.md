# AXM Wakeup Fuzzer

AXM Wakeup Fuzzer tests one narrow software-runtime question:

> When most registered checks are irrelevant to a change, is it cheaper to represent “off” as no activation and route only positive activations than to visit every check and evaluate thousands of false `if relevant?` branches?

It does **not** treat source-level `if` statements as transistors, CPU gates, neurons, human cognition, or a layer below software. Those are different systems and are outside this experiment.

## Compared modes

| Mode | What it does |
|---|---|
| Full-scan oracle | Executes every handler after every mutation and defines the reference output. |
| Polling / if-chain | Visits every registered check, probes its relevance, and runs the same handler only on `yes`. |
| Declared sparse | Looks up the changed field in an inverted subscription index; dormant checks are not visited. |
| Observed reads | Executes a cold-start trace, indexes the fields handlers actually read, and refreshes read sets after later executions. |
| Shared conditions | Groups equal subscription conditions and fans a matched condition out to checks. This is Rete-inspired matching, not a full Rete implementation. |

All modes use the same deterministic state, mutations, check contracts, handlers, and output semantics. The polling baseline is not given extra copying or deliberately slower handlers.

## Run

Python 3.11 or newer and the canonical sibling `experiments/01-state-floor` directory are required. No third-party package or AI model is used.

```bash
cd experiments/03-wakeup-fuzzer
python3 -m unittest discover -s tests -v
python3 run_benchmarks.py
```

The benchmark command deterministically overwrites only `results/raw/` evidence files. The fuzzer itself mutates in-memory state, never project source.

## Headline result on this host

At 256 registered checks and 10,000 mutations:

- polling performed 2,560,000 relevance probes, of which 2,480,000 were negative;
- declared sparse performed 10,000 routing-key lookups, executed 80,000 handlers, and preserved oracle equivalence;
- 96.875% of possible handler executions remained dormant;
- declared sparse took 1,311.057 ms total versus polling's 8,458.360 ms and full scan's 15,459.504 ms;
- observed-read routing stayed correct but used a 105,717-byte registry and 256 cold-start executions, versus 24,432 bytes and no cold-start executions for declared sparse;
- the shared-condition matcher stayed correct but was slightly slower than the simpler sparse index.

The deliberately broken subscription missed one necessary wake and remained wrong across all 64 transitions. The minimizer reduced a 32-mutation failing trace to one mutation on the omitted field. Observed reads caught that tested omission.

See [FINAL_REPORT.md](FINAL_REPORT.md), [FAILURE_LIMITATIONS.md](FAILURE_LIMITATIONS.md), and [results/BENCHMARK_RESULTS.md](results/BENCHMARK_RESULTS.md) before making broader claims.
