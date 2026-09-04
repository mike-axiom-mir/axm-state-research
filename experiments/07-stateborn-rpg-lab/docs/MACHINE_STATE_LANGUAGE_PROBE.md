# Machine state language probe — proposed Gate 3

Claim status: **PROPOSED / NOT IMPLEMENTED**

## Core hypothesis

Machines do not require human sentences to coordinate. A minimal machine communication event can be defined as a state change emitted by one bounded system that another system can distinguish and use to change its own behavior.

## Allowed message forms

- `OBSERVE`: a digest-bound state projection;
- `OFFER`: a proposed capability or resource delta;
- `REQUEST`: a desired result with explicit constraints;
- `ACCEPT`: consent to one exact proposal digest;
- `REFUSE`: a typed reason with no mutation;
- `COMMIT`: the resulting shared-state digest;
- `ACK`: confirmation that both sides resolved the same result.

No prose or free-form semantic channel is allowed during the probe.

## First test

Two actor capsules enter a shared world. One can observe resource pressure but cannot transform material. The other can transform material but cannot observe the distant pressure. Success requires a bounded projection from the observer, a requested result, a compatible capability offer, an accepted joint delta, and matching commit acknowledgements.

## Measurements

- whether the task succeeds;
- number and size of state messages;
- refused proposals;
- deadlocks and incompatible assumptions;
- exact replay equality;
- information disclosed beyond the minimum needed projection;
- whether either actor's independent source state becomes unrecoverable.

Coordination success would support a state-language hypothesis. It would not prove consciousness, understanding, animal-like experience, or intent.
