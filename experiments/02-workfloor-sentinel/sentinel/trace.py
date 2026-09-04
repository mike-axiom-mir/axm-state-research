"""Recorded adversarial file changes applied in memory, never to source files."""

from __future__ import annotations

import json
from typing import Any

from .contracts import FileChange


def _content(state: dict[str, Any], path: str) -> str:
    return state["project"]["files"][path]["content"]


def make_adversarial_trace(state: dict[str, Any]) -> tuple[FileChange, ...]:
    readme = _content(state, "README.md").replace("This is not a hardware layer", "This is a hardware layer", 1)
    runtime = _content(state, "axm_state_floor/runtime.py") + "\n# injected trace fixture\nDANGEROUS_FIXTURE = eval('1 + 1')\n"
    benchmark = json.loads(_content(state, "results/benchmark_results.json"))
    benchmark["scaling_runs"][-1]["comparison"]["final_state_output_equivalence"] = False
    benchmark_text = json.dumps(benchmark, indent=2, sort_keys=True) + "\n"
    tests = _content(state, "tests/test_runtime.py").replace(
        "test_genuine_conflicts_are_explicit_and_unresolved",
        "conflict_guard_fixture_removed",
        1,
    )
    pyproject = _content(state, "pyproject.toml").replace('requires-python = ">=3.11"', 'requires-python = ">=99"', 1)
    return (
        FileChange(
            "remove-software-boundary",
            "update",
            "README.md",
            readme,
            "Reverse the explicit software-not-hardware claim boundary.",
        ),
        FileChange(
            "inject-dynamic-eval",
            "update",
            "axm_state_floor/runtime.py",
            runtime,
            "Inject a syntactically valid dynamic eval call.",
        ),
        FileChange(
            "break-output-equivalence-claim",
            "update",
            "results/benchmark_results.json",
            benchmark_text,
            "Change one raw equivalence flag without editing the report.",
        ),
        FileChange(
            "remove-conflict-test-name",
            "update",
            "tests/test_runtime.py",
            tests,
            "Remove the named explicit-conflict regression test.",
        ),
        FileChange(
            "delete-license",
            "delete",
            "LICENSE",
            None,
            "Delete the license text.",
        ),
        FileChange(
            "raise-python-requirement",
            "update",
            "pyproject.toml",
            pyproject,
            "Change the supported Python requirement to an impossible floor.",
        ),
        FileChange(
            "add-invalid-python-file",
            "add",
            "axm_state_floor/ghost.py",
            "def broken(:\n    pass\n",
            "Add a new Python file that cannot parse.",
        ),
    )
