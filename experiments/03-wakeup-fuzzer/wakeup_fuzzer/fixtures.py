"""Deterministic fixtures, including one deliberately incomplete subscription."""

from __future__ import annotations

import random

from .model import Check, Mutation


PERSPECTIVES = (
    "constraint",
    "dependency",
    "duplication",
    "energy",
    "geometry",
    "provenance",
    "structure",
    "testing",
)


def make_fixture(
    node_count: int = 256,
    field_count: int = 64,
    seed: int = 20260902,
    broken: bool = False,
) -> tuple[dict[str, int], list[Check]]:
    if node_count < 1 or field_count < 2:
        raise ValueError("fixture requires at least one node and two fields")

    rng = random.Random(seed)
    state = {f"f{index:03d}": rng.randrange(0, 101) for index in range(field_count)}
    checks: list[Check] = []
    variants_per_signature = 4

    for index in range(node_count):
        group = index // variants_per_signature
        a = group % field_count
        b = (group * 7 + 1) % field_count
        if b == a:
            b = (b + 1) % field_count
        actual = (f"f{a:03d}", f"f{b:03d}")
        subscriptions = actual
        output_mode = ("direct", "bucket", "parity", "bucket")[index % 4]
        bucket = (5, 7, 2, 11)[index % 4]
        weights = (1 + (index % 3), 1 + ((index // 3) % 5))

        if index == 0:
            # f001 is a real read. The broken variant omits exactly this edge.
            actual = ("f000", "f001")
            subscriptions = ("f000",) if broken else actual
            output_mode = "direct"
            bucket = 1
            weights = (1, 1)

        checks.append(
            Check(
                id=f"check_{index:05d}",
                perspective=PERSPECTIVES[index % len(PERSPECTIVES)],
                subscriptions=subscriptions,
                actual_reads=actual,
                weights=weights,
                output_mode=output_mode,
                bucket=bucket,
            )
        )
    return state, checks


def generate_mutations(
    initial_state: dict[str, int],
    count: int,
    seed: int = 20260902,
    force_omission_trigger: bool = False,
) -> list[Mutation]:
    if count < 0:
        raise ValueError("mutation count cannot be negative")
    rng = random.Random(seed)
    current = dict(initial_state)
    fields = sorted(current)
    mutations: list[Mutation] = []

    if force_omission_trigger and count:
        current["f001"] += 1
        mutations.append(
            Mutation("f001", current["f001"], reason="planted_omitted_dependency")
        )

    deltas = (-11, -7, -3, -1, 1, 2, 5, 7, 13)
    while len(mutations) < count:
        field = fields[rng.randrange(len(fields))]
        current[field] += deltas[rng.randrange(len(deltas))]
        mutations.append(Mutation(field, current[field]))
    return mutations
