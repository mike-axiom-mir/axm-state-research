import json
import os

from continuous_root_state import ContinuousRootState, load_root_bundle

HERE = os.path.dirname(__file__)
FIXTURE = os.path.join(HERE, "fixture", "mirror_roots_v1.json")
EXPECTED_ROOT_DIGEST = "59651fbab19647713ea4f94aff98adab1c0a539cb3b61a7ad3f0b3374b4838cd"

EVENTS = [
    {"type": "require_permission", "value": "world.write"},
    {"type": "grant_permission", "value": "world.write"},
    {"type": "require_evidence", "value": "receipt:1"},
    {"type": "add_evidence", "value": "receipt:1"},
    {"type": "support_evidence", "value": "receipt:1"},
    {"type": "mark_contradicted", "value": "receipt:1"},
    {"type": "clear_contradicted", "value": "receipt:1"},
    {"type": "set_mutating", "value": True},
    {"type": "set_recovery", "value": True},
    {"type": "set_max_risk", "value": "medium"},
    {"type": "set_risk", "value": "high"},
    {"type": "set_max_risk", "value": "high"},
]


def snapshot_dict(snapshot):
    return {
        "sequence": snapshot.sequence,
        "machine_state_digest": snapshot.machine_state_digest,
        "root_bundle_digest": snapshot.root_bundle_digest,
        "aggregate_status": snapshot.aggregate_status,
        "checks": snapshot.checks,
    }


def main():
    bundle = load_root_bundle(FIXTURE)
    live = ContinuousRootState(
        bundle,
        expected_root_digest=EXPECTED_ROOT_DIGEST,
        verify_every=1,
    )

    trace = [snapshot_dict(live.snapshot())]
    for event in EVENTS:
        trace.append({"event": event, **snapshot_dict(live.apply(event))})

    checkpoint = live.checkpoint()
    restored = ContinuousRootState.restore(bundle, checkpoint, verify_every=1)
    restart_equal = live.snapshot() == restored.snapshot()

    output = {
        "schema": "axm.state-research.continuous-root-state/probe-v1",
        "claim": "incremental-vs-full-equivalence-for-this-bounded-event-sequence",
        "root_donor_digest": EXPECTED_ROOT_DIGEST,
        "events": len(EVENTS),
        "incremental_full_verified_every_event": True,
        "restart_equal": restart_equal,
        "final": snapshot_dict(restored.snapshot()),
        "trace": trace,
        "limitations": [
            "The fixture models only the root predicates already represented by the bounded experiment.",
            "UNMODELLED roots are not promoted to PASS.",
            "This is deterministic software evidence, not a production safety proof.",
            "No hardware, power-loss, hostile-process, cryptographic-authorship, or neural-runtime claim is made.",
        ],
    }
    print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
