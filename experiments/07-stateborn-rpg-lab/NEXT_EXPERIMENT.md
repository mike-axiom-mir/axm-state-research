# Next experiment — Typed machine state language

## Gate

Give two bounded actors one shared problem and remove the natural-language
channel. They may communicate only through typed state messages:

- offer a visible state projection;
- request a bounded delta;
- accept or refuse;
- attach a causal receipt;
- close or deadlock explicitly.

## Freeze before scoring

Freeze the state schema, message types, actors' visible fields, task fixtures,
success verifier, leakage detector, deadlock limit, and replay normalizer before
running held-out cases.

## Measure

- completed and refused tasks;
- messages and bytes per result;
- ambiguous or incompatible offers;
- information disclosed outside each allowlist;
- deadlocks and unresolved states;
- exact replay and order-reversal behavior;
- comparison with a minimal direct-coordination baseline.

## Pass boundary

The experiment passes only if at least one held-out problem is solved through
typed state exchange, private fields remain absent, every applied delta has
explicit acceptance and receipt provenance, and replay reproduces the same
resolved or unresolved result.

A pass would demonstrate a bounded coordination protocol, not a private
machine language, consciousness, general communication, or superior gameplay.

