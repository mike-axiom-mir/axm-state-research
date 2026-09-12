# Stateborn v0.1.0 — Action Report

Date: 2026-09-04

## Built

- new isolated deterministic state-fabric engine;
- seed-derived 7 × 7 world with actor and cell nodes;
- explicit location and relationship edges;
- atomic move, gather, share, shelter, and rest transforms;
- dependency-triggered evidence, identity, need, ecology, relation, and story projections;
- invariant verification with whole-transaction rollback;
- canonical SHA-256 state digests;
- operation idempotency, stale-revision refusal, exact replay, and sealed local save/import;
- offline browser research surface exposing the world and causal work floor;
- future-gate drafts for portable actor-state composition, machine state language, multiplayer routing, and state-root USB boot.

## Automated verification

- 12 / 12 deterministic engine tests passed;
- static entrypoints and three JavaScript modules passed validation;
- no external runtime dependency was found in the delivered browser files.

## Browser interaction verification

- revision-zero root loaded with one nearby pressure thread;
- manual gather → move → share path applied three ordered revisions;
- five-transition probe reached revision 5;
- repeated sharing derived `Keeper-shaped` at strength 2;
- reciprocal knowledge appeared from a bond strength of 2;
- exact replay reconstructed the probe digest;
- sealed local save survived reset and restored the same digest and identity;
- method boundary, receipt list, and canonical state inspector were readable and interactive;
- no application-origin warning or error appeared in the browser log.

## Failure caught and repaired

The first browser run projected Rhea's abstract `safety` need as though safety were a gatherable map resource and reported a false location. The relation node was repaired to emit location knowledge only for material state actually represented in world cells. Its fallback must be an exchanged material preserved in the actor's receipt-backed memory. An automated assertion now requires every reciprocal resource location to resolve to a cell containing that resource.

## Honest result

The experiment has produced deterministic RPG-like fragments: spatial agency, resource transformation, unmet-need threads, evidence-derived identity, relationship memory, reciprocal world response, and persistence. It has not shown that these fragments form a satisfying RPG, scale to rich content, safely represent a human participant, or support multiplayer composition.

## Storage and publication state

- local experiment only;
- no GitHub branch, PR, merge, or canon action;
- intended future destination: a bounded `axm-state-research` lane after GitHub 2FA is ready.
