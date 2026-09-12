# Portable actor-state composition — v0.5 bounded implementation

Claim status: **IMPLEMENTED FOR LOCAL TESTING / NETWORK TRANSPORT UNIMPLEMENTED**

## Why this exists

If a participant can be represented by a bounded state capsule, multiplayer does not have to begin with two clients issuing commands inside one fixed game. A shared fabric could match compatible actor projections, compose a temporary joint state, and return only accepted changes to each participant.

The capsule represents a participant's game-relevant state. It does not claim to represent the whole person.

## Minimum capsule

```json
{
  "schema": "axm.portable-actor-capsule/v0-proposal",
  "capsuleId": "stable local identity",
  "source": {
    "worldId": "origin world",
    "revision": 0,
    "digest": "canonical source-state digest"
  },
  "projection": {
    "abilities": [],
    "possessions": [],
    "relationships": [],
    "currentIntent": null
  },
  "consent": {
    "sharedPaths": [],
    "acceptedTransforms": [],
    "expiresAtState": null
  },
  "ownership": {
    "privateNamespaces": [],
    "sharedNamespaces": []
  },
  "returnPolicy": {
    "acceptedDeltaKinds": [],
    "requiresReview": true
  }
}
```

## Composition boundary

Composition is temporary and reversible. It must not:

- fuse two canonical identities;
- silently widen either projection;
- allow one world to rewrite private namespaces;
- make a shared-world conflict overwrite either source capsule;
- return unreviewed deltas outside the agreed policy;
- treat matching as ownership or authority.

## Required handshake

1. Each capsule publishes a minimal compatibility projection.
2. The matcher proposes a shared contract without receiving private state.
3. Each participant independently accepts the exact contract digest.
4. A temporary shared namespace is created.
5. Joint actions produce shared receipts.
6. Each participant receives a proposed return packet.
7. Accepted return deltas enter each source state independently.
8. The shared namespace can close without destroying either source state.

The v0.5 local test measures disclosure, refusal, namespace collision, replay,
separation, and selective return—not only whether two projections can act
together. It uses fictional actors and in-process transport. Cross-device
networking, account identity, cryptographic signatures, hostile peers, and
real personal data remain outside the implemented boundary.
