# Lane Receipt — AXM Real-Project Closure Trial

```text
date: 2026-09-02 UTC
branch: ai/real-project-closure-trial-2026-09-02
base: PR #6 head d6ee5b61a42323db22c80325a2895dfbf03b2d48
target: main (intentionally stacked; displayed diff shrinks when prerequisite PR #6 merges)
chat lanes claimed: 1
pull requests allowed for this chat: 1
merge authority: human maintainer
status: implementation and first frozen benchmark complete; full verification and publication pending
```

## Bounded scope

Integrate the existing Adaptive Closure mechanisms with the canonical 242 Workfloor Sentinel checks without copying their source. Train on a deterministic mutation set, freeze metadata, score a disjoint held-out set, and require zero silent stale outputs, exact final oracle equality, provenance for every repair, and less audit+replay work than a full oracle. Compare broken/no-audit, declared risk, observed reads, combined risk+observed, and full oracle. Preserve and minimize every miss.

This is a bounded integration and measurement lane. It makes no claim that routing, tracing, auditing, rollback/replay, or counterexample minimization is a novel component.

## Source and evidence

- `experiments/05-real-project-closure-trial/real_project_closure/` — canonical imports, access tracing, policy runtime, provenance, and minimization.
- `experiments/05-real-project-closure-trial/fixtures/mutation_split.json` — six training and six held-out mutations plus five fault surfaces.
- `experiments/05-real-project-closure-trial/results/raw/` — benchmark JSON, machine split, transition/repair JSONL, counterexamples, and evidence receipt.
- `experiments/05-real-project-closure-trial/tests/` — standard-library integration, gate, failure, replay, minimizer, and raw/report tests.
- Root README, CI matrix, research index/map, and claim boundaries updated together.

## First frozen held-out benchmark

```text
held-out manifest: 72315d3330709384129c6a3589b47455beae5e166115f979869127f08afb362e
canonical checks: 242
held-out mutations: 6
combined silent stale outputs: 0
combined final oracle equality: PASS
combined repairs with provenance: PASS
combined audit + replay: 110 check executions
full oracle: 1,452 check executions
work reduction: 92.4242%
gate: PASS
```

The fixture was frozen before the first scored run and was not tuned after failure. Broken/no-audit retained 18 silent stale occurrences; observed-only retained three. All 21 occurrences remain in raw evidence and minimize to five unique one-mutation reproductions.

## Local verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
Experiment 05: 11/11 PASS (36.787 s first narrow run)

PYTHONDONTWRITEBYTECODE=1 python3 run_benchmarks.py
gate PASS; 0 silent stale outputs; 110 audit+replay vs 1,452 full oracle
```

All-suite, diff, raw/report, remote-tree, PR, and CI evidence remain pending. This chat must not merge the branch.

## Pre-commit verification amendment — 2026-09-02 UTC

```text
Experiment 01: 8/8 PASS
Experiment 02: 6/6 PASS
Experiment 03: 11/11 PASS
Experiment 04: 11/11 PASS
Experiment 05: 11/11 PASS
Total: 47/47 PASS

benchmark replay: PASS
repeat replay hash: PASS
reversed registration: PASS
all minimized unique reproductions: PASS
raw/report metric crosscheck: PASS
fixture and raw JSON parse: PASS
git diff --check: PASS
unexplained generated files: none
```

Commit, publication, remote-tree, pull request, and remote CI evidence remain pending. Human merge authority is unchanged.

## Publication amendment — 2026-09-02 UTC

```text
locally verified experiment commit: 5adf3c226dc2d40e6f1c1f8eed0c604606fcd8e2
locally verified tree: 014baa1e4653154017550ca07b142eefac69b33d
remote publication commit: 00842caa1c45d42f48265199a6f67b5f2ffc96eb
remote publication tree: 014baa1e4653154017550ca07b142eefac69b33d
remote tree equals locally verified tree: PASS
pull request: https://github.com/mike-axiom-mir/axm-state-research/pull/7
pull request state: OPEN; intentionally stacked; not merged
remote CI: pending at time of this amendment
```

The publication commit differs from the local commit only in commit metadata; their trees are identical. This amendment changes only the lane receipt. Human merge authority is retained.
