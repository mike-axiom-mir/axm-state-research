# Stateborn integration — 2026-09-12

Stateborn is integrated into the current State Research body from two exact historical donor heads without importing their stale repository-level workflow/front-door history.

## Donor evidence

- Stateborn v0.1–v0.7 plus checkpoint/recovery/fresh-process verification donor: `ai/stateborn-checkpoint-process-verifier-2026-09-11` at `0cef53c3900c48a4d7cece62bcbfd6fa34f40fab`.
- Human-readable hostile-transport experience donor: `ai/stateborn-transport-feedback-2026-09-09` at `e39687e8ff0cb89d69fa7b13fdda139185770a3e`.
- The checkpoint donor contains PR #9 Stateborn v0.7 and PR #19 checkpoint-owned recovery content. Its exact hosted process-verifier run `34586268082` passed on Node 20 and Node 22.
- The original Stateborn v0.7 head `686201db2a17d343fc5e63123a93bb3f03d343ee` passed the repository State research workflow run `33928282044`.

## Why the content is flattened

The historical donor branches also contain old versions of repository-wide workflows, README, governance, and research indexes. GitHub Actions tokens cannot push historical workflow-file ancestry without workflow permission, and those older shared surfaces would also revert newer State Research truth.

The integration therefore copies the exact Stateborn experiment/artifact/lane content from the donor heads onto current `main`, then installs current combined workflows through the GitHub repository connection. This preserves the experiment bytes while keeping current repository governance and research maps authoritative.

The transport-experience donor intentionally overrides only its six presentation surfaces on top of the checkpoint donor: `transport-experience.js`, `transport.css`, `transport.html`, its focused test, static validator, and lane receipt. It does not replace the Stateborn transport authority or checkpoint logic.

## Truth boundary

Stateborn remains a bounded deterministic software experiment. Fresh-process checkpoint verification proves detached reconstruction of checkpoint-owned state-language evidence on the tested Node paths. It does not prove complete transport-session restart/resume, filesystem crash atomicity, authenticated checkpoints, concurrent-writer safety, real Internet transport, NAT traversal, relay availability, hostile-peer security, machine consciousness, or CANON status.

The human-readable experience layer is display-only: it explains existing receipt/state consequences and does not become a second simulation authority.
