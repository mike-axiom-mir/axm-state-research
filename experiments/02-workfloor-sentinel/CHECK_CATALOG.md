# Check Catalog

Sentinel registers 242 checks over 27 real foundation files. They represent 21 perspectives and 24 evaluator forms. Many share reusable evaluator code, but every contract targets a distinct file, aggregate, or cross-file rule.

| Perspective | Checks |
|---|---:|
| Documentation | 40 |
| Existence, content, formatting, provenance, readability | 27 each |
| Syntax | 13 |
| Security, dependency, structure | 12 each |
| Serialization and launcher | 3 each |
| Schema, measurement, license | 2 each |
| Claim boundary, cross-file consistency, test coverage, identity, runtime, configuration | 1 each |

## Per-file checks

Every initial file receives:

- presence;
- non-empty content;
- canonical content digest;
- tab count;
- bounded line length.

Python files additionally receive AST validity, module docstring, dynamic `eval`/`exec`, wildcard import, and symbol-structure checks.

Markdown files additionally receive H1 count, balanced code fences, and heading-level progression checks.

JSON files additionally receive parse, schema, and non-negative timing checks.

The TOML file additionally receives parse, project identity, Python requirement, and license checks.

## Aggregate and cross-file checks

- all Python files parse;
- all JSON files parse;
- all Markdown files have an H1;
- report values remain consistent with raw benchmark data;
- explicit software/runtime claim boundary remains present;
- conflict-preservation regression test remains named;
- Apache license text remains present;
- launchers reference their intended entry points.

## Initial failures

The unmodified foundation produced 233 PASS and 9 FAIL outputs. Seven failures were lines longer than the experiment's arbitrary 240-character readability threshold; two were test modules without module docstrings. These are check-policy findings, not failed foundation unit tests. The foundation's eight actual tests passed before Sentinel construction.
