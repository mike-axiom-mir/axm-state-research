# Final Report

## WORKED

- Five schedulers ran the same deterministic handlers and outputs against one full-scan oracle.
- In the repaired fixture, polling, declared sparse, observed reads, and shared matching had zero missed wakes and matched the oracle across 100, 1,000, and 10,000 mutations.
- Absence of activation avoided visiting dormant checks in the sparse modes.
- A planted missing dependency produced a real stale output and was automatically minimized from 32 mutations to one.
- Fixed-seed replay and reversed registration produced the same logical hash.
- Positive-token cascades reached the same terminal output as polling at 10, 100, and 1,000 stages.
- Repeated scheduler states stopped the two-token oscillation fixture after two active steps.

## FAILED

- Declared metadata was not self-validating. One omitted subscription caused one missed wake and 64 wrong transitions.
- Shared-condition matching did not improve this fixture; it was 26.696 ms slower than the direct sparse index at 10,000 mutations.
- Sparse dependency routing did not remove all useless work: 19,139 of 80,000 wakes produced no output change.
- Observed reads did not provide a free repair. They increased cold-start work, registry size, and handler time.

## MEASURED

Host: CPython 3.12.13, Linux 6.18.35 x86_64. Times are one instrumented run.

At 256 registered checks and 10,000 mutations:

| Mode | Condition probes | Handlers executed | Output changes | False wakes | Misses | Total wall | CPU time |
|---|---:|---:|---:|---:|---:|---:|---:|
| Full scan | 0 relevance probes; all handlers run | 2,560,000 | 60,861 | 2,499,139 | 0 | 15,459.504 ms | 15,457.929 ms |
| Polling | 2,560,000 | 80,000 | 60,861 | 19,139 | 0 | 8,458.360 ms | 8,458.090 ms |
| Declared sparse | 10,000 key lookups | 80,000 | 60,861 | 19,139 | 0 | 1,311.057 ms | 1,311.038 ms |
| Observed reads | 10,000 key lookups + 256 cold-start executions | 80,000 | 60,861 | 19,139 | 0 | 2,109.929 ms | 2,109.865 ms |
| Shared conditions | 20,000 shared-condition probes | 80,000 | 60,861 | 19,139 | 0 | 1,337.752 ms | 1,337.693 ms |

Polling evaluated 2,480,000 negative relevance branches. Declared sparse avoided those per-check probes and was 6.45× faster in measured total wall time. Full scan was 11.79× slower than declared sparse. Sparse handler dormancy was 96.875%.

Measured registry sizes:

| Mode | Registry bytes |
|---|---:|
| Declared sparse | 24,432 |
| Shared conditions | 34,974 |
| Polling contract mapping | 57,264 |
| Observed reads | 105,717 |

Cascade counts:

| Stages | Polling probes | Routed lookups | Probes avoided | Active steps | Quiescence iterations |
|---|---:|---:|---:|---:|---:|
| 10 | 100 | 10 | 90 | 10 | 10 |
| 100 | 10,000 | 100 | 9,900 | 100 | 100 |
| 1,000 | 1,000,000 | 1,000 | 999,000 | 1,000 | 1,000 |

Raw evidence is in [results/raw](results/raw/).

## UNKNOWN

- Whether observed-read routing remains complete with data-dependent branches, external reads, dynamically loaded code, or concurrency.
- Whether sparse routing wins when activation becomes dense or handlers are nearly free in compiled code.
- Whether shared-condition networks help with multi-field joins or repeated compound predicates.
- Cross-machine, cross-language, and cross-Python replay equivalence.
- Total process memory and cache behavior outside Python object/tracemalloc measurements.
- Any relationship to CPU gates, neural activity, human cognition, or physical state processes.

## SURPRISE

The strongest cost in the polling baseline was not handler execution. At 10,000 mutations, handler time was 543.265 ms while routing/probing consumed 7,208.716 ms. Asking millions of cheap “are you relevant?” questions dominated the measured run.

The observed-read repair worked on the planted omission, but its registry was 4.33× the deep size of the declared sparse index. It looks more like an evidence and validation tool than an automatic free replacement for declarations.

## NEXT

The strongest next experiment is an **adaptive hybrid dependency verifier**: declared sparse routing runs normally, while deterministic sampling executes a bounded oracle slice and observed-read tracer to detect stale or changing dependencies. Measure whether it catches planted branch-dependent omissions with much less than full-oracle cost, and fail closed when dependency confidence expires.
