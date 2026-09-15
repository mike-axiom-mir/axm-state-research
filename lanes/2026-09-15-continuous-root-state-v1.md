# Lane receipt — Continuous Root State v1

- Date: 2026-09-15
- Branch: `exp/continuous-root-state-v1`
- Base: `main` at `a9db2e94cc9395293b8e4725e5e100500b3aa859`
- Intended pull request base: `main`
- Scope: one bounded experiment under `experiments/continuous-root-state-v1/`
- Coordination rule: one chat / one PR lane
- Merge/CANON gate: AXM roots — Truth, Agency/non-domination, Continuity, Wisdom before speed; technical Git permission alone is not authority
- Handoff state: unmerged experiment lane

## Bounded objective

Test whether a small root-state process can remain continuously active over a changing canonical software state, update only affected root predicates, detect incremental drift by independent full recomputation, bind itself to an exact frozen root donor, and reconstruct from a digest-bound checkpoint after restart.

This lane does not modify Mirror or Walmi.

## Donor provenance

Frozen donor root bundle:

- `mike-axiom-mir/axm-collaboration-platform`
- branch `mirror`
- commit `4a3727505576c4c95198a8287dd8ce1e82619f32`
- `roots/AXM_ROOTS_v1.json`
- experiment canonical-JSON SHA-256: `59651fbab19647713ea4f94aff98adab1c0a539cb3b61a7ad3f0b3374b4838cd`

The experiment digest is not claimed to equal Mirror's internal `State.digest`. The donor is retained verbatim as historical source evidence; its `amendmentAuthority` field is not imported as current State Research governance.

## Change

- add frozen Mirror root donor fixture;
- add a dependency-free Python continuous root-state evaluator;
- update only checks declared affected by each event;
- compare the incremental projection with an independent full recomputation;
- rollback an event transaction if drift is detected;
- bind checkpoints to root digest + exact machine state;
- reject root-donor or checkpoint tampering;
- add a planted dependency-omission negative control;
- retain a deterministic 12-event probe and raw result;
- leave three donor roots `UNMODELLED` rather than inventing predicates.

## Evidence run before commit

Executed locally on Python 3.13.5:

```bash
python -m unittest -v
python run_probe.py
```

Result:

- 11/11 tests passed;
- deterministic 12-event probe completed;
- incremental/full equality checked after every event;
- restart snapshot equality true;
- planted dependency omission detected and rolled back;
- no timing or memory benchmark was run.

## Truth boundary / limitations

The executable semantics cover only six donor root entries represented by the bounded Mirror Principle Cell-style checks. `no-fake-done`, `continuity`, and `wisdom-over-speed` remain explicitly `UNMODELLED`; therefore the experiment cannot emit an all-roots `PASS`.

This is not production hardening. Hostile processes, raw storage writers, firmware, power-loss durability, privileged debuggers, replacement boot chains, cryptographic authorship, neural behavior, real-world actions, and performance scaling are untested.

A successful PR is permission to retain this experiment as evidence, not automatic promotion into Mirror, Walmi, CANON, or a user-facing runtime.
