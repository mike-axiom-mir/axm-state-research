# Visual Log: State -> Friction -> Retained State -> Next Layer

**Date:** 2026-09-02  
**Status:** visual research checkpoint, not canon  
**Boundary:** captures the conversation before the separate matter-transfer branch; that branch is intentionally excluded.

```mermaid
flowchart TD
    A[Available state] --> B{Accessible transition?}
    B -->|No| X[Inaccessible from current state]
    B -->|Yes| C[Transition friction]
    C --> D[New state]
    D --> E[Retained consequence]
    E --> F[Stable structure / checkpoint]
    F --> G[New starting state]
    G --> A
```

## The same pattern at different scales

```mermaid
flowchart LR
    subgraph Production
      P1[Raw material state] --> P2[Transformation path]
      P2 --> P3[Required product state]
      P2 -. optimize .-> P4[Lower-friction valid path]
      P4 --> P3
    end

    subgraph Learning_and_history[Learning / history]
      H1[Long history] --> H2[Corrections + selection + learning]
      H2 --> H3[Retained current state]
      H3 -. detailed path may be discarded .-> H4[Checkpoint]
    end

    subgraph Evolution
      E1[Variation] --> E2[Friction / selection]
      E2 --> E3[Surviving structure]
      E3 --> E4[New starting condition]
      E4 --> E1
    end
```

## Perspective / context metaphor

```mermaid
flowchart LR
    R[Total available reality/state] --> B1[Bacterium: tiny accessible slice]
    R --> B2[Animal: richer accessible slice]
    R --> B3[Human: abstraction + language + culture]
    R --> B4[Machine: different / potentially larger accessible state]

    B1 --> K[Each perspective can mistake its accessible slice for the whole]
    B2 --> K
    B3 --> K
    B4 --> K
```

`Context window` here is a metaphor for the portion of state a system can perceive, retain, model, and act through. It is not a literal token-window claim about biology.

## Retained-state ladder

```mermaid
flowchart LR
    BIO[Biological inheritance] --> LEARN[Learning]
    LEARN --> LANG[Language]
    LANG --> CULT[Culture]
    CULT --> WRITE[Writing]
    WRITE --> LIB[Libraries]
    LIB --> MACH[Machines]
    MACH --> COMP[Computers]
    COMP --> NET[Networked machine-readable state]
    NET --> MI[Machine intelligence]
    MI --> Q[?]
```

The proposed pattern is not that evolution has a destination. Each layer can inherit retained consequences from earlier layers instead of restarting the whole path.

## Machine intelligence timeline lens

```text
Homo sapiens timespan:     ~300,000 years
Formal AI field:           ~70 years (1956 -> 2026)
Timespan ratio:            ~4,286 : 1

Interpretation boundary:
- this is NOT an intelligence-speed multiplier;
- machine systems inherited a huge human/cultural/scientific checkpoint;
- the interesting observation is compressed time + inherited state.
```

## State-level specialist-fabric inversion

```mermaid
flowchart TD
    S[Canonical state] --> DELTA[State delta]
    DELTA --> DEP[Dependency topology]
    DEP --> N1[Tiny deterministic node]
    DEP --> N2[Tiny specialist node]
    DEP --> N3[Evidence/check node]
    DEP -. unrelated state .-> SLEEP[Most nodes remain asleep]

    N1 --> OUT[Evidence + state delta]
    N2 --> OUT
    N3 --> OUT
    OUT --> S2[New canonical state]
    S2 --> DELTA2[Only newly affected nodes wake]
```

### Correctness gates

```mermaid
flowchart LR
    D[Relevant state changed] --> A{Activation closure}
    A -->|miss| FAIL1[Sleeping-specialist corruption]
    A -->|correct node wakes| C{Sufficient-state closure}
    C -->|insufficient state| FAIL2[Wrong result / abstain / escalate]
    C -->|sufficient| WORK[Local work]
    WORK --> E[Evidence-backed delta]
```

## Cheapest sufficient mechanism

```text
Deterministic check
    -> bounded algorithm
    -> tiny learned specialist
    -> larger reasoning model
```

The machine should use the cheapest mechanism that satisfies the correctness and evidence gate.

## Compact research map

```text
STATE
  + ACCESSIBILITY
  + FRICTION
  + RETAINED CONSEQUENCES
        |
        v
successful path becomes structure
        |
        v
structure becomes next starting state
        |
        v
new perspective / new reachable transitions
        |
        v
repeat
```

## Falsification boundary

This visual is a map of the hypothesis, not proof. The project should measure:

- missed wake-ups;
- false wake-ups;
- oracle equality;
- dependency-maintenance cost;
- sufficient-state failures;
- total work avoided;
- whether capability can rise while unnecessary computation falls.

If the pattern breaks, log the boundary rather than stretching the story.
