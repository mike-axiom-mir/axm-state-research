"""Controlled held-out evaluator source changed after training froze."""


def opaque_guard(canonical_state: dict) -> bool:
    """Same public callable, different opaque state dependency."""

    return bool(canonical_state["controls"]["emergency_override"])
