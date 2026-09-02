# AXM Workfloor Sentinel — Results

This experiment watches the real AXM State Floor source snapshot while applying seven recorded adversarial changes in memory.

| Variant | Checks | Perspectives | Sparse wakeups | Necessary | Missed | False | Final oracle equivalence |
|---|---:|---:|---:|---:|---:|---:|:---:|
| Known dependency bug | 242 | 21 | 58 | 23 | 1 | 36 | FAIL |
| Repaired dependency map | 242 | 21 | 59 | 23 | 0 | 36 | PASS |

## Repaired trace

| Change | Awakened | Necessary | Missed | False | Sparse = oracle |
|---|---:|---:|---:|---:|:---:|
| remove-software-boundary | 10 | 4 | 0 | 6 | PASS |
| inject-dynamic-eval | 11 | 3 | 0 | 8 | PASS |
| break-output-equivalence-claim | 10 | 3 | 0 | 7 | PASS |
| remove-conflict-test-name | 12 | 3 | 0 | 9 | PASS |
| delete-license | 6 | 6 | 0 | 0 | PASS |
| raise-python-requirement | 9 | 3 | 0 | 6 | PASS |
| add-invalid-python-file | 1 | 1 | 0 | 0 | PASS |

## Performance totals

- Sparse routing: 0.097 ms
- Sparse execution + merge: 101.517 ms
- Shared-snapshot full scan: 795.143 ms
- Duplicated-packet full scan: 3816.443 ms
- Shared full scan / sparse: 7.83×
- Duplicated full scan / sparse: 37.56×
- Cumulative duplicated packet bytes: 401,987,894

## Boundary

The project files are real foundation source. The seven changes are deterministic adversarial fixtures applied only in memory, not an organic Git history. Zero misses applies only to this check registry and trace.
