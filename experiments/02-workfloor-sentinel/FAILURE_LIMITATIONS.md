# Failure / Limitations

## What failed

1. **The original dependency map missed necessary work.** One cross-file checker read both the final report and raw benchmark JSON but subscribed only to the report. Changing the raw JSON left it asleep. The sparse state diverged from the oracle and remained wrong through later unrelated changes.

2. **Correct routing was not precise routing.** After repair, 59 checks woke across seven changes, but only 23 outputs needed recomputation. Thirty-six wake-ups were false positives: 61.0169% of sparse executions.

3. **New-file handling is incomplete.** Adding invalid `ghost.py` woke the aggregate Python parser and was detected, but Sentinel did not dynamically create the normal per-file checks for the new file. The registry is static during a run.

4. **Declared dependencies remain human-authored truth claims.** The oracle can detect an omission when a trace exercises it, but passing seven changes does not prove the map complete for every possible change.

## Measurement limitations

- Timings are one instrumented run on the recorded host, not a statistical latency study.
- The shared full scan builds receipts and evidence for every check; another optimized oracle could be faster.
- The sparse path includes deterministic merge/provenance work, while the oracle measures evaluation/receipt work and does not merge every result.
- The 401,987,894 duplicated bytes are cumulative serialized packet traffic, not simultaneously resident memory.
- Process RSS is process-wide and affected by earlier allocations.
- Check initialization and trace performance are Python-specific.

## Scope limitations

- The watched files are real, but all seven changes are designed fixtures applied in memory.
- The 242 checks are heterogeneous file/rule instances, not 242 independent expert disciplines.
- Check policies are only examples. A 240-character line threshold is not universal truth.
- No AI, Git integration, live filesystem watcher, concurrency, crash recovery, untrusted plugin sandbox, or distributed state is present.
- No history-sensitive check appears in this trace.
- Determinism is established on this Python/runtime representation, not across languages or machines.
- The oracle assumes evaluator purity. Hostile evaluators are not isolated.
- Evidence hashes prove which canonical content was read, not that external claims inside that content are true.

## Unsupported claims

This experiment does not establish that sparse routing is universally safe, that dependency declarations can replace testing, that every new file will receive complete coverage, or that the software maps directly to CPU/GPU nodes.
