# Reference-state closure v1

This bounded experiment makes the test proposed in
[`2026-09-09-routing-convergence-reference-state.md`](../../research/2026-09-09-routing-convergence-reference-state.md)
executable. It asks whether sparse body execution can preserve the result of a
dense oracle when a sleeping specialist still contributes to shared
normalization state.

The fixture drives three engines over the same canonical state:

- **A — dense oracle:** recomputes every specialist body after every event and
  retains every reference/default field explicitly.
- **B — sparse plus reference closure:** runs only bodies whose declared input
  changed, reuses their last contribution, and updates a derived reference
  total without waking those bodies.
- **C — aggressive sparse control:** uses B's exact wake set but deliberately
  drops one sleeping specialist's reference contribution.

All calculations are integers. Normalized outputs are reduced fractions, and
replay evidence is hashed from canonical JSON. The fixture includes a
reference-only change, no-op input, materialized implicit default, and return
to default.

## Run

Python 3.10 or newer is sufficient; there are no third-party or network
dependencies.

```sh
python experiments/reference-state-closure-v1/experiment.py
python -m unittest discover \
  -s experiments/reference-state-closure-v1 \
  -p 'test_*.py' -v
```

The CLI exits zero only when B exactly matches A, C demonstrably diverges,
body work decreases, and the derived reference encoding is smaller. Tests also
inject a dropped reference-summary update and require the gate to hold.

## Interpretation boundary

A pass demonstrates reference-state closure for this inspectable software
workload. It does not establish neural-network, hardware, latency, or universal
scaling claims. The summary held by B is derived and rebuildable; canonical
fixture state remains authoritative. No external code, model, dataset, service,
or account is used.
