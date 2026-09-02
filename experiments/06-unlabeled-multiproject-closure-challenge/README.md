# AXM Unlabeled Multi-Project Closure Challenge

This frozen experiment asks whether closure learned from one canonical repository project can transfer to two disjoint canonical project versions when held-out mutations carry no declared risk labels.

## Gamer / plain-language explanation

A guard team trains in one level, then enters two different official levels with no colored danger markers. Ordinary clues remain—the changed path, operation, file type, and guard contract shape—but the hidden level contains a missing save, a damaged save, a helper that hides what it reads, and a three-link output chain. The candidate passes only if no stale result remains silent, the ending matches the all-guards reference, every repair or quarantine leaves a receipt, and all of its guard work—including checkpoint reconstruction—stays below the full scan.

The analogy is explanatory only. The measured software-runtime evidence is authoritative.

## Canonical project/version boundary

`manifests/projects.json` identifies each project by repository path, base commit, and Git subtree hash:

- training: canonical `experiments/01-state-floor` at `7ba2b1d…` / tree `842eef1e…`;
- held out: canonical `experiments/02-workfloor-sentinel` at the same commit / tree `8006b291…`;
- held out: canonical `experiments/04-adaptive-closure-verifier` at the same commit / tree `53b39eb9…`.

The experiment imports Sentinel contracts/evaluators and repository snapshots. It does not duplicate prior source. In-memory mutations are controlled challenge variants, not new projects or new canonical versions.

## Compared policies

- `BROKEN_SPARSE_NO_AUDIT`;
- `OBSERVED_READS` learned only from the training project;
- `STRUCTURAL_AUDIT` using deterministic operation/path/check shape;
- `COMBINED_STRUCTURAL_OBSERVED`, the named frozen candidate; and
- `FULL_ORACLE`.

The same contracts, evaluators, cached outputs, and offline scorer apply to every policy. The scorer runs only after each policy finishes routing, auditing, repair, and replay.

## Checkpoint protocol

Checkpoint envelopes bind project/version provenance, canonical snapshot hash, frozen policy hash, output hash, payload hash, and provenance hash. An absent, corrupt, or mismatched checkpoint is quarantined and never replayed. A verified canonical source may be fully reconstructed, with every check execution charged to total policy work. Without a trusted source, recovery abstains and escalates unresolved.

## Run

Python 3.11 or newer; standard library only.

```bash
python3 -m unittest discover -s tests -v
python3 run_benchmarks.py
python3 run_benchmarks.py --crosscheck-only
```

The first scored evidence is intentionally blocked until the pre-score freeze receipt and SHA-256 manifest verify.

## Evidence map

- `ARCHITECTURE.md` — source reuse, no-leak boundary, policies, and accounting.
- `FINAL_REPORT.md` — WORKED/FAILED/MEASURED/UNKNOWN/SURPRISE/NEXT result.
- `FAILURE_LIMITATIONS.md` — retained failures and scope limits.
- `NEXT_EXPERIMENT.md` — strongest next attack.
- `manifests/` — frozen project/version, training, held-out, and checkpoint protocol inputs.
- `results/raw/` — first score, JSONL receipts, checkpoint evidence, and minimized misses.

No component novelty is claimed. No AI capability, model-weight change, substrate mapping, production actuator, or cross-machine determinism is tested.

