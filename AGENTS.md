# AXM State Research Agent Rules

These instructions apply to the entire repository.

## One AI chat instance, one PR lane

A **PR lane** is exactly one working branch and one pull request for one bounded AI chat instance.

1. Claim a unique branch before writing.
2. Keep the same chat on that branch and in that pull request until the work is merged, closed, or explicitly handed off.
3. Do not open a second concurrent branch or pull request for the same chat.
4. Never push into a branch owned by another chat instance.
5. Do not push directly to `main`. A human may perform an empty-repository bootstrap when no branch target yet exists.
6. A later chat may continue an existing lane only with explicit human direction and a receipt that grants continuation. Otherwise it starts a new lane.
7. Use branch names of the form `ai/<bounded-purpose>-YYYY-MM-DD`.
8. Add one lane receipt under `lanes/` identifying the branch, base commit, scope, evidence, and handoff state.

This is a coordination rule, not a claim that a chat is an autonomous identity. The branch and receipt are the durable ownership evidence.

## Truth and evidence rules

- Do not protect a hypothesis from failure.
- Never silently rewrite or delete failed variants, raw results, receipts, or known counterexamples. Superseding evidence must link back to the evidence it supersedes.
- Keep evidence and provenance attached to reported results.
- Generated node variants are scale fixtures, not thousands of unique expert disciplines.
- Call software nodes software nodes. Do not call them CPU, GPU, hardware, brain, neuron, or sub-software nodes unless a measured implementation genuinely maps to that substrate.
- Bound state-versus-history claims to the tested predicates and state schema. A passing test is not proof that history is universally unnecessary.
- Do not resolve truth by majority vote. Preserve genuine conflicts as explicit state until a declared authority or later capability resolves them.
- Treat timing and memory measurements as host-specific observations unless repeated across named environments.
- Treat AI as an optional expensive capability above the deterministic state floor, not as a hidden dependency of deterministic tests.

## Required lane workflow

1. Read this file, the root README, relevant experiment documentation, and the current lane receipts.
2. Reverify the base branch and commit before editing.
3. State the bounded hypothesis or maintenance objective.
4. Preserve a runnable failure when the experiment is meant to discover one.
5. Add or update tests, raw results, receipts, limitations, and claim boundaries together.
6. Run the narrow tests first, then all affected experiment suites.
7. Record exact commands and results in the pull request and lane receipt.
8. Open one pull request from the lane branch to `main`.

## Merge gate

Before merge, the lane must have:

- a bounded claim;
- reproducible commands;
- tests passing for every affected experiment;
- raw measurements or an explicit statement that no benchmark was run;
- failures and limitations retained;
- no unexplained generated files or duplicated source trees; and
- an updated lane receipt.

Merge authority remains with a human maintainer unless the human explicitly authorizes the active chat to merge that specific pull request.
