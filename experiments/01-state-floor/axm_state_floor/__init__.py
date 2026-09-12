"""AXM State Floor: deterministic sparse perspective-node experiment."""

from .nodes import generate_nodes
from .runtime import StateFloorRuntime
from .world import make_initial_state, make_standard_changes

__all__ = [
    "StateFloorRuntime",
    "generate_nodes",
    "make_initial_state",
    "make_standard_changes",
]

__version__ = "0.1.0-experiment"
