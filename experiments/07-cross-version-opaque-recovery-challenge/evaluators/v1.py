"""Controlled training-version evaluator fixture."""


def opaque_guard(canonical_state: dict) -> bool:
    """The public contract intentionally exposes no path-shaped argument."""

    return bool(canonical_state["controls"]["legacy_override"])
