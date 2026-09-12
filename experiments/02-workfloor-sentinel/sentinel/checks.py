"""Heterogeneous deterministic checks over a real project snapshot."""

from __future__ import annotations

import ast
import hashlib
import json
import re
import tomllib
from pathlib import PurePosixPath
from typing import Any, Callable

from .contracts import CheckContract


Evaluator = Callable[[dict[str, Any], CheckContract], dict[str, Any]]


def _params(**values: Any) -> tuple[tuple[str, Any], ...]:
    return tuple(sorted(values.items()))


def _record(state: dict[str, Any], path: str) -> dict[str, Any] | None:
    return state["project"]["files"].get(path)


def _content(state: dict[str, Any], path: str) -> str | None:
    record = _record(state, path)
    return None if record is None else record["content"]


def _out(passed: bool, value: Any, detail: str) -> dict[str, Any]:
    return {"status": "PASS" if passed else "FAIL", "value": value, "detail": detail}


def file_present(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    path = check.param_dict()["path"]
    present = _record(state, path) is not None
    return _out(present, present, f"file {'present' if present else 'missing'}: {path}")


def file_nonempty(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    path = check.param_dict()["path"]
    content = _content(state, path)
    size = 0 if content is None else len(content.encode("utf-8"))
    return _out(size > 0, size, f"UTF-8 bytes: {size}")


def content_sha(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    path = check.param_dict()["path"]
    record = _record(state, path)
    if record is None:
        return _out(False, None, "file missing")
    actual = hashlib.sha256(record["content"].encode("utf-8")).hexdigest()
    return _out(actual == record["sha256"], actual, "content digest matches canonical metadata")


def no_tabs(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    count = 0 if content is None else content.count("\t")
    return _out(content is not None and count == 0, count, "tab character count")


def bounded_lines(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    content = _content(state, params["path"])
    maximum = 0 if content is None else max((len(line) for line in content.splitlines()), default=0)
    return _out(content is not None and maximum <= params["limit"], maximum, f"maximum line length <= {params['limit']}")


def python_ast_valid(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        ast.parse(content)
    except SyntaxError as error:
        return _out(False, {"line": error.lineno, "kind": error.__class__.__name__}, "Python parse failed")
    return _out(True, True, "Python AST parsed")


def module_docstring(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return _out(False, None, "AST unavailable")
    present = bool(ast.get_docstring(tree))
    return _out(present, present, "module docstring presence")


def no_dynamic_eval(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return _out(False, None, "AST unavailable")
    calls = sorted(
        node.func.id
        for node in ast.walk(tree)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec"}
    )
    return _out(not calls, calls, "dynamic eval/exec calls")


def no_wildcard_import(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return _out(False, None, "AST unavailable")
    wildcard_count = sum(
        1
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and any(alias.name == "*" for alias in node.names)
    )
    return _out(wildcard_count == 0, wildcard_count, "wildcard import count")


def python_symbol_counts(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return _out(False, None, "AST unavailable")
    counts = {
        "async_functions": sum(isinstance(node, ast.AsyncFunctionDef) for node in ast.walk(tree)),
        "classes": sum(isinstance(node, ast.ClassDef) for node in ast.walk(tree)),
        "functions": sum(isinstance(node, ast.FunctionDef) for node in ast.walk(tree)),
        "imports": sum(isinstance(node, (ast.Import, ast.ImportFrom)) for node in ast.walk(tree)),
    }
    return _out(True, counts, "AST symbol counts")


def markdown_h1(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    headings = [] if content is None else [line[2:].strip() for line in content.splitlines() if line.startswith("# ")]
    return _out(len(headings) == 1, headings, "exactly one level-one heading")


def markdown_fences(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    count = 0 if content is None else sum(line.strip().startswith("```") for line in content.splitlines())
    return _out(content is not None and count % 2 == 0, count, "fenced-code delimiter count is even")


def markdown_heading_order(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    levels = [] if content is None else [len(match.group(1)) for line in content.splitlines() if (match := re.match(r"^(#{1,6})\s", line))]
    jumps = [(left, right) for left, right in zip(levels, levels[1:]) if right > left + 1]
    return _out(content is not None and not jumps, jumps, "heading-level jumps")


def json_valid(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    if content is None:
        return _out(False, None, "file missing")
    try:
        value = json.loads(content)
    except json.JSONDecodeError as error:
        return _out(False, {"line": error.lineno, "column": error.colno}, "JSON parse failed")
    return _out(True, type(value).__name__, "JSON parsed")


def json_schema_present(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    try:
        value = json.loads(content) if content is not None else None
    except json.JSONDecodeError:
        value = None
    schema = value.get("schema") if isinstance(value, dict) else None
    return _out(bool(schema), schema, "top-level schema identifier")


def json_nonnegative_timings(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    try:
        value = json.loads(content) if content is not None else None
    except json.JSONDecodeError:
        return _out(False, None, "JSON unavailable")
    negatives: list[str] = []

    def visit(item: Any, path: str = "$") -> None:
        if isinstance(item, dict):
            for key, child in item.items():
                child_path = f"{path}.{key}"
                if (key.endswith("_ns") or key.endswith("_seconds")) and isinstance(child, (int, float)) and child < 0:
                    negatives.append(child_path)
                visit(child, child_path)
        elif isinstance(item, list):
            for index, child in enumerate(item):
                visit(child, f"{path}[{index}]")

    visit(value)
    return _out(not negatives, negatives, "negative timing fields")


def toml_valid(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    try:
        value = tomllib.loads(content) if content is not None else None
    except tomllib.TOMLDecodeError as error:
        return _out(False, error.__class__.__name__, "TOML parse failed")
    return _out(isinstance(value, dict), sorted(value) if isinstance(value, dict) else None, "TOML parsed")


def toml_project_name(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    content = _content(state, params["path"])
    try:
        value = tomllib.loads(content)["project"]["name"] if content is not None else None
    except (tomllib.TOMLDecodeError, KeyError, TypeError):
        value = None
    return _out(value == params["expected"], value, "project name")


def toml_python_requirement(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    content = _content(state, params["path"])
    try:
        value = tomllib.loads(content)["project"]["requires-python"] if content is not None else None
    except (tomllib.TOMLDecodeError, KeyError, TypeError):
        value = None
    return _out(value == params["expected"], value, "Python requirement")


def toml_license(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    content = _content(state, check.param_dict()["path"])
    try:
        value = tomllib.loads(content)["project"]["license"]["text"] if content is not None else None
    except (tomllib.TOMLDecodeError, KeyError, TypeError):
        value = None
    return _out(value == "Apache-2.0", value, "declared license")


def contains_literal(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    content = _content(state, params["path"])
    present = content is not None and params["literal"] in content
    return _out(present, present, f"required literal: {params['literal']}")


def launcher_entrypoint(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    content = _content(state, params["path"])
    present = content is not None and params["entrypoint"] in content
    return _out(present, present, f"launcher references {params['entrypoint']}")


def all_category_parse(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    category = check.param_dict()["category"]
    failures: list[str] = []
    for path, record in sorted(state["project"]["files"].items()):
        if record["category"] != category:
            continue
        try:
            if category == "python":
                ast.parse(record["content"])
            elif category == "json":
                json.loads(record["content"])
            elif category == "markdown" and not any(line.startswith("# ") for line in record["content"].splitlines()):
                failures.append(path)
        except (SyntaxError, json.JSONDecodeError):
            failures.append(path)
    return _out(not failures, failures, f"aggregate {category} parse/structure failures")


def report_json_consistency(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    params = check.param_dict()
    report = _content(state, params["report_path"])
    raw = _content(state, params["json_path"])
    try:
        data = json.loads(raw) if raw is not None else None
        final_run = data["scaling_runs"][-1]
        milliseconds = final_run["sparse"]["wall_time_ns"] / 1_000_000
        all_equivalent = all(run["comparison"]["final_state_output_equivalence"] for run in data["scaling_runs"])
        value = {
            "reported_10k_latency": report is not None and f"{milliseconds:.3f} ms" in report,
            "all_raw_outputs_equivalent": all_equivalent,
        }
    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
        value = {"reported_10k_latency": False, "all_raw_outputs_equivalent": False}
    return _out(all(value.values()), value, "final report versus raw benchmark consistency")


EVALUATORS: dict[str, Evaluator] = {
    "file_present": file_present,
    "file_nonempty": file_nonempty,
    "content_sha": content_sha,
    "no_tabs": no_tabs,
    "bounded_lines": bounded_lines,
    "python_ast_valid": python_ast_valid,
    "module_docstring": module_docstring,
    "no_dynamic_eval": no_dynamic_eval,
    "no_wildcard_import": no_wildcard_import,
    "python_symbol_counts": python_symbol_counts,
    "markdown_h1": markdown_h1,
    "markdown_fences": markdown_fences,
    "markdown_heading_order": markdown_heading_order,
    "json_valid": json_valid,
    "json_schema_present": json_schema_present,
    "json_nonnegative_timings": json_nonnegative_timings,
    "toml_valid": toml_valid,
    "toml_project_name": toml_project_name,
    "toml_python_requirement": toml_python_requirement,
    "toml_license": toml_license,
    "contains_literal": contains_literal,
    "launcher_entrypoint": launcher_entrypoint,
    "all_category_parse": all_category_parse,
    "report_json_consistency": report_json_consistency,
}


def evaluate_check(state: dict[str, Any], check: CheckContract) -> dict[str, Any]:
    return EVALUATORS[check.evaluator](state, check)


def _identifier(path: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "__", path).strip("_")


def _check(
    identifier: str,
    perspective: str,
    dependencies: tuple[str, ...],
    evaluator: str,
    **params: Any,
) -> CheckContract:
    return CheckContract(identifier, perspective, dependencies, evaluator, _params(**params))


def make_checks(state: dict[str, Any], *, repaired_dependencies: bool = True) -> tuple[CheckContract, ...]:
    checks: list[CheckContract] = []
    files = state["project"]["files"]
    for path, record in sorted(files.items()):
        key = _identifier(path)
        dependency = (f"file:{path}",)
        checks.extend(
            [
                _check(f"present--{key}", "existence", dependency, "file_present", path=path),
                _check(f"nonempty--{key}", "content", dependency, "file_nonempty", path=path),
                _check(f"digest--{key}", "provenance", dependency, "content_sha", path=path),
                _check(f"tabs--{key}", "formatting", dependency, "no_tabs", path=path),
                _check(f"line-bound--{key}", "readability", dependency, "bounded_lines", path=path, limit=240),
            ]
        )
        if record["category"] == "python":
            checks.extend(
                [
                    _check(f"python-ast--{key}", "syntax", dependency, "python_ast_valid", path=path),
                    _check(f"python-docstring--{key}", "documentation", dependency, "module_docstring", path=path),
                    _check(f"python-no-eval--{key}", "security", dependency, "no_dynamic_eval", path=path),
                    _check(f"python-no-wildcard--{key}", "dependency", dependency, "no_wildcard_import", path=path),
                    _check(f"python-symbols--{key}", "structure", dependency, "python_symbol_counts", path=path),
                ]
            )
        elif record["category"] == "markdown":
            checks.extend(
                [
                    _check(f"markdown-h1--{key}", "documentation", dependency, "markdown_h1", path=path),
                    _check(f"markdown-fences--{key}", "documentation", dependency, "markdown_fences", path=path),
                    _check(f"markdown-headings--{key}", "documentation", dependency, "markdown_heading_order", path=path),
                ]
            )
        elif record["category"] == "json":
            checks.extend(
                [
                    _check(f"json-valid--{key}", "serialization", dependency, "json_valid", path=path),
                    _check(f"json-schema--{key}", "schema", dependency, "json_schema_present", path=path),
                    _check(f"json-timings--{key}", "measurement", dependency, "json_nonnegative_timings", path=path),
                ]
            )
        elif record["category"] == "toml":
            checks.extend(
                [
                    _check(f"toml-valid--{key}", "configuration", dependency, "toml_valid", path=path),
                    _check(f"toml-name--{key}", "identity", dependency, "toml_project_name", path=path, expected="axm-state-floor"),
                    _check(f"toml-python--{key}", "runtime", dependency, "toml_python_requirement", path=path, expected=">=3.11"),
                    _check(f"toml-license--{key}", "license", dependency, "toml_license", path=path),
                ]
            )

    checks.extend(
        [
            _check(
                "boundary--software-not-hardware",
                "claim-boundary",
                ("file:README.md",),
                "contains_literal",
                path="README.md",
                literal="This is not a hardware layer",
            ),
            _check(
                "guard--conflicts-remain-explicit",
                "test-coverage",
                ("file:tests/test_runtime.py",),
                "contains_literal",
                path="tests/test_runtime.py",
                literal="test_genuine_conflicts_are_explicit_and_unresolved",
            ),
            _check(
                "license--apache-text",
                "license",
                ("file:LICENSE",),
                "contains_literal",
                path="LICENSE",
                literal="Apache License, Version 2.0",
            ),
            _check(
                "launcher--python-entry",
                "launcher",
                ("file:run_experiment.py",),
                "launcher_entrypoint",
                path="run_experiment.py",
                entrypoint="run_benchmark_suite",
            ),
            _check(
                "launcher--shell-entry",
                "launcher",
                ("file:run_experiment.sh",),
                "launcher_entrypoint",
                path="run_experiment.sh",
                entrypoint="run_experiment.py",
            ),
            _check(
                "launcher--windows-entry",
                "launcher",
                ("file:RUN_EXPERIMENT_WINDOWS.bat",),
                "launcher_entrypoint",
                path="RUN_EXPERIMENT_WINDOWS.bat",
                entrypoint="run_experiment.py",
            ),
            _check(
                "aggregate--all-python-parse",
                "syntax",
                ("category:python",),
                "all_category_parse",
                category="python",
            ),
            _check(
                "aggregate--all-json-parse",
                "serialization",
                ("category:json",),
                "all_category_parse",
                category="json",
            ),
            _check(
                "aggregate--all-markdown-h1",
                "documentation",
                ("category:markdown",),
                "all_category_parse",
                category="markdown",
            ),
        ]
    )

    consistency_dependencies = ["file:FINAL_REPORT.md"]
    if repaired_dependencies:
        consistency_dependencies.append("file:results/benchmark_results.json")
    checks.append(
        _check(
            "cross--report-matches-raw-results",
            "cross-file-consistency",
            tuple(consistency_dependencies),
            "report_json_consistency",
            report_path="FINAL_REPORT.md",
            json_path="results/benchmark_results.json",
        )
    )

    ordered = tuple(sorted(checks, key=lambda item: item.id))
    if not 100 <= len(ordered) <= 300:
        raise RuntimeError(f"expected 100-300 heterogeneous checks, generated {len(ordered)}")
    return ordered
