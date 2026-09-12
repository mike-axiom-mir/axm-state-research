# AXM Agent Guidance

## Detail-density and composable capability principle

Quality is often the accumulated result of many small correct details, not one large generic upgrade.

- When improving a system, look for missing small, bounded capabilities, checks, parameters, passes, and repair operations that control specific details or failure modes.
- Prefer many reusable, inspectable, composable capabilities over one opaque "make it better" step when the smaller capabilities create real control or evidence.
- A machine should remain useful without AI: humans, explicit state, recipes, or deterministic logic can invoke the same capabilities directly.
- With AI, the model is primarily an interpretation and orchestration layer: it translates a higher-level goal into selections and combinations of the same underlying capabilities. The AI does not own those capabilities.
- A better reasoning model may improve goal interpretation and composition, while the underlying machine remains portable and usable without that model.
- Judge improvement by accumulated perceptual or functional detail, coherence, failure reduction, and fit to the goal—not by model size, resolution, benchmark score, or one broad upgrade alone.
- For visual, game, asset, animation, and video work, pay attention to small interacting details such as material variation, contact, timing, weight, secondary motion, lighting response, sound layering, asymmetry, wear, scale cues, camera behavior, and continuity.
- Do not fragment working systems merely for ideology. Add granularity where it creates useful control, reuse, diagnosis, repair, or quality.

**Working rule:** thousands of small good details and capabilities in the right places can improve a result more than one simple big upgrade.

## Canonical state and adaptive realization principle

When useful, separate **what exists** from **how it is expressed on a particular machine**.

- Canonical state/identity is authoritative. Rendering, UI, meshes, previews, audio paths, device skins, caches, and other realizations are replaceable expressions unless the repository explicitly defines otherwise.
- Preserve expression intent separately where needed: meaning, material character, motion weight, readability, atmosphere, hierarchy, sound intent, semantic detail, and other qualities that should survive changes in rendering cost.
- Prefer one truthful body with multiple realization contracts over manually divergent `mobile`, `lite`, `desktop`, `ultra`, or platform editions when the same canonical state can support them.
- Choose realization from canonical state + expression intent + measured machine capabilities + user policy. Adaptation may occur at launch or dynamically as GPU/CPU/RAM, battery, thermals, display, latency, storage, network, or user preference changes.
- A weak device should usually receive a cheaper expression, **not weaker truth**. Logical/world/design detail may remain rich even when the visible or audible realization is simplified.
- Identify non-degradable invariants explicitly. Examples include rules, fairness, hit detection, data integrity, core functionality, privacy promises, causal meaning, timing meaning, content identity, and authoritative state.
- Never let a lossy realization overwrite richer canonical state merely because that realization was rendered or edited on a weaker device. A projection/cache is not authority.
- Upgrading expression must not invent canonical facts. Downgrading expression must not erase canonical facts.
- Build bounded alternative realization paths where they add value: geometry detail, texture resolution, lighting, particles, simulation passes, post-processing, UI density, preview fidelity, audio richness, or analogous domain-specific expression layers.
- Do not force this split where representation itself is the canonical truth; apply it where truth and realization can honestly be separated.

**Working rule:** degrade expression, never truth; upgrade expression, never invent truth. One body may wake up differently on different machines while remaining the same thing.

## State Research lane governance

The following rules preserve the original State Research lane discipline without replacing the broader AXM principles above.

### One AI chat instance, one PR lane

A **PR lane** is one working branch and one pull request for one bounded AI chat instance while that experiment is active.

1. Claim a unique branch before writing.
2. Keep the same chat on that branch and pull request until the work is merged, closed, or explicitly handed off.
3. Do not open a second concurrent branch or pull request for the same bounded lane.
4. Never push into a branch owned by another active lane without an explicit handoff.
5. Do not push experimental work directly to `main`; integrate through an inspectable merge path.
6. A later chat may continue an existing lane only with explicit continuation context; otherwise it starts a new lane.
7. Prefer descriptive bounded-purpose branch names.
8. Keep a lane receipt under `lanes/` when the experiment uses the lane-receipt convention, identifying branch/base, scope, evidence, limitations, and handoff state.

This is a coordination rule, not a claim that a chat is an autonomous identity. Branches, receipts, commits, tests, and evidence are the durable coordination record.

### Truth and evidence rules

- Do not protect a hypothesis from failure.
- Never silently rewrite or delete failed variants, raw results, receipts, or known counterexamples. Superseding evidence must link back to the evidence it supersedes.
- Keep evidence and provenance attached to reported results.
- Generated node variants are scale fixtures, not thousands of unique expert disciplines.
- Call software nodes software nodes. Do not call them CPU, GPU, hardware, brain, neuron, or sub-software nodes unless a measured implementation genuinely maps to that substrate.
- Bound state-versus-history claims to the tested predicates and state schema. A passing test is not proof that history is universally unnecessary.
- Do not resolve truth by majority vote. Preserve genuine conflicts as explicit state until a declared authority or later capability resolves them.
- Treat timing and memory measurements as host-specific observations unless repeated across named environments.
- Treat AI as an optional expensive capability above the deterministic state floor, not as a hidden dependency of deterministic tests.

### Required lane workflow

1. Read this file, the root README, relevant experiment documentation, and applicable lane receipts.
2. Reverify the base branch and commit before editing.
3. State the bounded hypothesis or maintenance objective.
4. Preserve a runnable failure when the experiment is meant to discover one.
5. Add or update tests, raw results, receipts, limitations, and claim boundaries together.
6. Run narrow tests first, then all affected experiment suites.
7. Record exact commands and results in the pull request and lane receipt when that lane uses receipts.
8. Integrate through an inspectable pull request or equivalent evidence-preserving merge lane.

### Merge gate

Before promotion, the lane should have:

- a bounded claim;
- reproducible commands;
- passing tests for affected experiments, or explicit unresolved/failed evidence;
- raw measurements or an explicit statement that no benchmark was run;
- failures and limitations retained;
- no unexplained generated files or duplicated source trees; and
- provenance sufficient to reconstruct what changed and why.

The constitutional merge gate is the AXM roots: **Truth, Agency / non-domination, Continuity, and Wisdom before speed.** Technical permission to execute a GitHub merge is not CANON authority by itself. A lane that cannot satisfy those roots remains held, regardless of who or what can click the merge button.
