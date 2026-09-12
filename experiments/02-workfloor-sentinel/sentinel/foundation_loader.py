"""Load the preserved AXM State Floor foundation bundled with this project."""

from __future__ import annotations

import sys
from pathlib import Path


_EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
_STANDALONE_FOUNDATION = _EXPERIMENT_ROOT / "foundation" / "axm-state-floor"
_REPOSITORY_FOUNDATION = Path(__file__).resolve().parents[2] / "01-state-floor"
FOUNDATION_ROOT = (
    _STANDALONE_FOUNDATION
    if _STANDALONE_FOUNDATION.exists()
    else _REPOSITORY_FOUNDATION
)
FOUNDATION_ARCHIVE_SHA256 = "bbdeefe7cecc79bd9096d7c9db6a2462833b1319ec8e350eef2bb121a0b7854d"
FOUNDATION_VERSION = "0.1.0"

if str(FOUNDATION_ROOT) not in sys.path:
    sys.path.insert(0, str(FOUNDATION_ROOT))

from axm_state_floor.canonical import canonical_bytes, deep_size, stable_hash  # noqa: E402
from axm_state_floor.contracts import ProposedDelta  # noqa: E402
from axm_state_floor.runtime import merge_proposals  # noqa: E402

__all__ = [
    "FOUNDATION_ARCHIVE_SHA256",
    "FOUNDATION_ROOT",
    "FOUNDATION_VERSION",
    "ProposedDelta",
    "canonical_bytes",
    "deep_size",
    "merge_proposals",
    "stable_hash",
]
