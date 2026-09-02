# Lane Receipt — AXM Wakeup Fuzzer

```text
date: 2026-09-02 UTC
branch: ai/wakeup-fuzzer-2026-09-02
base: ai/state-research-import-2026-09-02@a82db47736a4a32572357db536714b1c8cf0cbd9
chat lanes claimed: 1
pull requests allowed for this chat: 1
merge authority: human maintainer
status: pull request open; GitHub Actions pending; human merge required
pull request: https://github.com/mike-axiom-mir/axm-state-research/pull/5
```

## Bounded scope

Build one runnable software-runtime experiment comparing a full-scan truth oracle, fair polling/if-chain baseline, declared sparse subscriptions, runtime-observed reads, and a small shared-condition index. Preserve a controlled missed-wakeup failure, minimize it, and measure positive-token cascades without hardware or neural claims.

## Source and evidence

- `experiments/03-wakeup-fuzzer/wakeup_fuzzer/` — contracts, schedulers, fixture, fuzzer, minimizer, and cascade.
- `experiments/03-wakeup-fuzzer/tests/` — 11 standard-library regression tests.
- `experiments/03-wakeup-fuzzer/results/raw/` — scaling, broken/repaired, counterexample, cascade, replay receipt, and 500 compact JSONL transition receipts.
- Canonical helpers are imported from sibling `experiments/01-state-floor`; no live source was duplicated.

## Environment compatibility

```text
Linux 6.18.35 x86_64
Python 3.12.13
Git 2.51.1
environment seams: none
```

## Verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
11/11 PASS

PYTHONDONTWRITEBYTECODE=1 python3 run_benchmarks.py
100, 1,000, and 10,000 mutation runs completed
fixed-seed deterministic replay: PASS
reversed registration: PASS
repaired output equivalence: PASS
broken omission detection: PASS
counterexample 32 -> 1 mutation: PASS
```

This lane intentionally does not edit general conceptual-note files because another user-directed chat owns that separate work. Pull request #5 is stacked on PR #3 and its apparent base diff will shrink after PR #3 merges. Human merge authority is unchanged; append a dated amendment if remote verification later fails or the lane is handed off.
