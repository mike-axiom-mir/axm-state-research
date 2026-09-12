# Preserved pre-optimization run

This directory preserves the first complete benchmark before state hashing was cached once per state cycle.

At 10,000 registered nodes the original sparse transition took 667.410 ms. Routing took 19.391 ms, merge took 24.352 ms, and handlers took 26.398 ms. Inspection showed that receipt creation recomputed an identical canonical state hash for every invocation.

The repaired run in the parent `results/` directory computes one hash per cycle. It produced the same deterministic output and reduced sparse wall time to 158.105 ms. The original files remain here to avoid silently rewriting failed or weaker evidence.
