import { StateFabric, deepClone, getPath } from "./engine.js";

const RESOURCES = ["food", "water", "fiber", "stone"];

function seededRandom(seed) {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const cellId = (x, y) => `c_${x}_${y}`;

export function coordinates(id) {
  const [, x, y] = id.split("_");
  return { x: Number(x), y: Number(y) };
}

export function locationOf(state, entityId) {
  return state.edges[`loc_${entityId}`]?.to;
}

function distance(leftId, rightId) {
  const left = coordinates(leftId);
  const right = coordinates(rightId);
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function inventoryMass(inventory) {
  return RESOURCES.reduce((sum, resource) => sum + (inventory[resource] || 0), 0);
}

function richestCell(state, resource) {
  return Object.values(state.nodes)
    .filter((node) => node.kind === "cell")
    .sort((a, b) => (b.resources[resource] || 0) - (a.resources[resource] || 0) || a.id.localeCompare(b.id))[0];
}

function generateGenesis(seed) {
  const random = seededRandom(seed);
  const nodes = {};
  const width = 7;
  const height = 7;
  const terrains = ["moss", "shale", "reed", "ash"];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const terrain = terrains[Math.floor(random() * terrains.length)];
      const base = {
        food: terrain === "moss" ? Math.floor(random() * 3) : 0,
        water: terrain === "reed" ? 1 + Math.floor(random() * 3) : 0,
        fiber: terrain === "reed" || terrain === "moss" ? Math.floor(random() * 3) : 0,
        stone: terrain === "shale" || terrain === "ash" ? Math.floor(random() * 3) : 0,
      };
      nodes[cellId(x, y)] = {
        id: cellId(x, y),
        kind: "cell",
        position: { x, y },
        terrain,
        resources: base,
        shelter: 0,
      };
    }
  }

  // The probe needs opportunities, not a written plot. These guarantees only ensure
  // that generic gather/share/build relations can actually be exercised.
  nodes.c_3_3.resources.food = 2;
  nodes.c_3_3.resources.fiber = 3;
  nodes.c_4_3.resources.food = 0;
  nodes.player = {
    id: "player",
    kind: "agent",
    name: "The witness",
    energy: 12,
    maxEnergy: 12,
    inventory: { food: 0, water: 0, fiber: 0, stone: 0 },
    capacity: 8,
  };
  nodes.rhea = {
    id: "rhea",
    kind: "agent",
    name: "Rhea",
    needs: { food: 6, water: 0, safety: 2 },
    memory: [],
  };
  nodes.orr = {
    id: "orr",
    kind: "agent",
    name: "Orr",
    needs: { food: 1, water: 5, safety: 3 },
    memory: [],
  };

  return {
    schema: "axm.stateborn.world/v1",
    seed,
    meta: { revision: 0, turn: 0, claim: "EXPERIMENTAL" },
    nodes,
    edges: {
      loc_player: { id: "loc_player", kind: "located_at", from: "player", to: "c_3_3" },
      loc_rhea: { id: "loc_rhea", kind: "located_at", from: "rhea", to: "c_4_3" },
      loc_orr: { id: "loc_orr", kind: "located_at", from: "orr", to: "c_1_5" },
    },
    evidence: {
      visited: ["c_3_3"],
      actionCounts: {},
      actionTrace: [],
    },
    derived: {
      competence: { finding: 0, wayfinding: 0, care: 0, making: 0 },
      identityPattern: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
      nearbyNeeds: [],
      threads: [],
      discoveries: [],
      notices: [],
    },
    signals: { lastAction: null },
  };
}

function validatePlayerEnergy(state, minimum = 1) {
  return state.nodes.player.energy >= minimum || "INSUFFICIENT_ENERGY";
}

const actions = [
  {
    id: "move",
    label: "Move",
    tags: ["space", "choice"],
    validate: ({ state, params }) => {
      if (!params.to || state.nodes[params.to]?.kind !== "cell") return "TARGET_CELL_REQUIRED";
      if (distance(locationOf(state, "player"), params.to) !== 1) return "TARGET_NOT_ADJACENT";
      return validatePlayerEnergy(state, 1);
    },
    run: ({ state, params, set, increment, pushUnique }) => {
      set("edges.loc_player.to", params.to);
      increment("nodes.player.energy", -1);
      pushUnique("evidence.visited", params.to);
      set("signals.lastAction", { kind: "move", to: params.to, ordinal: state.meta.turn + 1 });
    },
  },
  {
    id: "gather",
    label: "Gather",
    tags: ["material", "choice"],
    validate: ({ state, params }) => {
      if (!RESOURCES.includes(params.resource)) return "RESOURCE_REQUIRED";
      if (validatePlayerEnergy(state, 1) !== true) return "INSUFFICIENT_ENERGY";
      const cell = state.nodes[locationOf(state, "player")];
      if ((cell.resources[params.resource] || 0) < 1) return "RESOURCE_ABSENT";
      if (inventoryMass(state.nodes.player.inventory) >= state.nodes.player.capacity) return "INVENTORY_FULL";
      return true;
    },
    run: ({ state, params, increment, set }) => {
      const location = locationOf(state, "player");
      increment(`nodes.${location}.resources.${params.resource}`, -1);
      increment(`nodes.player.inventory.${params.resource}`, 1);
      increment("nodes.player.energy", -1);
      set("signals.lastAction", { kind: "gather", resource: params.resource, at: location, ordinal: state.meta.turn + 1 });
    },
  },
  {
    id: "share",
    label: "Share",
    tags: ["relation", "choice"],
    validate: ({ state, params }) => {
      const target = state.nodes[params.target];
      if (!target || target.kind !== "agent" || params.target === "player") return "TARGET_AGENT_REQUIRED";
      if (locationOf(state, params.target) !== locationOf(state, "player")) return "TARGET_NOT_PRESENT";
      if (!RESOURCES.includes(params.resource)) return "RESOURCE_REQUIRED";
      if ((state.nodes.player.inventory[params.resource] || 0) < 1) return "RESOURCE_NOT_HELD";
      if ((target.needs?.[params.resource] || 0) < 1) return "TARGET_HAS_NO_MATCHING_NEED";
      return true;
    },
    run: ({ state, params, increment, set }) => {
      const needPath = `nodes.${params.target}.needs.${params.resource}`;
      increment(`nodes.player.inventory.${params.resource}`, -1);
      set(needPath, Math.max(0, getPath(state, needPath) - 3));
      set("signals.lastAction", {
        kind: "share",
        target: params.target,
        resource: params.resource,
        ordinal: state.meta.turn + 1,
      });
    },
  },
  {
    id: "raise_shelter",
    label: "Raise shelter",
    tags: ["material", "world_change"],
    validate: ({ state }) => {
      const cell = state.nodes[locationOf(state, "player")];
      if (cell.shelter > 0) return "SHELTER_ALREADY_PRESENT";
      if (state.nodes.player.inventory.fiber < 3) return "THREE_FIBER_REQUIRED";
      return validatePlayerEnergy(state, 2);
    },
    run: ({ state, increment, set }) => {
      const location = locationOf(state, "player");
      increment("nodes.player.inventory.fiber", -3);
      increment("nodes.player.energy", -2);
      set(`nodes.${location}.shelter`, 1);
      set("signals.lastAction", { kind: "build", structure: "shelter", at: location, ordinal: state.meta.turn + 1 });
    },
  },
  {
    id: "rest",
    label: "Rest",
    tags: ["recovery"],
    validate: ({ state }) => {
      const cell = state.nodes[locationOf(state, "player")];
      if (cell.shelter < 1) return "NO_SHELTER_HERE";
      if (state.nodes.player.energy >= state.nodes.player.maxEnergy) return "ENERGY_ALREADY_FULL";
      return true;
    },
    run: ({ state, set }) => {
      set("nodes.player.energy", Math.min(state.nodes.player.maxEnergy, state.nodes.player.energy + 5));
      set("signals.lastAction", { kind: "rest", at: locationOf(state, "player"), ordinal: state.meta.turn + 1 });
    },
  },
  {
    id: "test_breach",
    label: "Invariant breach probe",
    visible: false,
    validate: () => true,
    run: ({ set }) => set("nodes.player.energy", -999),
  },
];

const rules = [
  {
    id: "evidence.observe_action",
    perspective: "evidence",
    priority: 10,
    subscribes: ["signals.lastAction"],
    when: ({ get }) => Boolean(get("signals.lastAction")),
    run: ({ state, get, increment, push }) => {
      const action = get("signals.lastAction");
      increment(`evidence.actionCounts.${action.kind}`, 1);
      push("evidence.actionTrace", { turn: state.meta.turn + 1, ...deepClone(action) });
    },
  },
  {
    id: "relation.remember_exchange",
    perspective: "relation",
    priority: 10,
    subscribes: ["signals.lastAction"],
    when: ({ get }) => get("signals.lastAction")?.kind === "share",
    run: ({ state, get, set, push }) => {
      const action = get("signals.lastAction");
      const edgePath = `edges.bond_${action.target}`;
      const current = get(edgePath)?.strength || 0;
      set(edgePath, {
        id: `bond_${action.target}`,
        kind: "trust",
        from: action.target,
        to: "player",
        strength: current + 1,
        evidenceCount: current + 1,
      });
      push(`nodes.${action.target}.memory`, {
        turn: state.meta.turn + 1,
        kind: "received",
        resource: action.resource,
        from: "player",
      });
    },
  },
  {
    id: "identity.derive_competence",
    perspective: "identity",
    priority: 20,
    subscribes: ["evidence.actionCounts", "evidence.visited"],
    run: ({ state, get, set }) => {
      const counts = get("evidence.actionCounts") || {};
      set("derived.competence", {
        finding: Math.floor((counts.gather || 0) / 2),
        wayfinding: Math.floor(Math.max(0, state.evidence.visited.length - 1) / 2),
        care: counts.share || 0,
        making: counts.build || 0,
      });
    },
  },
  {
    id: "needs.detect_nearby_pressure",
    perspective: "needs",
    priority: 20,
    subscribes: ["edges", "nodes"],
    run: ({ state, set }) => {
      const playerLocation = locationOf(state, "player");
      const nearby = Object.values(state.nodes)
        .filter((node) => node.kind === "agent" && node.id !== "player")
        .filter((node) => distance(playerLocation, locationOf(state, node.id)) <= 1)
        .flatMap((node) => Object.entries(node.needs || {})
          .filter(([, pressure]) => pressure >= 3)
          .map(([need, pressure]) => ({ entity: node.id, name: node.name, need, pressure, distance: distance(playerLocation, locationOf(state, node.id)) })))
        .sort((a, b) => b.pressure - a.pressure || a.entity.localeCompare(b.entity));
      set("derived.nearbyNeeds", nearby);
    },
  },
  {
    id: "scarcity.observe_depletion",
    perspective: "ecology",
    priority: 20,
    subscribes: ["nodes"],
    run: ({ state, get, set }) => {
      const current = state.nodes[locationOf(state, "player")];
      const depleted = RESOURCES.filter((resource) => current.resources[resource] === 0);
      set("derived.notices", depleted.map((resource) => `${resource} is absent at ${current.id}`));
    },
  },
  {
    id: "identity.project_pattern",
    perspective: "identity",
    priority: 30,
    subscribes: ["derived.competence"],
    run: ({ get, set }) => {
      const competence = get("derived.competence");
      const labels = { finding: "Forager-shaped", wayfinding: "Pathfinder-shaped", care: "Keeper-shaped", making: "Maker-shaped" };
      const ranked = Object.entries(competence).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const [basis, strength] = ranked[0];
      set("derived.identityPattern", strength < 1
        ? { label: "Unformed", strength: 0, basis: "No repeated behavior yet" }
        : { label: labels[basis], strength, basis: `${basis} is the strongest receipt-backed behavior` });
    },
  },
  {
    id: "relation.reciprocity",
    perspective: "relation",
    priority: 30,
    subscribes: ["edges"],
    run: ({ state, get, set }) => {
      const discoveries = [];
      for (const node of Object.values(state.nodes).filter((entry) => entry.kind === "agent" && entry.id !== "player")) {
        const bond = get(`edges.bond_${node.id}`)?.strength || 0;
        if (bond < 2) continue;
        const materialNeed = Object.entries(node.needs || {})
          .filter(([need, pressure]) => RESOURCES.includes(need) && pressure > 0)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
        const evidencedExchange = node.memory.at(-1)?.resource;
        const resource = materialNeed || evidencedExchange;
        if (!RESOURCES.includes(resource)) continue;
        const source = richestCell(state, resource);
        discoveries.push({
          from: node.id,
          kind: "reciprocal_knowledge",
          resource,
          cell: source.id,
          evidence: `bond_${node.id}:${bond}`,
        });
      }
      set("derived.discoveries", discoveries);
    },
  },
  {
    id: "threads.project_unresolved_relations",
    perspective: "story",
    priority: 40,
    subscribes: ["derived.nearbyNeeds", "edges"],
    run: ({ state, get, set }) => {
      const threads = get("derived.nearbyNeeds").map((need) => {
        const bond = get(`edges.bond_${need.entity}`)?.strength || 0;
        return {
          id: `need_${need.entity}_${need.need}`,
          source: need.entity,
          pressure: need.pressure,
          state: bond > 0 ? "responded" : "unanswered",
          wording: `${need.name} lacks ${need.need}`,
          basis: `need=${need.pressure}; distance=${need.distance}; bond=${bond}`,
        };
      });
      set("derived.threads", threads);
    },
  },
];

const invariants = [
  {
    id: "player.energy_bounded",
    check: (state) => state.nodes.player.energy >= 0 && state.nodes.player.energy <= state.nodes.player.maxEnergy || "ENERGY_OUT_OF_RANGE",
  },
  {
    id: "inventory.nonnegative",
    check: (state) => RESOURCES.every((resource) => state.nodes.player.inventory[resource] >= 0) || "NEGATIVE_INVENTORY",
  },
  {
    id: "inventory.capacity",
    check: (state) => inventoryMass(state.nodes.player.inventory) <= state.nodes.player.capacity || "CAPACITY_EXCEEDED",
  },
  {
    id: "world.resources_nonnegative",
    check: (state) => Object.values(state.nodes).filter((node) => node.kind === "cell")
      .every((cell) => RESOURCES.every((resource) => cell.resources[resource] >= 0)) || "NEGATIVE_WORLD_RESOURCE",
  },
  {
    id: "locations.resolve",
    check: (state) => Object.values(state.edges).filter((edge) => edge.kind === "located_at")
      .every((edge) => state.nodes[edge.from] && state.nodes[edge.to]?.kind === "cell") || "DANGLING_LOCATION_EDGE",
  },
];

export const fabricCatalog = {
  actions: actions.map(({ id, label, tags, visible = true }) => ({ id, label, tags, visible })),
  rules: rules.map(({ id, perspective, subscribes, priority }) => ({ id, perspective, subscribes, priority })),
  invariants: invariants.map(({ id }) => ({ id })),
};

export const emergenceProbe = [
  { actionId: "gather", params: { resource: "food" }, operationId: "probe-01-gather-food" },
  { actionId: "gather", params: { resource: "food" }, operationId: "probe-02-gather-food" },
  { actionId: "move", params: { to: "c_4_3" }, operationId: "probe-03-move-rhea" },
  { actionId: "share", params: { target: "rhea", resource: "food" }, operationId: "probe-04-share-food" },
  { actionId: "share", params: { target: "rhea", resource: "food" }, operationId: "probe-05-share-food" },
];

export function createWorldEngine(seed = "AXM-STATEBORN-001") {
  return new StateFabric({ seed, initialState: generateGenesis(seed), actions, rules, invariants });
}

export function adjacentCells(state, origin = locationOf(state, "player")) {
  return Object.values(state.nodes)
    .filter((node) => node.kind === "cell" && distance(origin, node.id) === 1)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function presentAgents(state) {
  const location = locationOf(state, "player");
  return Object.values(state.nodes)
    .filter((node) => node.kind === "agent" && node.id !== "player" && locationOf(state, node.id) === location)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export { RESOURCES };
