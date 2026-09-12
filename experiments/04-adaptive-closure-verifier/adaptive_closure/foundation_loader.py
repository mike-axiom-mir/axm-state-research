"""Reuse canonical helpers from the sibling AXM State Floor experiment."""

from __future__ import annotations

import sys
from pathlib import Path


FOUNDATION_ROOT = Path(__file__).resolve().parents[2] / "01-state-floor"
if not FOUNDATION_ROOT.exists():
    raise RuntimeError("canonical sibling experiments/01-state-floor is required")
if str(FOUNDATION_ROOT) not in sys.path:
    sys.path.insert(0, str(FOUNDATION_ROOT))

from axm_state_floor.canonical import canonical_bytes, deep_size, stable_hash  # noqa: E402

__all__ = ["FOUNDATION_ROOT", "canonical_bytes", "deep_size", "stable_hash"]
