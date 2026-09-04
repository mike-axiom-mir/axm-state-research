# Failures and limitations

## Preserved failures

- v0.1 copied and hashed the complete world for each action. The measured
  50,000-node action cost was about 2.3 seconds and about 140 MiB of added
  runtime memory. v0.2 repairs that design with a sparse recoverable field;
  v0.1 remains archived rather than rewritten.
- v0.5 browser observation was blocked by the cloud browser's local-URL policy.
  The rendered route is UNKNOWN in this lane even though engine and static tests
  passed.
- the first frozen v0.7 corrupt-retry score deadlocked because a rejected
  corrupt packet poisoned duplicate tracking. The fixture digest stayed frozen;
  only accepted packets now become replay barriers, and the repaired route is a
  regression test;
- `held-loss-exhaustion` deliberately remains deadlocked after three drops even
  though its direct protocol baseline solves. Transport unavailability is not
  rewritten as protocol success.

## Authored fixtures

The seeds, fictional sources, export and return allowlists, signal vocabulary,
curiosity formula, consequence rules, shared-site rules, and crossing plans are
authored. Repeatability of those mechanisms is not open-ended emergence.
The v0.6 packet opcodes, vector dimensions, consent policy, fixture targets,
canonical proposal ordering, and observer labels are also authored. Passing
the gate is not evidence that machines invented symbols or share private
meaning.
The v0.7 transport schedules, fault types, retry limits, expiry ticks, and
expected outcomes are authored. Passing does not establish hostile Internet
safety.

## Unimplemented boundaries

- no real socket, browser peer, server, authentication, encryption, signatures,
  revocation, NAT traversal, relay, or hostile-peer model;
- no real personal data or whole-person representation;
- no cross-game schema negotiation or semantic conflict resolver;
- no cross-process or distributed persistence race and no independent peer
  recovery store;
- no real model connected to the labelled AI-compatible seat;
- no gameplay quality, accessibility, or broad human evaluation;
- no UEFI, bootloader, kernel, driver, or USB OS implementation.

## Publication boundary

This lane requests review. It does not authorize merge, release, or canon.
