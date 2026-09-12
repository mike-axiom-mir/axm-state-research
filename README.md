# axm-state-research

Research into the chain from state to output: readjusting nodes, exposing
unknowns, and finding the limits and memory-reduction potential. The repository
holds both research notes and bounded executable experiments about canonical
state, adaptive realization, routing, replay, and evidence-backed state change.

## Executable experiments

- [01 — AXM State Floor](experiments/01-state-floor/README.md) tests canonical state, sparse perspective wake-up, receipts, replay, and retained-state behavior.
- [02 — AXM Workfloor Sentinel](experiments/02-workfloor-sentinel/README.md) tests whether dependency-aware perspectives miss necessary checks and retains both defective and repaired dependency-map evidence.
- [03 — Wakeup Fuzzer](experiments/03-wakeup-fuzzer/README.md) compares full-scan truth against sparse wake-up strategies, retains a planted dependency omission, and measures bounded scaling behavior.
- [04 — Adaptive Closure Verifier](experiments/04-adaptive-closure-verifier/README.md) tests bounded repair, quarantine, rollback/replay and state-debt behavior.
- [05 — Real-Project Closure Trial](experiments/05-real-project-closure-trial/README.md) tests the closure approach against a more project-shaped controlled fixture and retains counterexamples.
- [06 — Unlabeled Multi-Project Closure Challenge](experiments/06-unlabeled-multiproject-closure-challenge/README.md) tests transfer across frozen unlabeled project fixtures with explicit scoring/evidence boundaries.
- [07 — Cross-Version Opaque Recovery Challenge](experiments/07-cross-version-opaque-recovery-challenge/README.md) tests recovery and evidence continuity across opaque/versioned evaluator boundaries.
- [Reference-state closure v1](experiments/reference-state-closure-v1/README.md) tests whether sparse execution can preserve dense canonical results when non-executed specialists still contribute to shared normalization state.
- [Genesis admission contract v1](experiments/genesis-admission-contract-v1/README.md) separates pre-genesis evidence from the first admitted canonical G0 and includes the local commit-evidence continuation and observer surfaces where present.

The repository intentionally retains failed variants, raw evidence, claim boundaries, and later repairs instead of presenting only winning results. See `docs/`, `research/`, `RESEARCH/`, `lanes/`, `logs/`, and `visuals/` for the preserved research trail.

## Governance and truth boundary

Repository-specific lane discipline and AXM-wide state/realization principles live in [AGENTS.md](AGENTS.md). These experiments are bounded software evidence, not universal machine, hardware, biological, or CANON claims unless separately demonstrated.
