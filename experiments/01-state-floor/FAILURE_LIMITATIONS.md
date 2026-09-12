# Failure / Limitations

## Hypotheses that failed or weakened

1. **Plain current values were not sufficient memory.** They disagreed with full-history decisions in 407 of 500 generated sequences. The missing facts were maximum historical load and material-transition count.

2. **Ten thousand registrations were not free.** The registry/router retained-size estimate was 3,658,200 bytes, startup took 35.089 ms, and the sparse transition took 158.105 ms on this host.

3. **More variants did not create more useful knowledge.** At 10,000 registered nodes, 159 nodes emitted proposals but only 9 nodes caused canonical changes. The merge gate deduplicated 169 deltas. This workload shows cheap dormancy and heavy semantic duplication, not 10,000 useful specialists.

4. **Receipt integrity initially duplicated expensive work.** The first 10,000-node sparse run took 667.410 ms because every invocation recomputed the same state hash. Caching one hash per cycle reduced it to 158.105 ms. The pre-repair evidence is preserved under `results/pre_hash_cache/`.

## Measurement limitations

- Each benchmark scale is one timed primary run plus deterministic replay runs, not a statistically powered latency study with warmups, confidence intervals, process pinning, or isolated host load.
- `tracemalloc` begins after registry construction, so its peak excludes registry allocation. Registry size is a separate recursive Python retained-size estimate.
- Linux process RSS is process-wide and affected by allocator retention; sparse and baseline snapshots are not clean isolated-process totals.
- Baseline duplicated bytes are cumulative serialized packet bytes, not simultaneously resident memory. Packets are decoded sequentially.
- Timing under `tracemalloc` includes instrumentation overhead.
- The naive baseline is faithful to the requested duplicated full-packet design but is intentionally not an optimized full-scan competitor.

## Architecture limitations

- Only 16 genuinely different handler families exist. Remaining nodes are deterministic scoped variants.
- Partition routing is exact and synthetic. Real semantic relevance may be harder to know and false dormancy could hide necessary work.
- Handlers run sequentially in one Python process. No thread, process, SIMD, GPU, WASM, or hardware-node mapping is tested.
- No real AI model is connected. Ambiguity stops at an explicit escalation queue.
- Node versions are static strings; there is no hot upgrade, migration, signature, or version compatibility system.
- The state view is not a hostile-code sandbox.
- Evidence references hash state values but do not validate external source artifacts.
- There is no crash recovery, durable event log, transactional persistence, distributed consensus, access control, or untrusted plugin isolation.
- Conflict accumulation and provenance growth are bounded only by the workload; long-running compaction has not been tested.
- Cross-language and cross-machine canonicalization are unproven.
- The state-versus-history repair works only for the two explicit predicates tested. Arbitrary order-sensitive, causal, audit, legal, or explanatory tasks may require retained history.

## Claims this experiment does not support

- that the runtime operates below software;
- that registered perspective nodes are CPU or GPU nodes;
- that 10,000 unique experts were created;
- that AI coordination is obsolete;
- that deterministic functions can resolve all ambiguity;
- that history can generally be discarded;
- that the measured speed ratio transfers to other applications or machines.
