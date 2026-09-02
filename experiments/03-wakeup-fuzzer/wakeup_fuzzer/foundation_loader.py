"""Reuse canonical helpers from the sibling AXM State Floor experiment."""

from __future__ import annotations

import sys
from pathlib import Path


FOUNDATION_ROOT = Path(__file__).resolve().parents[2] / "01-state-floor"
FOUNDATION_VERSION = "0.1.0"

if not FOUNDATION_ROOT.exists():
    raise RuntimeError(
        "AXM Wakeup Fuzzer requires the canonical sibling "
        "experiments/01-state-floor source tree"
    )

if str(FOUNDATION_ROOT) not in sys.path:
    sys.path.insert(0, str(FOUNDATION_ROOT))

from axm_state_floor.canonical import canonical_bytes, deep_size, stable_hash  # noqa: E402

__all__ = [
    "FOUNDATION_ROOT",
    "FOUNDATION_VERSION",
    "canonical_bytes",
    "deep_size",
    "stable_hash",
]
