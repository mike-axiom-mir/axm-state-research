"""Import the canonical Workfloor Sentinel implementation without copying it."""

from __future__ import annotations

import sys
from pathlib import Path


EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
SENTINEL_ROOT = Path(__file__).resolve().parents[2] / "02-workfloor-sentinel"
STATE_FLOOR_ROOT = Path(__file__).resolve().parents[2] / "01-state-floor"
if not SENTINEL_ROOT.exists() or not STATE_FLOOR_ROOT.exists():
    raise RuntimeError("canonical sibling experiments 01 and 02 are required")
for root in (SENTINEL_ROOT, STATE_FLOOR_ROOT):
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

from sentinel.checks import evaluate_check, make_checks  # noqa: E402
from sentinel.contracts import CheckContract, FileChange  # noqa: E402
from sentinel.foundation_loader import canonical_bytes, stable_hash  # noqa: E402
from sentinel.runtime import apply_file_change  # noqa: E402
from sentinel.snapshot import load_project_snapshot  # noqa: E402

__all__ = [
    "CheckContract",
    "EXPERIMENT_ROOT",
    "FileChange",
    "SENTINEL_ROOT",
    "apply_file_change",
    "canonical_bytes",
    "evaluate_check",
    "load_project_snapshot",
    "make_checks",
    "stable_hash",
]
