# Curiosity Incentive Mini Experiment v0.3.0

## Question

Can a deterministic actor loop slowly change a game world because unfamiliar state is interesting, without feeding success or damage back as the action objective?

## Boundary

This is a software policy test. “Curiosity” names the selection rule; it does not claim feeling, consciousness, desire, or selfhood.

The policy receives a deliberately narrow projection:

```text
actor ID
step
position
current terrain + phase + observation signature
neighbour terrain + phase + seen count + tried count
signal trial counts for the current context
moves since the last state signal
```

The policy does not receive:

```text
reward
success
damage
vitality
bloom
scar
health drift
observer summary
```

The game observer receives those consequence labels only after the transition commits. Tests mutate observer summaries to extreme false values and confirm that the next curiosity decision remains byte-equivalent.

## Loop

1. Select the next actor in deterministic order.
2. Construct its narrow machine-visible view.
3. Score candidate moves and signals by unfamiliarity and least-tried context.
4. Break equal novelty deterministically from seed + step + actor + action key.
5. Commit the chosen state transition.
6. Apply the hidden environment response to signals.
7. Project observer-only growth, damage, and patterns.
8. Bind the view, choice, consequence, state digests, and revision into a receipt.
9. Repeat.

No natural-language message is passed between actors. A `shared_echo` appears only when evidence shows that more than one actor changed the same cell.

## Measured 12-seed result

Each seed ran 64 steps from exact genesis.

| Measure | Result |
| --- | ---: |
| Replay equality | 12 / 12 |
| Clean policy views | 12 / 12 |
| Both growth and damage observed | 12 / 12 |
| Positive final health drift | 10 |
| Zero final health drift | 0 |
| Negative final health drift | 2 |
| Changed cells per run | 22–31 |

Seed `AXM-CURIOSITY-001` produced 23 changed cells, 3 growth events, 5 damage events, 3 bloom cells, 4 scar cells, 7 shared echoes, and health drift −3 after exactly 64 steps. Its digest was:

```text
79fafb1488d2118653c196624312ba37fe1ceab688ef715a99d77bb31fde544f
```

## Interpretation

Observed: curiosity-only selection is sufficient to create mixed, sparse, repeatable game-world consequences. Different actors sometimes converge on the same changed cells without exchanging messages.

Not observed: open-ended rule creation, semantic understanding, stable ecology, improvement, wisdom, fun, or advantage over an efficiency policy.

The repeated four projected patterns are partly a consequence of authored thresholds. They are observer summaries, not self-discovered concepts. The next useful test should alter or remove those projections and compare raw state histories before adding more story-like machinery.

## Reuse decision

Retain:

- the narrow policy boundary;
- outcome-isolation test;
- shared-echo evidence rule;
- multi-seed probe;
- mixed positive/negative results;
- deterministic receipt and replay chain.

Do not promote:

- pattern names as machine meanings;
- positive health drift as success;
- negative drift as failure;
- the current thresholds as canon;
- any claim that this is a conscious form of curiosity.
