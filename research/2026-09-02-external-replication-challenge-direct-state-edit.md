# External Replication Challenge: Direct-State Editing vs Training

**Status:** open falsification challenge / research invitation  
**Date:** 2026-09-02  
**Lane:** `chatgpt/state-friction-specialist-fabric-2026-09-02`

## Question

For one narrow, predeclared model behavior, can a researcher identify and apply a bounded internal model-state change that reproduces the desired behavior more cheaply than ordinary training or fine-tuning, while keeping unrelated behavior within a declared tolerance?

This is intentionally much smaller than "replace pretraining." It asks whether some known behavioral transitions can be reached by a direct machine-state edit once the relevant internal structure is identified.

## Why this test matters

Current training commonly uses a long indirect path:

```text
desired behavior
  -> examples / data
  -> optimization
  -> many parameter updates
  -> target behavior
```

The state-research hypothesis asks whether, for some bounded cases, a shorter path exists:

```text
desired behavior
  -> identify relevant internal state / circuit / feature set
  -> compute bounded edit
  -> apply edit
  -> verify target + collateral behavior
```

The expected cost advantage, if any, is not assumed. It must be measured.

## Minimal experiment

Use an openly inspectable model where weights and activations can be examined and modified.

1. Freeze one original checkpoint `M0`.
2. Define one narrow target behavior `B` before any editing.
3. Build a standard comparison route using fine-tuning, adapter training, or another accepted learning method, producing `MT`.
4. Independently search for a bounded internal edit producing `ME`.
5. Run the same target and collateral evaluations on `M0`, `MT`, and `ME`.
6. Restore `M0` and reapply the edit to test reproducibility.
7. Publish the full receipts, including failures.

## Required measurements

Record at least:

```text
target success
compute used to discover the edit
compute used to apply the edit
number / fraction of parameters or internal structures changed
wall-clock time
training examples used
unrelated-task drift
rare / adversarial regression tests
rollback equality
reapplication reproducibility
edit stability across paraphrases / nearby prompts
```

Do not report only the application cost of the final edit. The **discovery cost** must be included separately, otherwise the comparison is misleading.

## Hard gate

A direct edit is not a success merely because the target behavior improves.

Minimum success condition:

```text
target behavior reaches declared threshold
AND
collateral behavior remains inside declared tolerance
AND
edit can be reproduced from M0
AND
rollback restores the baseline within declared equality/tolerance
```

If the target improves but collateral drift is large or poorly measured, classify the result as `UNRESOLVED` or `FAILED_BOUNDARY`, not success.

## Useful outcome classes

### A. Direct edit clearly loses

If finding a safe edit costs as much as or more than ordinary training, or collateral drift cannot be bounded, record that result. This weakens the direct-compilation hypothesis for the tested class.

### B. Direct edit works but discovery is expensive

This would support a distinction between:

```text
expensive discovery
cheap execution
```

The next research problem would be compiling future edits without repeating the full discovery process.

### C. Direct edit becomes predictable

If multiple related target behaviors can be translated into reproducible internal edits with bounded collateral effects, that would be substantially stronger evidence for a machine-state compiler direction.

### D. Only some model regions are safely editable

This is also valuable. The result may reveal which representations behave like locally addressable state and which remain strongly entangled.

## Recommended target properties

Choose a target that is:

- narrow enough to measure;
- absent or reliably weak in `M0`;
- testable with held-out examples;
- not dependent on subjective scoring alone;
- safe and non-harmful;
- separable from unrelated model capabilities as much as practical.

Possible benign classes include a synthetic factual mapping, a bounded transformation rule, a narrow formatting invariant, or a small algorithmic behavior.

## Multiple expert models are allowed

The experiment does not require one model to solve everything. A research team may use separate systems for:

```text
internal-state localization
candidate edit generation
collateral-effect search
adversarial testing
verification / receipt generation
```

What matters is the total measured cost and whether the final edit is reproducible and bounded.

## What would count as especially interesting evidence?

- a tiny edit repeatedly reproduces a behavior otherwise learned through many training examples;
- the same editing rule generalizes across several related behaviors;
- the edit can be computed from an explicit target-state specification rather than found through blind search;
- the total discovery + execution cost falls well below the comparison training route;
- unrelated behavior remains measurably unchanged;
- a deterministic verifier can certify the declared edit boundary.

## What this challenge does not claim

It does **not** claim:

- that arbitrary capabilities can already be compiled directly;
- that model knowledge is stored in isolated single parameters;
- that data-driven learning is unnecessary;
- that direct editing is automatically safer than training;
- that a successful small edit scales to frontier-model self-modification.

## External replication request

Companies, universities, independent labs, and open-source researchers are welcome to run a version of this test.

Useful public outputs would include:

```text
model + checkpoint hash
exact target definition
baseline evaluations
training comparison configuration
edit-search method
edit representation / delta statistics
compute and wall-clock receipts
collateral evaluations
rollback test
failed attempts
code / scripts where publishable
```

A negative result is useful evidence. A partial result is useful evidence. The goal is not to "prove AXM right"; the goal is to reduce uncertainty about whether high-level training can sometimes be replaced by a much shorter, verifiable machine-state transition.

## Compact hypothesis

```text
If a desired behavioral transition has a stable, addressable machine-state representation,
then discovering that representation may be expensive,
but applying the correct bounded edit should be much cheaper than rediscovering it through training.
```

The open question is whether that mapping can become predictable enough to function as a true compiler rather than one-off model surgery.
