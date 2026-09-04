# Failure and Limitations

## Preserved failure

The planted declaration omitted one actual dependency. Polling, declared sparse, and shared-condition scheduling each missed one necessary wake, then disagreed with the oracle for all 64 measured transitions. A metadata error can therefore preserve a stale output even when the scheduler itself behaves exactly as declared.

Runtime observation repaired this particular static omission, not dependency completeness in general.

## Shared matching did not beat the simple index

At 10,000 mutations, shared matching took 1,337.752 ms total versus 1,311.057 ms for declared sparse. Its shared groups performed 20,000 condition probes versus 10,000 direct field lookups. The extra structure was not useful for this simple exact-field fixture.

## Observation had measurable cost

Observed routing was output-equivalent, but required:

- 256 cold-start handler executions;
- a 105,717-byte measured registry versus 24,432 bytes for declared sparse; and
- 2,109.929 ms total at 10,000 mutations versus 1,311.057 ms for declared sparse.

It may still be valuable as validation or dependency-discovery evidence. This run does not establish the best production tradeoff.

## False wakes remain

Sparse modes executed 80,000 handlers at 10,000 mutations; 19,139 executions (23.924%) did not change an output. Exact dependency routing eliminates unrelated checks, but it does not know whether a relevant input change will cross a check's output boundary.

## Measurement boundaries

- Timings are one run on Linux 6.18.35 x86_64, CPython 3.12.13.
- `tracemalloc` peak bytes measure traced loop allocations, not total process RSS.
- `registry_bytes` is Python object deep size, not serialized or allocator-resident memory.
- Timing includes Python interpreter, instrumentation, and comparison overhead.
- The 256 checks are generated variants with cheap handlers.
- Mutations change one field at a time in an in-memory mapping.
- No concurrency, I/O scheduler, distributed state, cache topology, or cross-process transport is tested.
- The polling baseline shares handlers and relevance semantics, but real optimized runtimes can compile or vectorize condition checks differently.
- The cascade has one active linear path. Dense activation, branching fan-out, and cyclic real workloads may erase or reverse its advantage.
- Microsecond cascade timings are especially sensitive to host noise; probe counts are the stronger evidence.

## Claim boundary

This is evidence about a Python software runtime. A source-level `0/no`, absent activation token, or `if/then` branch is not automatically equivalent to a CPU gate, transistor state, neural spike, human thought, or physical state transition. Nothing here operates below software or proves a theory of brains or hardware.

The experiment also does not change the earlier bounded conclusion about state versus history: sufficient canonical state can replace tested history predicates only when the needed information has been represented.
