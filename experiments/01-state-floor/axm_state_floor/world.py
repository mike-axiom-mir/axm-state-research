"""Small deterministic object world used for controlled experiments."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


def make_initial_state() -> dict[str, Any]:
    return {
        "schema": "axm.state-floor-world/v1",
        "object": {
            "id": "beam-A",
            "name": "pine shelf beam",
            "geometry": "rectangular_prism",
            "dimensions": {"length_mm": 2000, "width_mm": 100, "height_mm": 50},
            "material": {
                "name": "pine",
                "strength_mpa": 40,
                "density_kg_m3": 500,
                "cost_per_kg_cents": 250,
            },
            "mass_kg": 5.0,
            "cost_cents": 1250,
            "intended_use": "shelf_support",
            "design_load_n": 1800,
            "provenance": ["catalog:pine-v1", "measurement:beam-A"],
            "accessibility": {"max_lift_kg": 12.0, "min_clearance_mm": 900},
            "energy_requirement_wh": 30,
            "components": [
                {"id": "fastener-1", "kind": "bolt"},
                {"id": "fastener-2", "kind": "bolt"},
            ],
            "constraints": {
                "max_cost_cents": 2000,
                "max_mass_kg": 10.0,
                "max_energy_wh": 50,
            },
        },
        "derived": {},
        "assessments": {},
        "recommendations": {},
        "tests": {},
        "_meta": {"provenance": {}, "conflicts": {}, "escalations": {}},
    }


def make_standard_changes() -> list[tuple[str, Any]]:
    return [
        (
            "object.material",
            {
                "name": "recycled_aluminum",
                "strength_mpa": 90,
                "density_kg_m3": 2700,
                "cost_per_kg_cents": 420,
            },
        ),
        ("object.dimensions.height_mm", 42),
    ]


def clone_state(state: dict[str, Any]) -> dict[str, Any]:
    return deepcopy(state)
