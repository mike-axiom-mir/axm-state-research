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
status: semantic freeze and first score complete; post-score evidence/docs/tests and publication verification pending
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

Pending narrow tests, all six experiment suites, exact committed-range whitespace check, remote tree equality, pull request URL, and GitHub Actions on final head. Human merge authority is retained.
