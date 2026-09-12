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

## Portable one-file runner

The existing experiment can also be packaged without copying or rewriting its
model code:

```sh
python experiments/reference-state-closure-v1/portable.py build \
  --output reference-state-closure.pyz
python experiments/reference-state-closure-v1/portable.py verify \
  reference-state-closure.pyz
python reference-state-closure.pyz verify
python reference-state-closure.pyz describe
python reference-state-closure.pyz run
```

The deterministic ZIP application carries the exact experiment source, default
fixture, Apache-2.0 license bytes, and a member-hash descriptor. It can be copied
to an unrelated local directory and run with Python alone. Provider-side
`portable.py verify` additionally requires those packaged bytes to match the
current repository source.

Standalone `verify` proves the archive is internally consistent with its own
embedded descriptor; it is not a signature and cannot authenticate a producer
that deliberately substitutes and re-seals every member. A caller that needs
source identity must keep an independently trusted artifact/source digest or
run the provider-side verifier against a trusted checkout. Packaging grants no
automatic execution, installation, selection, merge, or CANON authority.

## Interpretation boundary

A pass demonstrates reference-state closure for this inspectable software
workload. It does not establish neural-network, hardware, latency, or universal
scaling claims. The summary held by B is derived and rebuildable; canonical
fixture state remains authoritative. No external code, model, dataset, service,
or account is used.
