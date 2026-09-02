# Failures and Limitations

1. **A probabilistic or periodic audit is not proof.** Wrong state can persist between audits, self-heal before observation, or never be sampled.
2. **The fixture is tiny.** Six deliberately legible nodes establish mechanism behavior, not production scaling.
3. **The risk fixture is favorable.** Every planted fault coincided with a visible signal; an omission with ordinary shape, low authority, fresh age, and no abstention can evade it.
4. **Observed reads see executed reads only.** Opaque calls, hidden side effects, unexecuted branches, concurrency, and external systems are outside the tracker.
5. **Learned does not automatically mean safe.** This run adds only traced fields and replays against an oracle. Broader systems need authorization boundaries and adversarial checks.
6. **The full oracle is still the measurement truth.** Adaptive policies reduce how often runtime verification uses it; the experiment cannot score hidden corruption without an offline oracle.
7. **Repair has a checkpoint assumption.** A trustworthy last checkpoint and complete bounded event suffix are required. Missing events make exact replay impossible.
8. **Dormant invalid state was not repaired.** It was preserved as an explicit abstention/quarantine. The seeded sampler did not inspect it.
9. **Timings are host-specific.** Python object allocation and six cheap handlers do not predict another runtime.
10. **State Debt is fixture-bound.** Implicit zero wins strongly when defaults are unambiguous and cheap. It can lose when reconstruction, tombstones, provenance, or ambiguity metadata dominate.
11. **No AI, model weights, actuator, hardware, brain, physics, or matter-transfer mechanism was implemented or tested.**
