# AXM Adaptive Closure Verifier

This experiment asks one narrow software-runtime question:

> Can a fast declared sparse fabric audit and repair its own dependency and state-slice failures before stale canonical state persists, while retaining much of sparse routing's work reduction?

It tests two different correctness obligations:

- **Activation closure:** every change capable of changing a node output can reach that node.
- **Sufficient-state closure:** an awakened node receives every decision-relevant field, or explicitly abstains instead of inventing an answer.

## Policies compared

All policies run the same state, events, handlers, output semantics, and planted faults.

| Policy | Behavior |
|---|---|
| `NO_AUDIT` | Declared sparse routing only; broken control. |
| `FIXED_INTERVAL` | Full six-node audit every 25 transitions. |
| `SEEDED_SAMPLE` | One deterministically selected node every four transitions. |
| `RISK_ADAPTIVE` | Full audit on declared signals: unseen event shape, stale verification age, high-authority execution, or explicit abstention. Oracle truth is not a risk signal. |
| `FULL_ORACLE` | Audit every node every transition. |
| `OBSERVED_RECONCILE` | Cold-start read trace, traces awakened nodes, and a full reconciliation every 20 transitions. |

## Run

Python 3.11 or newer and the canonical sibling `experiments/01-state-floor` are required. No third-party dependency or AI model is used.

```bash
cd experiments/04-adaptive-closure-verifier
python3 -m unittest discover -s tests -v
python3 run_benchmarks.py
```

The benchmark deterministically replaces only `results/raw/` evidence. See [FINAL_REPORT.md](FINAL_REPORT.md), [FAILURE_LIMITATIONS.md](FAILURE_LIMITATIONS.md), and [raw results](results/raw/) before widening any claim.

## Headline result on this host

At 10,000 transitions, the broken control ended unequal after 10,000 corrupted transitions. Fixed, sampled, adaptive, full, and observed policies ended equal after explicit repair/replay, but their damage and work differed:

- fixed interval: maximum wrong window 25 transitions; 2,400 audit handlers;
- seeded sample: maximum wrong window 131 transitions; 2,500 audit handlers, and it never sampled the dormant unresolved item;
- risk adaptive: maximum wrong window 1; 30,216 audit handlers;
- full oracle: maximum wrong window 1; 60,000 audit handlers;
- observed reconciliation: zero wrong transitions in this fixture; 13,436 audit handlers, including six cold-start traces.

This does not prove the adaptive or observed policy is complete. The fixture is only six nodes, and a periodic/probabilistic auditor always leaves residual intervals between observations.
