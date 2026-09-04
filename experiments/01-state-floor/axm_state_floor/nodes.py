"""Deterministic perspective families and scale-node generator.

Generated nodes are explicitly variants of a small family set. They are not
represented as thousands of unique expert disciplines.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from .canonical import PermittedStateView, stable_hash
from .contracts import Authority, Event, NodeContract, ProposedDelta


HandlerResult = list[tuple[str, Any, tuple[str, ...], float | None]]
Handler = Callable[[PermittedStateView, Event], HandlerResult]


def _evidence(view: PermittedStateView, *paths: str) -> tuple[str, ...]:
    return tuple(f"state:{path}:{stable_hash(view.get(path))[:16]}" for path in paths)


def geometry_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    geometry = view.get("object.geometry")
    return [("derived.geometry_valid", geometry in {"rectangular_prism", "cylinder"}, _evidence(view, "object.geometry"), 1.0)]


def dimensions_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    dimensions = view.get("object.dimensions")
    valid = all(isinstance(dimensions.get(axis), int) and dimensions[axis] > 0 for axis in ("length_mm", "width_mm", "height_mm"))
    volume = dimensions["length_mm"] * dimensions["width_mm"] * dimensions["height_mm"] if valid else 0
    evidence = _evidence(view, "object.dimensions")
    return [
        ("derived.dimensions_valid", valid, evidence, 1.0),
        ("derived.volume_mm3", volume, evidence, 1.0),
    ]


def material_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    material = view.get("object.material")
    compatible = material.get("strength_mpa", 0) > 0 and material.get("density_kg_m3", 0) > 0
    return [("derived.material_compatible", compatible, _evidence(view, "object.material"), 1.0)]


def structural_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    dimensions = view.get("object.dimensions")
    strength = int(view.get("object.material.strength_mpa", 0))
    load = int(view.get("object.design_load_n", 0))
    area_mm2 = int(dimensions.get("width_mm", 0)) * int(dimensions.get("height_mm", 0))
    simplified_capacity_n = (area_mm2 * strength) // 30
    evidence = _evidence(view, "object.dimensions", "object.material.strength_mpa", "object.design_load_n")
    return [
        ("assessments.simplified_capacity_n", simplified_capacity_n, evidence, 0.65),
        ("assessments.load_safe", simplified_capacity_n >= load, evidence, 0.65),
    ]


def cost_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    mass_kg = float(view.get("object.mass_kg", 0.0))
    rate = int(view.get("object.material.cost_per_kg_cents", 0))
    value = int(round(mass_kg * rate))
    return [("derived.cost_estimate_cents", value, _evidence(view, "object.mass_kg", "object.material.cost_per_kg_cents"), 0.95)]


def provenance_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    provenance = view.get("object.provenance", [])
    complete = bool(provenance) and all(isinstance(item, str) and ":" in item for item in provenance)
    return [("derived.provenance_complete", complete, _evidence(view, "object.provenance"), 1.0)]


def duplication_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    components = view.get("object.components", [])
    ids = [item.get("id") for item in components]
    duplicate_ids = sorted({identifier for identifier in ids if ids.count(identifier) > 1})
    return [("derived.duplicate_component_ids", duplicate_ids, _evidence(view, "object.components"), 1.0)]


def constraint_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    constraints = view.get("object.constraints")
    mass = float(view.get("object.mass_kg"))
    current_cost = int(view.get("object.cost_cents"))
    energy = int(view.get("object.energy_requirement_wh"))
    checks = {
        "cost": current_cost <= int(constraints["max_cost_cents"]),
        "energy": energy <= int(constraints["max_energy_wh"]),
        "mass": mass <= float(constraints["max_mass_kg"]),
    }
    return [("derived.constraint_checks", checks, _evidence(view, "object.constraints", "object.mass_kg", "object.cost_cents", "object.energy_requirement_wh"), 1.0)]


def accessibility_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    accessibility = view.get("object.accessibility")
    mass = float(view.get("object.mass_kg"))
    accessible = mass <= float(accessibility["max_lift_kg"])
    return [("derived.accessible", accessible, _evidence(view, "object.accessibility", "object.mass_kg"), 0.9)]


def energy_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    energy = int(view.get("object.energy_requirement_wh"))
    limit = int(view.get("object.constraints.max_energy_wh"))
    return [("derived.energy_within_limit", energy <= limit, _evidence(view, "object.energy_requirement_wh", "object.constraints.max_energy_wh"), 1.0)]


def naming_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    name = str(view.get("object.name", ""))
    intended_use = str(view.get("object.intended_use", ""))
    tokens = set(name.lower().replace("_", " ").split())
    expected = set(intended_use.lower().replace("_", " ").split())
    return [("derived.name_mentions_use", bool(tokens & expected), _evidence(view, "object.name", "object.intended_use"), 0.8)]


def dependency_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    components = view.get("object.components", [])
    valid = all(item.get("id") and item.get("kind") for item in components)
    return [("derived.dependencies_valid", valid, _evidence(view, "object.components"), 1.0)]


def testing_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    derived = view.get("derived", {})
    assessments = view.get("assessments", {})
    booleans = [value for value in derived.values() if isinstance(value, bool)]
    if isinstance(assessments.get("load_safe"), bool):
        booleans.append(assessments["load_safe"])
    return [("tests.current_checks_pass", bool(booleans) and all(booleans), _evidence(view, "derived", "assessments"), 0.9)]


def contradiction_check(view: PermittedStateView, _event: Event) -> HandlerResult:
    derived = view.get("derived", {})
    assessments = view.get("assessments", {})
    contradictions: list[str] = []
    if derived.get("material_compatible") is False and assessments.get("load_safe") is True:
        contradictions.append("load_safe_despite_incompatible_material")
    checks = derived.get("constraint_checks", {})
    if checks.get("mass") is False and derived.get("accessible") is True:
        contradictions.append("accessible_despite_mass_constraint_failure")
    return [("derived.contradictions", contradictions, _evidence(view, "derived", "assessments"), 0.85)]


def optimize_wood(view: PermittedStateView, _event: Event) -> HandlerResult:
    evidence = _evidence(view, "object.intended_use", "object.material", "object.dimensions")
    return [
        ("recommendations.primary_material", "engineered_wood", evidence, 0.55),
        ("recommendations.primary_strategy", "lightweight", evidence, 0.55),
    ]


def optimize_steel(view: PermittedStateView, _event: Event) -> HandlerResult:
    evidence = _evidence(view, "object.intended_use", "object.material", "object.dimensions")
    return [
        ("recommendations.primary_material", "recycled_steel", evidence, 0.55),
        ("recommendations.primary_strategy", "durability", evidence, 0.55),
    ]


HANDLERS: dict[str, Handler] = {
    "geometry_check": geometry_check,
    "dimensions_check": dimensions_check,
    "material_check": material_check,
    "structural_check": structural_check,
    "cost_check": cost_check,
    "provenance_check": provenance_check,
    "duplication_check": duplication_check,
    "constraint_check": constraint_check,
    "accessibility_check": accessibility_check,
    "energy_check": energy_check,
    "naming_check": naming_check,
    "dependency_check": dependency_check,
    "testing_check": testing_check,
    "contradiction_check": contradiction_check,
    "optimize_wood": optimize_wood,
    "optimize_steel": optimize_steel,
}


@dataclass(frozen=True, slots=True)
class FamilySpec:
    name: str
    events: tuple[str, ...]
    reads: tuple[str, ...]
    handler: str
    authority: Authority


FAMILIES: tuple[FamilySpec, ...] = (
    FamilySpec("geometry", ("geometry_changed",), ("object.geometry",), "geometry_check", Authority("geometry", 50)),
    FamilySpec("dimensions", ("dimensions_changed",), ("object.dimensions",), "dimensions_check", Authority("dimensions", 50)),
    FamilySpec("material-compatibility", ("material_changed",), ("object.material",), "material_check", Authority("material", 50)),
    FamilySpec("structural", ("dimensions_changed", "material_changed", "load_changed"), ("object.dimensions", "object.material", "object.design_load_n"), "structural_check", Authority("structural", 100)),
    FamilySpec("cost", ("material_changed", "mass_changed", "cost_changed"), ("object.mass_kg", "object.material.cost_per_kg_cents"), "cost_check", Authority("cost", 100)),
    FamilySpec("provenance", ("provenance_changed",), ("object.provenance",), "provenance_check", Authority("provenance", 100)),
    FamilySpec("duplication", ("components_changed",), ("object.components",), "duplication_check", Authority("components", 60)),
    FamilySpec("constraints", ("material_changed", "mass_changed", "cost_changed", "energy_changed"), ("object.constraints", "object.mass_kg", "object.cost_cents", "object.energy_requirement_wh"), "constraint_check", Authority("constraints", 100)),
    FamilySpec("accessibility", ("dimensions_changed", "mass_changed", "accessibility_changed"), ("object.accessibility", "object.mass_kg"), "accessibility_check", Authority("accessibility", 100)),
    FamilySpec("energy", ("energy_changed", "material_changed"), ("object.energy_requirement_wh", "object.constraints.max_energy_wh"), "energy_check", Authority("energy", 100)),
    FamilySpec("naming-grammar", ("intended_use_changed", "geometry_changed"), ("object.name", "object.intended_use"), "naming_check", Authority("naming", 50)),
    FamilySpec("dependency-validity", ("components_changed",), ("object.components",), "dependency_check", Authority("components", 100)),
    FamilySpec("testing", ("derived_changed", "assessment_changed"), ("derived", "assessments"), "testing_check", Authority("testing", 100)),
    FamilySpec("contradiction-detection", ("derived_changed", "assessment_changed"), ("derived", "assessments"), "contradiction_check", Authority("contradiction", 100)),
    FamilySpec("optimization-lightweight", ("material_changed", "dimensions_changed"), ("object.intended_use", "object.material", "object.dimensions"), "optimize_wood", Authority("optimization", 20)),
    FamilySpec("optimization-durability", ("material_changed", "dimensions_changed"), ("object.intended_use", "object.material", "object.dimensions"), "optimize_steel", Authority("optimization", 20)),
)


def generate_nodes(count: int, partition_count: int = 128) -> tuple[NodeContract, ...]:
    if count < 1:
        raise ValueError("node count must be positive")
    nodes: list[NodeContract] = []
    for index in range(count):
        family = FAMILIES[index % len(FAMILIES)]
        generation = index // len(FAMILIES)
        if generation == 0:
            subscriptions = family.events
        else:
            partition = (generation - 1) % partition_count
            subscriptions = tuple(f"{event}:{partition:03d}" for event in family.events)
        nodes.append(
            NodeContract(
                id=f"{family.name}-{index:05d}",
                perspective=family.name,
                subscriptions=subscriptions,
                reads=family.reads,
                priority_or_domain_authority=family.authority,
                deterministic_handler=family.handler,
            )
        )
    return tuple(nodes)


def execute_handler(node: NodeContract, view: PermittedStateView, event: Event) -> list[ProposedDelta]:
    try:
        handler = HANDLERS[node.deterministic_handler]
    except KeyError as exc:
        raise ValueError(f"unknown deterministic handler: {node.deterministic_handler}") from exc
    raw = handler(view, event)
    return [
        ProposedDelta(
            node_id=node.id,
            path=path,
            value=value,
            evidence_refs=evidence_refs,
            confidence=confidence,
            authority_domain=node.priority_or_domain_authority.domain,
            authority_rank=node.priority_or_domain_authority.rank,
        )
        for path, value, evidence_refs, confidence in raw
    ]
