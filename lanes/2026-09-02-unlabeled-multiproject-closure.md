# Lane Receipt — Unlabeled Multi-Project Closure Challenge

```text
date: 2026-09-02 UTC
branch: ai/unlabeled-multiproject-closure-2026-09-02
base: corrected PR #7 head 7ba2b1d42891074856ad274d00dc3985ef5e1d27
target: main (intentionally stacked; displayed diff shrinks after prerequisite PR #7 merges)
visible ChatGPT conversation lanes: this is an explicitly allowed new bounded continuation from the same visible conversation
delegation boundary: delegated builders are hands in that conversation, not separate user-visible chat instances
pull requests allowed for this bounded continuation: 1
merge authority: human maintainer
status: semantic freeze, first score, post-score verification, and connector publication complete; final-head Actions pending
```

## Bounded scope

Build Experiment 06 only: train on one canonical repository project subtree, score disjoint unlabeled mutations on two other canonical project subtrees, compare broken sparse, observed reads, deterministic structural audit, combined structural+observed, and full oracle, and charge sparse+audit+replay+reconstruction work to the primary gate. Add hash/provenance checkpoint verification, safe quarantine/reconstruction, unresolved abstain/escalate, and automatic miss minimization.

This lane makes no component-novelty, AI, model-weight, substrate, brain, physics, production-actuator, or cross-machine claim.

## Pre-score freeze

```text
semantic freeze commit: d804cc5f4a2bc863f2f2177daa89d77c1dcdc524
semantic freeze tree: 007e947b466883ed74cba317a8195f2e962e3322
pre-score receipt commit: 2c0731d846605f9b8f4e5b85d55e270fea5c277a
pre-score receipt tree: ca4beb136846c7766af5c4f5c1906272bbdd326d
freeze SHA-256 manifest: abfe922ad323d490dc856a2185a3d58ddd9a4c9edb680ee2b31131fe7933fea3
held-out manifest SHA-256: 2d3b07b3f5eaf5bac06c739d7ff3e3ac9a45f71daff757b7c18d37eb601da251
freeze verification before first score: PASS
```

No held-out scoring occurred before both commits. After the first score, frozen policy/checkpoint/engine/model files and all frozen manifests remained unchanged.

## First frozen score

```text
candidate: COMBINED_STRUCTURAL_OBSERVED
silent stale outputs: 0
final oracle equality: PASS on both held-out project versions
repairs/quarantines retain provenance: PASS
total candidate work: 597 checks
full-oracle reference: 1,955 checks
work reduction: 69.4629%
gate: PASS

Workfloor Sentinel / absent checkpoint: 313 vs 1,050; 0 silent; PASS
Adaptive Closure / corrupt checkpoint: 284 vs 905; 0 silent; PASS
checkpoint quarantines: 2
checkpoint reconstruction work: 391 checks (included in 597)
untrusted checkpoint replays: 0
unresolved held-out recoveries: 0
```

Broken sparse retained 32 silent occurrences and ended unequal. Observed reads retained eight silent opaque-helper occurrences despite ending equal. All 40 occurrences and ten unique minimized reproductions remain in raw evidence.

## Retained evidence defect

The first-score embedded repeat and reversed-order flags failed because a checkpoint-validation provenance hash committed to host timing. The raw failure and first-score hashes were not overwritten. A post-score non-semantic verifier removed only measurements and their derived hash, then repeat and reversed-order hashes matched at `e1e223a1570d6697f716c1a787a77d6d70e5e56ebeab9817fbb788f80facafcf`; all ten unique minimized counterexamples reproduced.

## Verification and publication

Narrow tests, all six experiment suites, the exact committed-range whitespace check, connector-published tree equality, and the exact remote-ref range check passed. Exactly one pull request is open: [PR #8](https://github.com/mike-axiom-mir/axm-state-research/pull/8), targeting `main` as the intentional stack. Human merge authority is retained.

## Local verification amendment — 2026-09-02 UTC

```text
Experiment 01: 8/8 PASS
Experiment 02: 6/6 PASS
Experiment 03: 11/11 PASS
Experiment 04: 11/11 PASS
Experiment 05: 11/11 PASS
Experiment 06: 11/11 PASS
Total: 58/58 PASS

post-score normalized repeat replay: PASS
post-score reversed registration/order: PASS
all ten unique minimized counterexamples: PASS
raw/report crosscheck: PASS
first-score evidence hashes: PASS
freeze plus receipted EOF normalization: PASS
JSON/JSONL parse: PASS
```

The required committed-range check first failed at `20d2ca4d6d9b5a3d066ee42b010d8582d771da87` with 15 added EOF blank lines. That failure was retained. Commit `e28e6c6b69a5509a911eb464c48af68a2da637d1` removed only those EOF blank lines and added evidence support for verifying original frozen blobs against their normalized form. Receipt commit `80515aaae912755835346ac22cd6ee55286d12ef` records every before/after hash.

```text
exact command:
git diff --check 7ba2b1d42891074856ad274d00dc3985ef5e1d27..HEAD
result after correction receipt: PASS
```

## Connector publication amendment — 2026-09-02 UTC

The connector mirrored each local commit onto the remote branch with the same Git tree. Connector-created commit identifiers differ because the connector supplies publication metadata; the content-addressed tree identifiers match exactly.

```text
local d804cc5f4a2bc863f2f2177daa89d77c1dcdc524 -> remote 0ca3c69dfa8d278ef3c89e8779d59de9971ed868; tree 007e947b466883ed74cba317a8195f2e962e3322
local 2c0731d846605f9b8f4e5b85d55e270fea5c277a -> remote d0249a957424d2d0962e5f6ef704a5d9eb8560a2; tree ca4beb136846c7766af5c4f5c1906272bbdd326d
local dd645e35d2958165b845e998ba74d0f20018a8bf -> remote 7e8b351ab1037393dc2657a1f81f0e3f51f2e20f; tree d06ac7580d01371762116ba3355fa77aaaf10ae5
local 20d2ca4d6d9b5a3d066ee42b010d8582d771da87 -> remote 3ecf9456afb0d25778a5dccd9b899f8031594cdf; tree 4887f014a258c26de761d8de7f192884189b0558
local e28e6c6b69a5509a911eb464c48af68a2da637d1 -> remote 6971f2ad133486c65a318d98207eb95cee29b653; tree c06a92efdb9e915794ba647b5b83ed91f5b3684c
local 80515aaae912755835346ac22cd6ee55286d12ef -> remote 67ce1169ece16217b33422af51b41e52a106edfd; tree 0cd006813b0d489fe3970624ff8bc562ccca86d0
local 4188330f3a658a63fa9d97e87f52927ea5c25bb1 -> remote f76d2b617ca36ecc89e71f667a432ad701e8c0b5; tree d4a872aca961ab4c20b07bfeb5a34180d8f00b68

git diff --exit-code HEAD^{tree} origin/ai/unlabeled-multiproject-closure-2026-09-02^{tree}: PASS
git diff --check 7ba2b1d42891074856ad274d00dc3985ef5e1d27..origin/ai/unlabeled-multiproject-closure-2026-09-02: PASS
pull request: #8, open, unmerged, target main
```

This documentation-only receipt amendment changes no policy, manifest, fixture, held-out input, label, checkpoint behavior, score, or evidence. It becomes the final connector-published head; its GitHub Actions result is recorded on the pull request after completion rather than changing the tested head. Human merge authority is unchanged.

## Retained connector-verifier failure — 2026-09-02 UTC

The first detached rerun of exact remote head `a1c0234126006972032080369e32a2ae7d08de30` passed Experiments 01–05 (47/47) but produced three Experiment 06 errors. The freeze verifier required local semantic-freeze commit `d804cc5f4a2bc863f2f2177daa89d77c1dcdc524` to be an ancestor; connector publication preserved tree `007e947b466883ed74cba317a8195f2e962e3322` at remote commit `0ca3c69dfa8d278ef3c89e8779d59de9971ed868` instead.

The explicitly receipted correction changes only evidence verification and CI checkout depth. The verifier now finds the recorded frozen tree in reachable ancestry, continues to check the declared local commit/tree pair when that object is available, and verifies every frozen blob, SHA-256 value, and EOF-correction receipt from the reachable frozen tree. Policy semantics, risk inference, manifests, fixtures, labels, checkpoint behavior, scoring, and raw first-score evidence remain unchanged.

## Same-chat Experiment 07 continuation — 2026-09-05 UTC

The user explicitly continued this same visible ChatGPT conversation and asked it
to keep going while a separate State RPG project remained untouched. Under the
one-chat/one-PR rule, Experiment 07 continues this existing branch and PR #8; it
does not open a second lane or pull request. No State RPG file, branch, or source
was inspected, imported, or modified.

### Bounded scope

Freeze and score a controlled cross-version opaque-recovery challenge: unchanged
public callable, changed hidden evaluator dependency, no useful path-shaped public
parameters or observed reads, a v1-bound checkpoint, and one later evaluator
whose trusted source is unavailable locally. Preserve explicit unresolved output,
add an abstain-all control, and keep human merge authority.

```text
semantic freeze commit: 3d35321ac1f99ee0cbf18a0ee81f812d94abbb59
semantic freeze tree: 832b158fbb2ce903fe26b9849651813ee8691141
pre-score receipt commit: fd92bfa (local; full publication mapping pending)
held-out manifest SHA-256: 976e4bd3153ff2cc9201417f19e5d33e8f2eeff00f778f203e7b34e49e25d188
pre-score Python compile and contract smoke: PASS
pre-score held-out execution: none
freeze verification immediately before score: PASS
```

### First frozen score

```text
candidate: VERSION_AWARE_BOUNDED
registered nodes: 12 per project
held-out transitions: 12
scored decisions: 168
resolved decisions: 154 (91.6667%; frozen minimum 85.0%)
wrong resolved outputs: 0
false abstentions: 0
untrusted checkpoint replays: 0
explicit unresolved decisions: 14
candidate policy work: 41 operations
full-oracle reference: 168 executions
work reduction under frozen accounting: 75.5952%
gate: PASS
repeat logical replay: PASS
reversed registration: PASS
```

The v2 world resolved 100% with 25 policy operations. The v3 unavailable-source
world resolved 83.3333% with 16 policy operations and retained exactly
`opaque-guard` plus `safety-summary` as unresolved. The candidate did not infer
the new hidden dependency; it guarded the changed-but-available evaluator after
each event.

Broken sparse retained 6 wrong resolved occurrences and one untrusted checkpoint
replay. Observed-only and structural-only retained 4 wrong resolved occurrences
each. Abstain-all resolved 0% and produced 154 false abstentions. All 14 occurrence
records remain; their six unique minimized reproductions pass.

### Local verification

```text
python run_benchmarks.py --verify-freeze-only: PASS
python -m unittest discover -s tests -v: 10/10 PASS
python verify_evidence.py: PASS
raw evidence hashes: PASS
raw/report crosscheck: PASS
all six unique minimized reproductions: PASS
```

The strongest next experiment is the Budgeted Opaque Version Swarm described in
Experiment 07's `NEXT_EXPERIMENT.md`. PR #8 remains open and unmerged; final
publication/head/Actions evidence will be appended without changing frozen
semantics. Human merge authority is unchanged.
