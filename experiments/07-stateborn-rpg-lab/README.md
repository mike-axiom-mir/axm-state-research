# AXM Stateborn RPG Lab v0.6.0

Stateborn is a bottom-up research instrument. It asks whether RPG-like situations can arise from deterministic state, actor pressure, relations, memory, generic intent transforms, and consequences—without defining a conventional RPG first.

It is not a claim that AXM has generated a real RPG. The browser surface is a microscope for the state fabric: it shows which nodes woke, which actors acted, what changed, and whether exact replay reaches the same digest.

## Machine State Language in v0.6

`dist/language.html` is an offline microscope for a deliberately small typed
packet protocol. Two deterministic seats receive bounded public vectors and
may emit only five operations: offer, propose, accept, refuse, and commit. The
packet payload accepts numbers, arrays, maps, booleans, and exact digests; a
free-text value is refused before it changes canonical state.

The held-out gate freezes five fixtures before scoring. Two solve, one ends in
an explicit consent refusal, and two deadlock rather than inventing missing
state. Every run keeps fictional private values out of the channel, binds a
commit to two exact accept packets, leaves source records unchanged, and
replays exactly. Reversing which seat offers first changes the raw receipt
order but not the normalized logical outcome.

This supports one narrow claim: bounded deterministic machines can coordinate
through an agreed state-transition protocol without sending sentences. Humans
still authored the opcodes, dimensions, fixtures, and interpretation. It is
not evidence of a private natural machine language, consciousness, subjective
understanding, general communication, or production multiplayer.

## Actor Capsule Crossing in v0.5

`dist/capsules.html` tests a narrower version of “move a user state”: two independently owned fictional actor sources export only consented public fields into a temporary shared session. Their projections live under `capsules.<ownerId>` and never fuse. Session actions cannot write either source.

Each owner receives a proposed return packet after shared activity. Nothing returns automatically: the owner separately chooses which allowlisted paths to accept. Forged packets, stale source revisions, undeclared paths, and owner-namespace collisions fail closed. Detaching removes the projection while preserving evidence, and exact replay reconstructs the composition, collaboration, return proposal, and separation sequence.

Across 16 deterministic crossing runs, both capsules verified, namespaces stayed distinct, session activity left both sources unchanged before acceptance, a receipt-backed shared signal appeared, selective returns worked, tampering was refused, and replay passed. This demonstrates a bounded data-state composition protocol. It does not move a human, prove identity, provide networking, or justify silent cross-user state transfer.

## Six retained steps

| Version | Question tested | Retained result |
|---|---|---|
| v0.1 | Can a canonical node world stay deterministic and receipt-bound? | Yes at small scale; global copy/hash made scale badly fail. |
| v0.2 | Can sleeping logical extent stay sparse while relations cause reactions? | Yes in the bounded probe; reciprocal sharing and its wait counterfactual replay. |
| v0.3 | Can novelty drive change while outcomes remain outside policy input? | Yes in the scripted curiosity loop; mixed growth/damage is observer-only. |
| v0.4 | Can human, machine, and AI-compatible seats coexist under one referee? | Yes with a labelled offline stand-in and evidence-gated intersections. |
| v0.5 | Can independently owned actor projections temporarily compose and separate? | Yes under an allowlisted, consent-bounded local capsule contract. |
| v0.6 | Can bounded actors coordinate through state packets rather than prose? | Yes for five frozen fixtures; failures remain explicit refusal or deadlock. |

Every version remains separately archived. Later results do not rewrite the v0.1 failure or turn authored fixtures into emergence.

## Coexistence Field in v0.4

`dist/coexistence.html` adds one shared cycle with three differently bounded seats:

- the human chooses one real world intent;
- the machine seat selects an intent from outcome-blind novelty pressure;
- an AI-compatible seat may propose one bounded intent;
- the local deterministic referee validates every intent and alone commits consequences.

No AI model is connected in this offline build. The AI-compatible seat uses a clearly labelled `DETERMINISTIC_STAND_IN`; a supplied external proposal passes through the same local validator. Invalid proposals are refused and the seat idles—there is no hidden fallback.

All three seats begin on the same cell as an authored experimental fixture. That co-location is not called emergence and earns no thread at genesis. Observer names such as `shared_site`, `three_way_mark`, `encounter`, and `cross_role_recovery` appear only when their stored event IDs satisfy explicit intersection rules.

Across 12 seeds × 64 coexistence cycles, all runs replayed exactly, kept every machine policy view free of forbidden outcome fields, produced both growth and damage, and formed at least one three-role mark. This is evidence that the authority split and intersection mechanism repeat. It is not evidence of machine consciousness, real AI participation, good gameplay, or open-ended emergence.

## Curiosity Garden in v0.3

`dist/curiosity.html` adds a separate mini experiment without replacing the v0.2 relational lab. Six deterministic actors select actions from novelty pressure rather than an outcome reward.

The actor policy may see only:

- terrain and phase;
- unfamiliar neighbouring states;
- how often a context/action pair was tried;
- a short history of observation signatures.

It does not receive health, vitality, growth, damage, bloom, scar, success, or reward fields. Those consequences are projected only for the game observer after an action commits.

Across 12 seeds × 64 steps, every run produced both growth and damage, changed 22–31 sparse cells, created at least one shared echo, kept all policy views free of forbidden outcome fields, and replayed exactly. Ten worlds ended with positive health drift and two with negative drift. This is evidence of a repeatable curiosity-driven change mechanism, not evidence of machine feelings or a self-growing ecology.

## What changed in v0.2

The failed v0.1 scale experiment copied and hashed the whole world on every action. At 50,000 sleeping nodes, one action took about 2.3 seconds and added about 140 MiB in the measured runtime. The node idea was not the bottleneck; global copying was.

v0.2 replaces the materialized world graph with a deterministic sparse field:

- 1,048,576 logical cells and three actors by default;
- cells generated on demand from seed + coordinates;
- only sparse cell overrides become canonical mutable state;
- inactive cells sleep and do no per-turn work;
- dependency indexes wake only rules subscribed to changed state families;
- the player and autonomous actors use the same validated intent transforms;
- actor decisions, causes, events, situations, and digests remain receipt-bound;
- stale revision, duplicate operation, invariant, replay, and save checks remain fail-closed.

## v0.2 relational observation

The lab seed intentionally gives the player food and water pressure, while nearby Rhea has water and food pressure. It supplies conditions, not a quest.

One player `share food` intent produces:

1. the player's share event;
2. Rhea's autonomous `share water` event, caused by the newly remembered relation;
3. a `mutual_aid` situation projected from those two event receipts.

The counterfactual `wait` intent does not produce that result. Rhea instead opens a food request, producing an `unanswered_need` situation and a different digest.

This is a small, causally verified RPG-like situation. It is not evidence of rich emergence, fun, narrative quality, or a finished game.

## Run locally

Open `dist/language.html` for the v0.6 state-language gate,
`dist/capsules.html` for actor-state crossing, `dist/coexistence.html` for the
shared-authority probe, `dist/curiosity.html` for Curiosity Garden, or
`dist/index.html` for the relational probe. All classic local bundles require
no server, network, account, AI connection, analytics, or external asset.

If Node.js is installed:

```bash
npm test
node tools/benchmark-v01.mjs 0 1000 10000 50000
node tools/benchmark-v02.mjs
node tools/curiosity-probe.mjs 64 12
node tools/coexistence-probe.mjs 64 12
node tools/capsule-probe.mjs
node tools/state-language-probe.mjs
node tools/validate-static.mjs
```

## Research gates

1. **Sparse living state fabric — implemented for testing.** Measure agency, pressure, relation memory, autonomous reaction, situation projection, and cost growth.
2. **Curiosity without outcome reward — implemented as a mini experiment.** Measure novelty-driven state change while keeping consequences outside the actor policy.
3. **Bounded human/machine/AI coexistence — implemented for testing with an offline stand-in.** Measure shared transforms and evidence-backed intersections while the local referee preserves authority.
4. **Portable actor-state composition — implemented as a local bounded probe.** Export allowlisted projections, compose under distinct namespaces, propose return packets, accept selected paths, separate, and replay.
5. **Machine state language — implemented as a bounded typed-packet gate.** Five frozen held-out fixtures measure completion, refusal, deadlock, message volume, leakage, ordering, and replay.
6. **Multiplayer state routing — next and unproven.** Put the typed protocol over a simulated lossy, duplicated, out-of-order connection while preserving independent recovery and accepted return deltas.
7. **State-root USB boot — conceptual only.** Treat a sealed genesis/root state as revision zero around real firmware, bootloader, kernel, driver, and hardware gates.

## Separation and publication state

This remains isolated from the older Threshold Expedition RPG foundation. Earlier work informed integrity requirements only; no earlier story, world, backend state, or RPG model is a dependency.

The complete v0.1–v0.6 chain is prepared for a bounded `axm-state-research`
lane. Repository publication is a separate receipt; this package never
implies merge, release, or canon.

See `docs/ACTION_REPORT_v0.6.0.md`,
`docs/STATE_LANGUAGE_REPORT_v0.6.0.md`, and the retained v0.1–v0.5 reports for
the evidence boundary.
