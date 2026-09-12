# Next Experiment

## Strongest next test: real-trace semantic invalidation

Replay a recorded sequence of changes from one real AXM build through a heterogeneous state floor and test whether sparse routing ever sleeps a node whose output should change.

The next run should:

1. Define 100–300 genuinely different deterministic checks from a real project state instead of scaling mostly identical variants.
2. Record a fixed change trace with ground-truth expected invalidations.
3. Compare three architectures:
   - sparse state floor;
   - shared-snapshot full scan with no history duplication;
   - duplicated full-state/history baseline.
4. Measure false wake-ups and, most importantly, missed wake-ups.
5. Add dependency edges only as scheduler metadata; keep nodes from direct chatter.
6. Track which historical facts each decision needs and promote only proven sufficient summaries into canonical state.
7. Run each benchmark in an isolated fresh process with warmups and repeated samples.
8. Feed only unresolved conflict objects to a mock expensive capability first; connect a real AI only after deterministic equivalence is established.

## Falsification gate

The sparse design fails the next experiment if it achieves speed by missing any expected invalidation, cannot preserve output equivalence with the shared-snapshot baseline, or requires routing metadata so complex that coordination cost cancels the saved evaluations.

This is stronger than testing more registered variants. It attacks the largest remaining unknown: whether relevance can be identified safely in a real, heterogeneous work graph.
