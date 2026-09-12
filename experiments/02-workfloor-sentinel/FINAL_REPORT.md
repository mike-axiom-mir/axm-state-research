# AXM Workfloor Sentinel — Final Report

## WORKED

- Sentinel loaded 27 real AXM State Floor files into one canonical project state.
- It registered 242 checks across 21 perspectives.
- Its oracle detected the deliberately missing dependency: one necessary cross-file check stayed asleep and made the sparse result incorrect.
- Adding the missing raw-JSON subscription reduced missed wake-ups from 1 to 0 across the same seven changes.
- The repaired sparse state matched all 242 oracle outputs after every transition.
- Three repeated logical replays and reversed check registration produced the same hash.
- Six Sentinel tests and all eight rechecked foundation tests passed.

## FAILED

- The first dependency map was not complete.
- The repaired map still over-routed: 36 of 59 wake-ups did not produce changed outputs.
- A newly added file received only category-level aggregate coverage; normal per-file contracts were not generated during the run.
- Zero misses was demonstrated only on seven designed mutations, not every possible project change.

## MEASURED

| Variant | Registered | Sparse wake-ups | Necessary | Missed | False | Final oracle equivalence |
|---|---:|---:|---:|---:|---:|:---:|
| Incomplete dependency map | 242 | 58 | 23 | 1 | 36 | FAIL |
| Repaired dependency map | 242 | 59 | 23 | 0 | 36 | PASS |

Repaired performance across all seven transitions:

- sparse routing: 0.097 ms;
- sparse evaluation and merge: 101.517 ms;
- total sparse path: 101.614 ms;
- optimized shared-snapshot full scan: 795.143 ms;
- duplicated-packet full scan: 3,816.443 ms;
- shared scan / sparse ratio: 7.83×;
- duplicated scan / sparse ratio: 37.56×;
- cumulative duplicated packet bytes: 401,987,894;
- evaluation reduction versus full scan: 96.5171%;
- false wake-ups as a share of sparse wake-ups: 61.0169%;
- registry/router retained-size estimate: 81,842 bytes;
- initialized canonical state: 237,027 bytes.

## UNKNOWN

- Whether dependency completeness survives hundreds of mutations or organic Git history.
- Whether dependencies can be inferred safely instead of manually declared.
- Whether field-level routing can reduce false wake-ups without creating new misses.
- Whether dynamic new-file registration stays deterministic.
- How the system behaves with history-sensitive, causal, or AI-backed checks.
- Whether these gains persist under concurrent or cross-language execution.

## SURPRISE

One missing subscription was enough to poison final equivalence through five later transitions. The router itself behaved perfectly according to its declared map; the map was wrong. This changes the central safety question from “Is the scheduler deterministic?” to “How do we prove the dependency map is complete?”

The new invalid Python file also showed both strength and weakness: one category-level check caught it immediately, but the static registry did not spawn its normal individual checks.

## NEXT

Build **AXM Wakeup Fuzzer**: systematically mutate files and dependency declarations, compare every transition with the oracle, automatically minimize any missed-wakeup counterexample, and deterministically create checks for newly discovered files. The primary target is zero misses over thousands of mutations; the secondary target is reducing the current 61% false-wakeup rate.
