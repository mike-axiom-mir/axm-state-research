# State-root USB boot — proposed Gate 5

Claim status: **CONCEPTUAL CONNECTION / NOT IMPLEMENTED**

## Core model

A bootable AXM system could carry a sealed root starting state on USB media. The root is the known revision-zero system truth. Boot then becomes a bounded transition from that root through the actual machine's hardware projection into a current session state.

```text
sealed root state
  + verified boot chain
  + detected hardware projection
  + portable user capsule
  + accepted session deltas
  = current recoverable system state
```

The equation is architectural shorthand, not proof of a working operating system.

## Separation of state

### Immutable root

- versioned system files and defaults;
- canonical manifest and digest;
- minimum recovery environment;
- no user-specific secrets.

### Hardware projection

- firmware and boot-mode facts;
- detected CPU, memory, storage, display, input, and network devices;
- driver compatibility and selected driver state;
- explicit unsupported or degraded capabilities.

### Portable user capsule

- user-owned settings and identity references;
- user files or references to encrypted storage;
- explicitly portable capabilities;
- consent and return policy.

### Session delta log

- accepted installs and updates;
- settings changes;
- work state;
- receipts binding each prior and resulting state;
- checkpoints and rollback targets.

## Recovery behavior

If session state fails verification, the system can refuse the overlay and return to the immutable root plus a read-only view of the user capsule. If a hardware projection is incompatible, it can degrade or hold before mutating the root. Recovery never requires pretending two different machines have identical hardware state.

## Work still required

The Stateborn experiment does not implement or verify:

- BIOS/UEFI startup;
- bootloader or kernel loading;
- Secure Boot keys and trust policy;
- hardware drivers;
- disk encryption and secret handling;
- atomic persistent overlays;
- update signing;
- recovery across sudden power loss;
- portability across architectures.

The value of the connection is that these become separate gates around a stable root-state model rather than one undifferentiated OS problem.
