"""Experiment locating where current state is and is not sufficient memory."""

from __future__ import annotations

import random
from collections import Counter
from typing import Any


CAPACITY_BY_MATERIAL = {"pine": 500, "aluminum": 750, "steel": 1000}


def _full_history_decision(history: list[dict[str, Any]], current: dict[str, Any]) -> dict[str, bool]:
    loads = [event["value"] for event in history if event["kind"] == "load"]
    material_changes = sum(1 for event in history if event["kind"] == "material")
    return {
        "overload_ever": max(loads, default=current["load_n"]) > CAPACITY_BY_MATERIAL[current["material"]],
        "material_churn": material_changes > 2,
    }


def _current_state_only_decision(current: dict[str, Any]) -> dict[str, bool]:
    return {
        "overload_ever": current["load_n"] > CAPACITY_BY_MATERIAL[current["material"]],
        "material_churn": False,
    }


def _enriched_state_decision(current: dict[str, Any]) -> dict[str, bool]:
    summary = current["history_summary"]
    return {
        "overload_ever": summary["max_load_seen_n"] > CAPACITY_BY_MATERIAL[current["material"]],
        "material_churn": summary["material_change_count"] > 2,
    }


def run_state_vs_history(cases: int = 500, seed: int = 20260901) -> dict[str, Any]:
    random_source = random.Random(seed)
    naive_mismatches = 0
    enriched_mismatches = 0
    loss_reasons: Counter[str] = Counter()
    examples: list[dict[str, Any]] = []

    for case_id in range(cases):
        current: dict[str, Any] = {"load_n": 100, "material": "pine"}
        history: list[dict[str, Any]] = []
        max_load = current["load_n"]
        material_changes = 0
        for sequence in range(random_source.randint(3, 20)):
            if random_source.random() < 0.62:
                value = random_source.randint(50, 1200)
                current["load_n"] = value
                max_load = max(max_load, value)
                history.append({"sequence": sequence, "kind": "load", "value": value})
            else:
                value = random_source.choice(tuple(CAPACITY_BY_MATERIAL))
                current["material"] = value
                material_changes += 1
                history.append({"sequence": sequence, "kind": "material", "value": value})

        full = _full_history_decision(history, current)
        state_only = _current_state_only_decision(current)
        if state_only != full:
            naive_mismatches += 1
            if state_only["overload_ever"] != full["overload_ever"]:
                loss_reasons["maximum historical load absent"] += 1
            if state_only["material_churn"] != full["material_churn"]:
                loss_reasons["material transition count absent"] += 1
            if len(examples) < 5:
                examples.append(
                    {
                        "case_id": case_id,
                        "final_current_state": dict(current),
                        "full_history_output": full,
                        "state_only_output": state_only,
                        "lost_aggregates": {
                            "max_load_seen_n": max_load,
                            "material_change_count": material_changes,
                        },
                    }
                )

        enriched = dict(current)
        enriched["history_summary"] = {
            "max_load_seen_n": max_load,
            "material_change_count": material_changes,
        }
        enriched_output = _enriched_state_decision(enriched)
        if enriched_output != full:
            enriched_mismatches += 1

    return {
        "cases": cases,
        "seed": seed,
        "full_history_vs_current_state_mismatches": naive_mismatches,
        "full_history_vs_enriched_state_mismatches": enriched_mismatches,
        "current_state_equivalence_percentage": round(100.0 * (cases - naive_mismatches) / cases, 3),
        "enriched_state_equivalence_percentage": round(100.0 * (cases - enriched_mismatches) / cases, 3),
        "lost_information_reasons": dict(loss_reasons),
        "examples": examples,
        "scope_note": "Equivalence is established only for these two decision predicates and generated cases.",
    }
