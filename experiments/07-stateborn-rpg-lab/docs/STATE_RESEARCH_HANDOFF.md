# Stateborn → AXM State Research handoff

Status: **v0.1–v0.6 RESEARCH CHAIN / BOUNDED PUBLICATION CANDIDATE**

This document records the bounded material for an `axm-state-research` lane. It does not authorize a merge or canon action.

## Research question

Can a game-like experience be assembled upward from a canonical state graph and tiny deterministic perspective nodes, without first specifying a conventional RPG and decomposing it?

## Node contract used through v0.6.0

Each rule node has:

- a stable ID and perspective;
- explicit state-path subscriptions;
- a deterministic condition;
- a deterministic state transform;
- a wake trace even when it produces no delta;
- a fired trace only when canonical state actually changes.

Each player action becomes an atomic transaction:

1. verify operation identity and expected revision;
2. verify the action precondition;
3. apply the proposed transform to a draft state;
4. wake subscribed nodes until a bounded fixed point;
5. verify all invariants;
6. either commit the whole draft or refuse it without mutation;
7. issue a receipt binding prior digest, action, causal trace, resulting digest, and revision.

v0.2 adds a sparse-world boundary: untouched logical cells are recoverable from a root generator commitment rather than copied into each transaction. Only materialized views and changed sparse overrides wake relevant work. Autonomous actors submit the same typed intents through the same validation and transform functions as the player, and their choices and causes are added to the receipt.

v0.3 adds a projection boundary between the actor's action-selection state and the game observer's consequence state. Curiosity actors receive novelty evidence only. Growth, damage, vitality, bloom, scar, and health drift exist outside that policy input. Each receipt preserves both projections so the separation can be audited without letting the outcome become actor authority.

v0.4 adds a shared-authority boundary. A human chooses an intent, the machine
selects from its outcome-blind view, and an AI-compatible seat proposes from a
bounded view. The local referee alone validates and commits consequences. The
offline AI seat is a labelled deterministic stand-in; no model participation is
claimed. Invalid external proposals are recorded, refused, and never replaced
by a hidden fallback. Adventure projections require intersecting event IDs.

v0.5 adds an ownership and return boundary. A source actor exports only
allowlisted, consented paths into a signed-digest capsule. A temporary session
stores each projection under a distinct owner namespace. Session actions have
no source authority. Return packets are proposals bound to the capsule and
source revision; each source separately accepts an explicit subset. Forged,
stale, undeclared, or cross-owner changes fail closed. Detachment and replay
preserve the separation evidence.

v0.6 adds a typed communication boundary. Two deterministic seats expose only
consent-bounded public vectors and exchange offer, proposal, accept, refuse,
and commit packets. Packet and prior-state digests bind every transition. A
commit requires two exact accept digests. Missing state deadlocks; policy
conflict refuses. Human observer labels stay outside the machine payload.

## Current observations to measure

- deterministic world generation from an explicit seed;
- same action chain → same state and receipt chain;
- refused and stale actions leave canonical state unchanged;
- duplicate operation IDs do not repeat effects;
- node wake-up is distinct from node mutation;
- repeated behavior can create a derived identity signal without class selection;
- repeated sharing can create a relationship edge and reciprocal knowledge signal without an authored quest;
- exact replay reconstructs the current digest;
- local save tampering is refused before import.
- increasing untouched logical extent from one million to one hundred million cells does not increase materialized cells or wake count in the bounded probe;
- a player share can cause an autonomous reciprocal share and project `mutual_aid` from two event receipts;
- the wait counterfactual projects `unanswered_need` and a distinct replayable digest.
- a 12-seed curiosity probe keeps forbidden outcome fields out of all policy views while producing mixed observer-visible changes;
- multiple actors can alter the same cell and create a receipt-backed `shared_echo` without natural-language messaging;
- changing observer outcome summaries does not alter the actor's next selected intent.
- human, machine, and AI-compatible events can earn `shared_site`,
  `three_way_mark`, and `encounter` projections without giving any seat direct
  state-write authority;
- authored genesis co-location earns no projection before events exist;
- accepted and refused external proposal cycles replay exactly.
- two fictional actor capsules compose under distinct namespaces without
  exposing their private note or recovery token;
- session activity leaves both source states unchanged before explicit return
  acceptance;
- one owner can accept a signal delta while another refuses all return paths;
- forged and stale return packets are refused, and detach/replay reconstruct
  the bounded crossing.
- five frozen held-out state-language fixtures produce two solves, one explicit
  consent refusal, and two deadlocks without private-value or prose leakage;
- a commit binds both exact acceptance packets, while source records remain
  unchanged;
- reverse offer order changes raw receipt order but not the normalized logical
  outcome;
- free-text, tampered, and stale packets refuse without canonical mutation;
- every state-language result agrees with a direct public-state baseline and
  replays exactly.

## Truth boundary

Verified automated behavior is not equivalent to verified fun, narrative coherence, RPG depth, multiplayer safety, or useful generality. Those remain unproven until separate tests measure them.

## Proposed next gates

### Gate 2 — portable actor-state composition (bounded v0.5 probe complete)

Represent each participant as an independently owned capsule. A shared world receives only a consented projection. Composition must preserve namespaces, source digests, permissions, reversible separation, and conflict receipts. “Merge” must never mean irreversible identity fusion.

### Gate 3 — machine state language (bounded v0.6 probe complete)

Give two actors a shared problem but no text channel. Allow only typed state offers, requested deltas, accept/refuse responses, and resulting receipts. Measure task completion, message volume, ambiguity, deadlocks, and whether replay reproduces coordination.

### Gate 4 — multiplayer routing (next)

First place the v0.6 packets over a deterministic hostile-transport simulator:
loss, duplication, delay, reordering, disconnect, reconnect, and expiry. Match
compatible actor projections rather than merely accounts or game queues.
Compose a temporary shared state, keep each source state independently
recoverable, and return only explicitly accepted deltas to each participant.

### Gate 5 — state-root USB boot

Place an immutable, digest-verifiable root starting state on bootable media. Treat firmware, bootloader, kernel, driver discovery, and hardware facts as bounded gates or projections around that root. Keep the user capsule and accepted session deltas independently recoverable. This is a conceptual architecture only; no UEFI, Secure Boot, driver, encryption, or storage-atomicity implementation has been tested here.

## Exclusions for the future lane

- no automatic canon or merge;
- no claim of real RPG generation from the current probe;
- no import of older Threshold story/world/backend state;
- no hidden natural-language coordination inside the state-language test;
- no blind cross-user state merge;
- no authority granted merely because a node produced a recommendation.
- no claim that a genesis/root state alone makes an OS bootable.
- no claim that the deterministic AI stand-in is a connected model.
