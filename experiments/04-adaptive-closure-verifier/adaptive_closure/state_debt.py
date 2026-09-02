"""Bounded dense-explicit versus implicit-default State Debt fixture."""

from __future__ import annotations

import json

from .foundation_loader import deep_size, stable_hash


def run_state_debt_fixture(perspectives: int = 10_000, active: int = 80) -> dict:
    active_ids = tuple(range(active))
    dense = {f"p{index:05d}": 1 if index in active_ids else 0 for index in range(perspectives)}
    sparse = {f"p{index:05d}": 1 for index in active_ids}
    dense_index = {key: ("wake",) for key in dense}
    sparse_index = {key: ("wake",) for key in sparse}
    dense_checkpoint = json.dumps(dense, sort_keys=True, separators=(",", ":")).encode()
    sparse_checkpoint = json.dumps(sparse, sort_keys=True, separators=(",", ":")).encode()

    def read(mapping: dict[str, int], key: str) -> int:
        return mapping.get(key, 0)

    probes = [f"p{index:05d}" for index in range(perspectives)]
    dense_outputs = [read(dense, key) for key in probes]
    sparse_outputs = [read(sparse, key) for key in probes]
    replay_events = [(f"p{index:05d}", 1) for index in range(active)] + [(f"p{index:05d}", 0) for index in range(0, active, 2)]
    dense_replay = dict(dense)
    sparse_replay = dict(sparse)
    materializations = 0
    for key, value in replay_events:
        dense_replay[key] = value
        if value:
            if key not in sparse_replay:
                materializations += 1
            sparse_replay[key] = value
        else:
            sparse_replay.pop(key, None)
    replay_equal = all(dense_replay[key] == sparse_replay.get(key, 0) for key in dense_replay)
    return {
        "schema": "axm.adaptive-closure.state-debt/v1", "fixture_units": "Python object graph bytes and UTF-8 JSON bytes",
        "perspectives": perspectives, "active": active,
        "dense": {"resident_bytes": deep_size({"state": dense, "index": dense_index}), "checkpoint_bytes": len(dense_checkpoint), "writes": perspectives, "reads": perspectives, "index_edges": perspectives, "materializations": perspectives},
        "implicit": {"resident_bytes": deep_size({"state": sparse, "index": sparse_index}), "checkpoint_bytes": len(sparse_checkpoint), "writes": active, "reads": perspectives, "index_edges": active, "materializations": active + materializations},
        "initial_output_equality": dense_outputs == sparse_outputs,
        "replay_equality": replay_equal,
        "final_hash": stable_hash(dense_outputs),
    }
