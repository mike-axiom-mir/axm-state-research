# Coexistence Field — Evidence Report v0.4.0

Date: 2026-09-04

## Question

Can a human, a machine-curiosity process, and an AI-compatible seat change the
same state world without pretending that all three possess the same authority?

## Implemented boundary

| Seat | Receives | May do | Cannot do |
|---|---|---|---|
| Human / Witness | rendered game state | choose one validated intent | bypass the referee |
| Machine / Mote | terrain, phase, novelty and trial counts | select one curiosity intent | see reward or observer outcomes |
| AI-compatible / Lumen | bounded local view | propose one intent | commit state directly |
| Local referee | canonical state and contracts | validate and commit consequences | invent a replacement for a refused proposal |

The offline AI-compatible seat uses `DETERMINISTIC_STAND_IN`. No model ran.
An external proposal can be supplied manually to test the interface, including
its refusal behavior.

## Adventure projection rules

- `shared_site`: at least two roles have committed signals at one cell;
- `three_way_mark`: human, machine, and AI-compatible roles have each committed a signal at one cell;
- `encounter`: co-located seats each possess a recorded event at that cell;
- `cross_role_recovery`: a different role produces positive vitality after a recorded negative-vitality event at the same cell.

Each projection stores its supporting event IDs. These labels belong to the
observer/game layer; they are not meanings supplied to the machine policy.

## Twelve-seed probe

Parameters: 12 deterministic seeds × 64 cycles, three seat opportunities per
cycle, scripted human inputs, deterministic machine policy, deterministic
stand-in proposals.

- exact replay: 12 / 12 PASS;
- machine views free of forbidden outcome fields: 12 / 12;
- runs containing growth and damage: 12 / 12;
- runs containing a shared site: 12 / 12;
- runs containing a three-way mark: 12 / 12;
- changed cells per run: 9–18;
- materialized cells per run: 22–43;
- final health drift: −12 to +7;
- events per run: 192.

The fixture and scripted human input make this a mechanism probe, not a claim
of spontaneous society. The useful result is that every consequence remains
locally validated, mixed outcomes remain visible, policy blindness survives,
and exact replay covers both accepted and refused proposal paths.

## Not proven

- machine consciousness, feelings, or subjective curiosity;
- participation by a real AI model in this offline build;
- human-machine understanding or communication;
- fun, narrative depth, long-term ecology, or open-ended novelty;
- networked multiplayer or portable person-state composition;
- correctness outside this game-only sandbox.
