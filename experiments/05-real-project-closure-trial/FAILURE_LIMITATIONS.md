# Failures and Limitations

1. **Broken routing failed visibly.** `BROKEN_NO_AUDIT` retained 18 silent stale output occurrences across all six held-out transitions, ended unequal, and reached a six-transition maximum silent window.
2. **Observed reads alone missed an unexecuted branch.** The held-out negative timing activated a recursive branch that training had not exposed. `OBSERVED_READS` retained that stale timing output for three transitions and ended unequal.
3. **A pass is fixture-bound.** Declared-risk and combined policies passed six held-out mutations over this registry. This does not prove dependency completeness for other content, paths, check implementations, risk labels, or projects.
4. **Risk tags are trusted declared inputs.** Missing, incorrect, or adversarial tags could remove the audits that caught the held-out conditional fault.
5. **Observed reads see executed accesses only.** Opaque calls, external I/O, dynamic loading, concurrency, effects, and unexecuted branches remain outside the wrapper.
6. **The offline oracle remains necessary for scoring.** It executed 1,452 checks per policy's held-out run and dominated measured wall time. Its answers never routed or repaired the tested policies, but hidden corruption cannot be counted without it.
7. **The checkpoint is an assumption.** Held-out evaluation begins from a verified post-training output checkpoint. A system unable to obtain or trust such a checkpoint has a harder recovery problem.
8. **The dormant invalid item remains unresolved.** It was quarantined with provenance and happened not to affect final output in this trace. Final equality does not mean all metadata is healthy.
9. **Audit+replay is not total policy work.** The gate required 110 audit+replay executions versus 1,452 oracle executions. The combined policy also executed 44 sparse checks; all counts are reported so the narrower gate is not mistaken for total cost.
10. **Checks are deterministic and side-effect free.** The repair/replay mechanism does not establish safety for effectful, hostile, or non-deterministic evaluators.
11. **Minimization is bounded.** Greedy deletion produced reproducible one-mutation examples in this six-item trace; it does not prove a globally minimal semantic cause in arbitrary mutation languages.
12. **Timings are host-specific.** CPython object wrappers and one Linux x86_64 run do not predict another runtime or machine.
13. **No production, security, AI, model-weight, hardware, brain, physics, or domain-actuator claim was tested.** This remains a software-runtime experiment.

