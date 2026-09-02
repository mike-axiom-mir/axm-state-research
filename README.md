# AXM State Research

> Our research into the chain from state to output by readjusting nodes—or anything currently unknown—to find the limits and memory-reduction potential.

This repository is the canonical public research home for AXM experiments around deterministic state, sparse specialist routing, perspective fabrics, replay, evidence-preserving merge rules, and the boundary between cheap deterministic work and expensive reasoning.

The experiments are built to discover failure, not protect an idea. Raw results, failed variants, repaired variants, receipts, claim boundaries, and limitations remain attached.

## Current verified chain

```mermaid
flowchart TD
    A["Canonical state"] --> B["Change event"]
    B --> C["Sparse router"]
    C --> D["Small perspective checks"]
    D --> E["Evidence + proposed deltas"]
    E --> F["Deterministic merge/conflict gate"]
    F -->|new state events| B
    F -->|unresolved| G["Expensive capability or AI boundary"]
```

## Experiments

| Experiment | Core question | Verified result |
|---|---|---|
| [01 — AXM State Floor](experiments/01-state-floor/) | Can 10,000 registered perspective variants coexist while only relevant nodes wake? | 10,000 registered; 159 triggered; 9 changed state; deterministic replay and baseline output equivalence passed. |
| [02 — AXM Workfloor Sentinel](experiments/02-workfloor-sentinel/) | Can sparse routing avoid leaving a necessary real-project check asleep? | A planted dependency omission caused one genuine miss; the repaired map reached zero misses across seven controlled changes, with 61% false wake-ups still exposed. |
| [03 — AXM Wakeup Fuzzer](experiments/03-wakeup-fuzzer/) | Is positive activation cheaper than polling every registered check, and can a missing edge be minimized? | At 10,000 mutations, declared sparse was 6.45× faster than polling on one host; one omission caused 64 wrong transitions and minimized to one mutation. |
| [04 — AXM Adaptive Closure Verifier](experiments/04-adaptive-closure-verifier/) | Can sparse routing audit and repair activation and state-slice closure failures? | The broken control failed; audited policies repaired/replayed to equality with damage windows from 0 to 131 transitions in the controlled fixture. |
| [05 — AXM Real-Project Closure Trial](experiments/05-real-project-closure-trial/) | Does train/freeze closure survive held-out mutations over Sentinel's 242 canonical checks? | Combined risk+observed left zero silent stale outputs and used 110 audit+replay checks versus 1,452 full-oracle checks; broken and observed-only failures were retained and minimized. |

See the [Research Index](docs/RESEARCH_INDEX.md) for exact metrics, the [State Research Map](docs/STATE_RESEARCH_MAP.md) for the hypothesis tree, and [Claim Boundaries](docs/CLAIM_BOUNDARIES.md) for what has not been established.

## Run the evidence

Python 3.11 or newer is required; current experiments use only the standard library.

```bash
cd experiments/01-state-floor
python3 -m unittest discover -s tests -v

cd ../02-workfloor-sentinel
python3 -m unittest discover -s tests -v

cd ../03-wakeup-fuzzer
python3 -m unittest discover -s tests -v

cd ../04-adaptive-closure-verifier
python3 -m unittest discover -s tests -v

cd ../05-real-project-closure-trial
python3 -m unittest discover -s tests -v
```

## Collaboration rule

**One AI chat instance gets one PR lane.** A lane means one branch and one pull request for that chat's bounded work. Do not scatter one chat across multiple PRs or push into another chat's branch. Full rules are in [AGENTS.md](AGENTS.md).

## Repository layout

- `experiments/` — runnable experiments, raw output, tests, and local reports.
- `artifacts/` — sealed standalone source packages with hashes.
- `docs/` — cross-experiment evidence index, map, and claim boundaries.
- `lanes/` — append-only AI chat/PR lane receipts.
- `.github/workflows/` — independent experiment test jobs.

## License

Apache-2.0. Permission to reuse the code is not permission to detach claims from their measured scope.
