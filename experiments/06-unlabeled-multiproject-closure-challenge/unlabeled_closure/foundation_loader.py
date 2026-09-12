"""Import canonical repository experiments without copying their source."""

from __future__ import annotations

import sys
from pathlib import Path


EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
STATE_FLOOR_ROOT = REPOSITORY_ROOT / "experiments" / "01-state-floor"
SENTINEL_ROOT = REPOSITORY_ROOT / "experiments" / "02-workfloor-sentinel"
REAL_PROJECT_ROOT = REPOSITORY_ROOT / "experiments" / "05-real-project-closure-trial"

for root in (STATE_FLOOR_ROOT, SENTINEL_ROOT, REAL_PROJECT_ROOT):
    if not root.exists():
        raise RuntimeError(f"required canonical sibling is absent: {root}")
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

from real_project_closure.model import MissingEvidence, traced_state  # noqa: E402
from sentinel.checks import evaluate_check, make_checks  # noqa: E402
from sentinel.contracts import CheckContract  # noqa: E402
from sentinel.foundation_loader import canonical_bytes, deep_size, stable_hash  # noqa: E402
from sentinel.snapshot import category_for_path, load_project_snapshot, make_file_record  # noqa: E402

__all__ = [
    "CheckContract",
    "EXPERIMENT_ROOT",
    "MissingEvidence",
    "REPOSITORY_ROOT",
    "canonical_bytes",
    "category_for_path",
    "deep_size",
    "evaluate_check",
    "load_project_snapshot",
    "make_checks",
    "make_file_record",
    "stable_hash",
    "traced_state",
]
