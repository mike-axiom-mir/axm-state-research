import { canonicalStringify, deepClone, digest, getPath } from "./engine.js";

export const MATERIALS = ["food", "water", "fiber", "stone"];
const GENERATOR_VERSION = "axm.stateborn.field/v2";

function seedNumber(seed) {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function noise(seedValue, x, y) {
  let value = seedValue ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca77);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

const keyOf = (x, y) => `${x}_${y}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function inventoryMass(inventory) {
  return MATERIALS.reduce((sum, material) => sum + (inventory[material] || 0), 0);
}

function setPath(root, path, value, changed) {
  const segments = path.split(".");
  const leaf = segments.pop();
  let cursor = root;
  for (const segment of segments) {
    if (!cursor[segment] || typeof cursor[segment] !== "object") cursor[segment] = {};
    cursor = cursor[segment];
  }
  const next = deepClone(value);
  if (canonicalStringify(cursor[leaf]) === canonicalStringify(next)) return false;
  cursor[leaf] = next;
  changed.push(path);
  return true;
}

function incrementPath(root, path, amount, changed) {
  return setPath(root, path, Number(getPath(root, path) || 0) + amount, changed);
}

function normalizeIntent(intent) {
  return { actor: "player", ...deepClone(intent) };
}

export class DeterministicField {
  constructor({ seed, width, height, chunkSize = 32 }) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.chunkSize = chunkSize;
    this.seedValue = seedNumber(seed);
    this.cache = new Map();
    this.baseCommitment = digest({ generator: GENERATOR_VERSION, seed, width, height, chunkSize });
  }

  contains(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  baseCell(x, y) {
    if (!this.contains(x, y)) return null;
    const key = keyOf(x, y);
    if (this.cache.has(key)) return this.cache.get(key);
    const value = noise(this.seedValue, x, y);
    const terrain = ["moss", "shale", "reed", "ash"][value % 4];
    const resources = {
      food: terrain === "moss" ? (value >>> 3) % 4 : 0,
      water: terrain === "reed" ? 1 + ((value >>> 6) % 3) : 0,
      fiber: terrain === "moss" || terrain === "reed" ? (value >>> 9) % 4 : 0,
      stone: terrain === "shale" || terrain === "ash" ? (value >>> 12) % 4 : 0,
    };
    const cell = Object.freeze({ id: key, kind: "cell", x, y, terrain, resources: Object.freeze(resources), shelter: 0 });
    this.cache.set(key, cell);
    return cell;
  }

  cell(state, x, y) {
    const base = this.baseCell(x, y);
    if (!base) return null;
    const override = state.world.overrides[keyOf(x, y)];
    if (!override) return deepClone(base);
    return {
      ...deepClone(base),
      ...deepClone(override),
      resources: { ...deepClone(base.resources), ...(deepClone(override.resources) || {}) },
    };
  }

  chunkOf(x, y) {
    return `${Math.floor(x / this.chunkSize)}_${Math.floor(y / this.chunkSize)}`;
  }

  stats(state) {
    const changedCells = Object.keys(state.world.overrides);
    return {
      logicalCells: this.width * this.height,
      materializedCells: this.cache.size,
      changedCells: changedCells.length,
      changedChunks: new Set(changedCells.map((key) => {
        const [x, y] = key.split("_").map(Number);
        return this.chunkOf(x, y);
      })).size,
      sleepingCells: this.width * this.height - this.cache.size,
    };
  }
}

function actorTemplate(id, name, x, y, overrides = {}) {
  return {
    id,
    kind: "actor",
    name,
    position: { x, y },
    energy: 12,
    maxEnergy: 12,
    inventory: { food: 0, water: 0, fiber: 0, stone: 0 },
    capacity: 8,
    needs: { food: 0, water: 0, safety: 0 },
    disposition: { cooperation: 1, curiosity: 1 },
    memory: [],
    ...deepClone(overrides),
  };
}

function initialState(seed, width, height, field) {
  const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const base = field.baseCell(center.x, center.y);
  return {
    schema: "axm.stateborn.living-world/v2",
    seed,
    meta: { revision: 0, turn: 0, claim: "EXPERIMENTAL" },
    world: {
      generator: GENERATOR_VERSION,
      width,
      height,
      chunkSize: field.chunkSize,
      baseCommitment: field.baseCommitment,
      overrides: {
        [keyOf(center.x, center.y)]: {
          resources: { ...deepClone(base.resources), food: Math.max(2, base.resources.food), fiber: Math.max(3, base.resources.fiber) },
        },
      },
    },
    actors: {
      player: actorTemplate("player", "The witness", center.x, center.y, {
        inventory: { food: 2, water: 0, fiber: 0, stone: 0 },
        needs: { food: 1, water: 5, safety: 1 },
        disposition: { cooperation: 0, curiosity: 0 },
      }),
      rhea: actorTemplate("rhea", "Rhea", center.x + 1, center.y, {
        inventory: { food: 0, water: 2, fiber: 0, stone: 0 },
        needs: { food: 8, water: 1, safety: 2 },
        disposition: { cooperation: 2, curiosity: 1 },
      }),
      orr: actorTemplate("orr", "Orr", center.x - 3, center.y + 2, {
        needs: { food: 2, water: 2, safety: 3 },
        disposition: { cooperation: 1, curiosity: 2 },
      }),
    },
    relations: {},
    signals: { requests: {} },
    evidence: {
      behaviors: {
        player: {},
        rhea: {},
        orr: {},
      },
      events: [],
    },
    derived: {
      identityPatterns: {
        player: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
        rhea: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
        orr: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
      },
      situations: [],
    },
  };
}

const identityLabels = {
  gather: "Forager-shaped",
  move: "Pathfinder-shaped",
  share: "Keeper-shaped",
  build: "Maker-shaped",
  request: "Signal-seeker-shaped",
  consume: "Survivor-shaped",
  wait: "Witness-shaped",
};

function relationStrength(state, from, to) {
  return state.relations[`bond_${from}_${to}`]?.strength || 0;
}

function validateIntent(state, field, rawIntent) {
  const intent = normalizeIntent(rawIntent);
  const actor = state.actors[intent.actor];
  if (!actor) return "UNKNOWN_ACTOR";
  if (!["move", "gather", "share", "consume", "request", "build", "rest", "wait", "test_breach"].includes(intent.kind)) return "UNKNOWN_INTENT";
  if (intent.kind === "move") {
    if (!field.contains(intent.to?.x, intent.to?.y)) return "TARGET_OUT_OF_WORLD";
    if (manhattan(actor.position, intent.to) !== 1) return "TARGET_NOT_ADJACENT";
    if (actor.energy < 1) return "INSUFFICIENT_ENERGY";
  }
  if (intent.kind === "gather") {
    if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
    if ((field.cell(state, actor.position.x, actor.position.y).resources[intent.resource] || 0) < 1) return "MATERIAL_ABSENT";
    if (inventoryMass(actor.inventory) >= actor.capacity) return "INVENTORY_FULL";
    if (actor.energy < 1) return "INSUFFICIENT_ENERGY";
  }
  if (intent.kind === "share") {
    const target = state.actors[intent.target];
    if (!target || target.id === actor.id) return "TARGET_ACTOR_REQUIRED";
    if (manhattan(actor.position, target.position) > 1) return "TARGET_TOO_FAR";
    if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
    if ((actor.inventory[intent.resource] || 0) < 1) return "MATERIAL_NOT_HELD";
    if ((target.needs[intent.resource] || 0) < 1) return "TARGET_HAS_NO_MATCHING_NEED";
  }
  if (intent.kind === "consume") {
    if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
    if ((actor.inventory[intent.resource] || 0) < 1) return "MATERIAL_NOT_HELD";
    if ((actor.needs[intent.resource] || 0) < 1) return "NO_MATCHING_NEED";
  }
  if (intent.kind === "request") {
    if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
    if ((actor.needs[intent.resource] || 0) < 3) return "PRESSURE_TOO_LOW";
  }
  if (intent.kind === "build") {
    if (intent.structure !== "shelter") return "UNKNOWN_STRUCTURE";
    if (actor.inventory.fiber < 3) return "THREE_FIBER_REQUIRED";
    if (actor.energy < 2) return "INSUFFICIENT_ENERGY";
    if (field.cell(state, actor.position.x, actor.position.y).shelter > 0) return "SHELTER_ALREADY_PRESENT";
  }
  if (intent.kind === "rest") {
    if (field.cell(state, actor.position.x, actor.position.y).shelter < 1) return "NO_SHELTER_HERE";
    if (actor.energy >= actor.maxEnergy) return "ENERGY_ALREADY_FULL";
  }
  return null;
}

function appendEvent(state, event, changed) {
  const index = state.evidence.events.length;
  const stored = { index, ...deepClone(event) };
  setPath(state, "evidence.events", [...state.evidence.events, stored], changed);
  incrementPath(state, `evidence.behaviors.${event.actor}.${event.kind}`, 1, changed);
  return stored;
}

function applyIntent(state, field, rawIntent, changed) {
  const intent = normalizeIntent(rawIntent);
  const actor = state.actors[intent.actor];
  const event = { actor: intent.actor, kind: intent.kind };
  if (intent.kind === "move") {
    setPath(state, `actors.${actor.id}.position`, intent.to, changed);
    incrementPath(state, `actors.${actor.id}.energy`, -1, changed);
    Object.assign(event, { to: deepClone(intent.to) });
  } else if (intent.kind === "gather") {
    const cell = field.cell(state, actor.position.x, actor.position.y);
    setPath(state, `world.overrides.${keyOf(actor.position.x, actor.position.y)}.resources.${intent.resource}`, cell.resources[intent.resource] - 1, changed);
    incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, 1, changed);
    incrementPath(state, `actors.${actor.id}.energy`, -1, changed);
    Object.assign(event, { resource: intent.resource, at: deepClone(actor.position) });
  } else if (intent.kind === "share") {
    const target = state.actors[intent.target];
    incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, -1, changed);
    setPath(state, `actors.${target.id}.needs.${intent.resource}`, Math.max(0, target.needs[intent.resource] - 3), changed);
    const relationId = `bond_${target.id}_${actor.id}`;
    const strength = relationStrength(state, target.id, actor.id) + 1;
    setPath(state, `relations.${relationId}`, { id: relationId, kind: "trust", from: target.id, to: actor.id, strength }, changed);
    setPath(state, `actors.${target.id}.memory`, [...target.memory, { kind: "received", from: actor.id, resource: intent.resource, turn: state.meta.turn + 1 }], changed);
    if (state.signals.requests[target.id]?.resource === intent.resource) {
      setPath(state, `signals.requests.${target.id}.active`, false, changed);
    }
    Object.assign(event, { target: target.id, resource: intent.resource });
  } else if (intent.kind === "consume") {
    incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, -1, changed);
    setPath(state, `actors.${actor.id}.needs.${intent.resource}`, Math.max(0, actor.needs[intent.resource] - 4), changed);
    Object.assign(event, { resource: intent.resource });
  } else if (intent.kind === "request") {
    setPath(state, `signals.requests.${actor.id}`, { actor: actor.id, resource: intent.resource, active: true, openedTurn: state.meta.turn + 1 }, changed);
    Object.assign(event, { resource: intent.resource });
  } else if (intent.kind === "build") {
    const cell = field.cell(state, actor.position.x, actor.position.y);
    incrementPath(state, `actors.${actor.id}.inventory.fiber`, -3, changed);
    incrementPath(state, `actors.${actor.id}.energy`, -2, changed);
    setPath(state, `world.overrides.${keyOf(actor.position.x, actor.position.y)}.shelter`, cell.shelter + 1, changed);
    Object.assign(event, { structure: "shelter", at: deepClone(actor.position) });
  } else if (intent.kind === "rest") {
    setPath(state, `actors.${actor.id}.energy`, Math.min(actor.maxEnergy, actor.energy + 5), changed);
  } else if (intent.kind === "test_breach") {
    setPath(state, `actors.${actor.id}.energy`, -999, changed);
  }
  return appendEvent(state, event, changed);
}

function nearestMaterialStep(state, field, actor, resource, radius = 4) {
  let best = null;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = actor.position.x + dx;
      const y = actor.position.y + dy;
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > radius || !field.contains(x, y)) continue;
      const amount = field.cell(state, x, y).resources[resource] || 0;
      if (amount < 1) continue;
      const candidate = { x, y, distance, amount };
      if (!best || candidate.distance < best.distance || (candidate.distance === best.distance && candidate.amount > best.amount) || (candidate.distance === best.distance && candidate.amount === best.amount && `${x}_${y}` < `${best.x}_${best.y}`)) best = candidate;
    }
  }
  if (!best) return null;
  const dx = best.x - actor.position.x;
  const dy = best.y - actor.position.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return { x: actor.position.x + Math.sign(dx), y: actor.position.y };
  return { x: actor.position.x, y: actor.position.y + Math.sign(dy) };
}

function decideActor(state, field, actorId) {
  const actor = state.actors[actorId];
  const others = Object.values(state.actors).filter((other) => other.id !== actor.id).sort((a, b) => a.id.localeCompare(b.id));

  const visibleRequests = Object.values(state.signals.requests)
    .filter((request) => request.active && request.actor !== actor.id)
    .map((request) => ({ request, requester: state.actors[request.actor] }))
    .filter(({ requester }) => requester && manhattan(actor.position, requester.position) <= 1)
    .sort((a, b) => a.request.actor.localeCompare(b.request.actor));
  for (const { request, requester } of visibleRequests) {
    const connected = relationStrength(state, actor.id, requester.id) >= 1 || actor.disposition.cooperation >= 3;
    if (connected && actor.inventory[request.resource] > 0 && requester.needs[request.resource] > 0) {
      return { actor: actor.id, kind: "share", target: requester.id, resource: request.resource, cause: "visible_request" };
    }
  }

  const materialNeed = MATERIALS.map((resource) => ({ resource, pressure: actor.needs[resource] || 0 }))
    .sort((a, b) => b.pressure - a.pressure || a.resource.localeCompare(b.resource))[0];
  if (materialNeed.pressure >= 7) {
    if (actor.inventory[materialNeed.resource] > 0) return { actor: actor.id, kind: "consume", resource: materialNeed.resource, cause: "critical_need" };
    const holder = others.find((other) => manhattan(actor.position, other.position) <= 2 && other.inventory[materialNeed.resource] > 0);
    if (holder) return { actor: actor.id, kind: "request", resource: materialNeed.resource, cause: `observed_holder:${holder.id}` };
    const here = field.cell(state, actor.position.x, actor.position.y);
    if (here.resources[materialNeed.resource] > 0) return { actor: actor.id, kind: "gather", resource: materialNeed.resource, cause: "local_material" };
    const step = nearestMaterialStep(state, field, actor, materialNeed.resource);
    if (step && actor.energy > 0) return { actor: actor.id, kind: "move", to: step, cause: `seek:${materialNeed.resource}` };
  }

  for (const other of others) {
    if (manhattan(actor.position, other.position) > 1) continue;
    for (const resource of MATERIALS) {
      const connected = relationStrength(state, actor.id, other.id) >= 1 || actor.disposition.cooperation >= 3;
      if (connected && actor.inventory[resource] > 0 && other.needs[resource] >= 5) {
        return { actor: actor.id, kind: "share", target: other.id, resource, cause: "remembered_relation" };
      }
    }
  }

  const here = field.cell(state, actor.position.x, actor.position.y);
  if (actor.energy <= 4 && here.shelter > 0) return { actor: actor.id, kind: "rest", cause: "low_energy" };
  return null;
}

const rules = [
  {
    id: "identity.project_behavior",
    subscribes: ["evidence.behaviors"],
    run(state, changed) {
      for (const [actorId, counts] of Object.entries(state.evidence.behaviors)) {
        const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const [kind, strength] = ranked[0] || [null, 0];
        const pattern = strength < 1
          ? { label: "Unformed", strength: 0, basis: "No repeated behavior yet" }
          : { label: identityLabels[kind] || "Unclassified", strength, basis: `${kind} is the strongest receipt-backed behavior` };
        setPath(state, `derived.identityPatterns.${actorId}`, pattern, changed);
      }
    },
  },
  {
    id: "situations.project_causal_patterns",
    subscribes: ["evidence.events", "signals.requests", "relations"],
    run(state, changed) {
      const situations = [];
      const shares = state.evidence.events.filter((event) => event.kind === "share");
      const actorIds = Object.keys(state.actors).sort();
      for (let leftIndex = 0; leftIndex < actorIds.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < actorIds.length; rightIndex += 1) {
          const left = actorIds[leftIndex];
          const right = actorIds[rightIndex];
          const leftToRight = shares.some((event) => event.actor === left && event.target === right);
          const rightToLeft = shares.some((event) => event.actor === right && event.target === left);
          if (leftToRight && rightToLeft) {
            situations.push({
              id: `mutual_aid_${left}_${right}`,
              kind: "mutual_aid",
              actors: [left, right],
              state: "formed",
              evidence: shares.filter((event) => [left, right].includes(event.actor) && [left, right].includes(event.target)).map((event) => event.index),
            });
          }
        }
      }
      for (const request of Object.values(state.signals.requests).filter((entry) => entry.active)) {
        situations.push({
          id: `unanswered_${request.actor}_${request.resource}`,
          kind: "unanswered_need",
          actors: [request.actor],
          resource: request.resource,
          state: "open",
          evidence: [request.openedTurn],
        });
      }
      setPath(state, "derived.situations", situations, changed);
    },
  },
];

function topSegment(path) {
  return path.split(".")[0];
}

function buildRuleIndex(ruleNodes) {
  const index = new Map();
  for (const rule of ruleNodes) {
    for (const subscription of rule.subscribes) {
      const key = topSegment(subscription);
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(rule);
    }
  }
  return index;
}

function runIndexedRules(state, initialChanges, ruleIndex) {
  const candidates = new Set();
  for (const path of initialChanges) {
    for (const rule of ruleIndex.get(topSegment(path)) || []) candidates.add(rule);
  }
  const woken = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const fired = [];
  const changed = [];
  for (const rule of woken) {
    const before = changed.length;
    rule.run(state, changed);
    if (changed.length > before) fired.push(rule.id);
  }
  return { woken: woken.map((rule) => rule.id), fired, changed };
}

function checkInvariants(state, field) {
  for (const actor of Object.values(state.actors)) {
    if (actor.energy < 0 || actor.energy > actor.maxEnergy) return `actor.energy:${actor.id}`;
    if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
    if (inventoryMass(actor.inventory) > actor.capacity) return `actor.capacity:${actor.id}`;
    if (MATERIALS.some((material) => actor.inventory[material] < 0)) return `actor.inventory:${actor.id}`;
    if (Object.values(actor.needs).some((pressure) => pressure < 0 || pressure > 10)) return `actor.needs:${actor.id}`;
  }
  for (const [key, override] of Object.entries(state.world.overrides)) {
    if (override.resources && Object.values(override.resources).some((amount) => amount < 0)) return `world.resource:${key}`;
  }
  return null;
}

export class LivingWorld {
  constructor({ seed = "AXM-STATEBORN-LIVING-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
    this.options = { seed, width, height, chunkSize };
    this.field = new DeterministicField(this.options);
    this.ruleIndex = buildRuleIndex(rules);
    this.genesis = initialState(seed, width, height, this.field);
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
    this.lastTrace = { woken: [], fired: [], changed: [] };
  }

  get logicalNodeCount() {
    return this.options.width * this.options.height + Object.keys(this.state.actors).length;
  }

  get stateDigest() {
    return digest({ baseCommitment: this.field.baseCommitment, mutableState: this.state });
  }

  #receipt({ status, reason, playerIntent, operationId, beforeDigest, afterDigest, beforeRevision, afterRevision, actorEvents = [], trace = { woken: [], fired: [], changed: [] }, autonomy = [] }) {
    const body = {
      schema: "axm.stateborn.living-receipt/v2",
      sequence: this.receipts.length,
      operationId,
      status,
      reason,
      playerIntent: deepClone(playerIntent),
      beforeDigest,
      afterDigest,
      beforeRevision,
      afterRevision,
      actorEvents: deepClone(actorEvents),
      autonomy: deepClone(autonomy),
      wokenNodes: trace.woken,
      firedNodes: trace.fired,
      changedPaths: [...new Set(trace.changed)],
      logicalNodeCount: this.logicalNodeCount,
    };
    return { ...body, eventId: digest(body) };
  }

  #storeReceipt(receipt) {
    this.receipts.push(receipt);
    this.operations.set(receipt.operationId, receipt);
    return deepClone(receipt);
  }

  advance(rawPlayerIntent, options = {}) {
    const playerIntent = normalizeIntent(rawPlayerIntent);
    const operationId = options.operationId || `turn-${this.receipts.length}-${playerIntent.kind}`;
    if (this.operations.has(operationId)) return { ...deepClone(this.operations.get(operationId)), duplicate: true };
    const beforeDigest = this.stateDigest;
    const beforeRevision = this.state.meta.revision;
    const refusal = (reason) => this.#storeReceipt(this.#receipt({
      status: "REFUSED", reason, playerIntent, operationId, beforeDigest, afterDigest: beforeDigest,
      beforeRevision, afterRevision: beforeRevision,
    }));
    if (options.expectedRevision !== undefined && options.expectedRevision !== beforeRevision) return refusal("STALE_REVISION");
    const invalid = validateIntent(this.state, this.field, playerIntent);
    if (invalid) return refusal(invalid);

    const draft = deepClone(this.state);
    const changed = [];
    const actorEvents = [];
    actorEvents.push(applyIntent(draft, this.field, playerIntent, changed));

    const autonomy = [];
    const autonomyWoken = [];
    const autonomyFired = [];
    for (const actorId of Object.keys(draft.actors).filter((id) => id !== "player").sort()) {
      autonomyWoken.push(`autonomy.perceive.${actorId}`);
      const intent = decideActor(draft, this.field, actorId);
      autonomy.push({ actor: actorId, intent: intent ? deepClone(intent) : null });
      if (!intent) continue;
      const actorInvalid = validateIntent(draft, this.field, intent);
      if (actorInvalid) {
        autonomy[autonomy.length - 1].refused = actorInvalid;
        continue;
      }
      actorEvents.push(applyIntent(draft, this.field, intent, changed));
      autonomyFired.push(`autonomy.perceive.${actorId}`);
    }

    // Bounded environmental pressure. It changes actor needs, not every sleeping cell.
    const nextTurn = draft.meta.turn + 1;
    if (nextTurn % 2 === 0) {
      for (const actor of Object.values(draft.actors)) setPath(draft, `actors.${actor.id}.needs.food`, clamp(actor.needs.food + 1, 0, 10), changed);
    }
    if (nextTurn % 3 === 0) {
      for (const actor of Object.values(draft.actors)) setPath(draft, `actors.${actor.id}.needs.water`, clamp(actor.needs.water + 1, 0, 10), changed);
    }

    const ruleTrace = runIndexedRules(draft, changed, this.ruleIndex);
    const trace = {
      woken: [...autonomyWoken, ...ruleTrace.woken],
      fired: [...autonomyFired, ...ruleTrace.fired],
      changed: [...changed, ...ruleTrace.changed, "meta.revision", "meta.turn"],
    };
    const invariantFailure = checkInvariants(draft, this.field);
    if (invariantFailure) {
      return this.#storeReceipt(this.#receipt({
        status: "REFUSED", reason: `ATOMIC_ROLLBACK:${invariantFailure}`, playerIntent, operationId,
        beforeDigest, afterDigest: beforeDigest, beforeRevision, afterRevision: beforeRevision,
        actorEvents, trace, autonomy,
      }));
    }

    draft.meta.revision += 1;
    draft.meta.turn += 1;
    this.state = draft;
    const afterDigest = this.stateDigest;
    const receipt = this.#receipt({
      status: "APPLIED", reason: "OK", playerIntent, operationId, beforeDigest, afterDigest,
      beforeRevision, afterRevision: this.state.meta.revision, actorEvents, trace, autonomy,
    });
    this.lastTrace = trace;
    return this.#storeReceipt(receipt);
  }

  visibleCells(radius = 3, actorId = "player") {
    const actor = this.state.actors[actorId];
    const cells = [];
    for (let y = actor.position.y - radius; y <= actor.position.y + radius; y += 1) {
      for (let x = actor.position.x - radius; x <= actor.position.x + radius; x += 1) {
        const cell = this.field.cell(this.state, x, y);
        if (cell) cells.push(cell);
      }
    }
    return cells;
  }

  actionOptions(actorId = "player") {
    const actor = this.state.actors[actorId];
    const cell = this.field.cell(this.state, actor.position.x, actor.position.y);
    const options = [];
    for (const material of MATERIALS) {
      if (cell.resources[material] > 0) options.push({ actor: actorId, kind: "gather", resource: material });
      if (actor.inventory[material] > 0 && actor.needs[material] > 0) options.push({ actor: actorId, kind: "consume", resource: material });
      if (actor.needs[material] >= 3) options.push({ actor: actorId, kind: "request", resource: material });
    }
    for (const other of Object.values(this.state.actors).filter((candidate) => candidate.id !== actorId && manhattan(candidate.position, actor.position) <= 1)) {
      for (const material of MATERIALS) {
        if (actor.inventory[material] > 0 && other.needs[material] > 0) options.push({ actor: actorId, kind: "share", target: other.id, resource: material });
      }
    }
    if (actor.inventory.fiber >= 3 && cell.shelter < 1) options.push({ actor: actorId, kind: "build", structure: "shelter" });
    if (cell.shelter > 0 && actor.energy < actor.maxEnergy) options.push({ actor: actorId, kind: "rest" });
    options.push({ actor: actorId, kind: "wait" });
    return options.filter((intent) => validateIntent(this.state, this.field, intent) === null);
  }

  verifyReplay() {
    const replay = new LivingWorld(this.options);
    for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
      const result = replay.advance(receipt.playerIntent, { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
      if (result.status !== "APPLIED" || result.afterDigest !== receipt.afterDigest) {
        return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
      }
    }
    return { status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL", eventsReplayed: replay.receipts.length, expected: this.stateDigest, actual: replay.stateDigest };
  }

  exportSave() {
    const payload = { schema: "axm.stateborn.living-save/v2", options: deepClone(this.options), state: deepClone(this.state), receipts: deepClone(this.receipts) };
    return { ...payload, seal: digest(payload) };
  }

  importSave(save) {
    const { seal, ...payload } = deepClone(save);
    if (seal !== digest(payload)) return { status: "REFUSED", reason: "SAVE_SEAL_MISMATCH" };
    if (canonicalStringify(payload.options) !== canonicalStringify(this.options)) return { status: "REFUSED", reason: "WORLD_OPTIONS_MISMATCH" };
    const replay = new LivingWorld(this.options);
    for (const receipt of payload.receipts.filter((entry) => entry.status === "APPLIED")) {
      const result = replay.advance(receipt.playerIntent, { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
      if (result.status !== "APPLIED" || result.afterDigest !== receipt.afterDigest) return { status: "REFUSED", reason: "REPLAY_CHAIN_MISMATCH", at: receipt.sequence };
    }
    if (canonicalStringify(replay.state) !== canonicalStringify(payload.state)) return { status: "REFUSED", reason: "STATE_REPLAY_MISMATCH" };
    this.state = deepClone(payload.state);
    this.receipts = deepClone(payload.receipts);
    this.operations = new Map(this.receipts.map((receipt) => [receipt.operationId, receipt]));
    return { status: "IMPORTED", revision: this.state.meta.revision, digest: this.stateDigest };
  }

  stats() {
    return { logicalNodes: this.logicalNodeCount, ...this.field.stats(this.state) };
  }
}

export const livingProbe = [
  { actor: "player", kind: "share", target: "rhea", resource: "food" },
];

export const livingFabricCatalog = {
  logicalWorld: "deterministic sparse field",
  generatorVersion: GENERATOR_VERSION,
  ruleNodes: rules.map((rule) => ({ id: rule.id, subscribes: rule.subscribes })),
  autonomyNodes: ["autonomy.perceive.rhea", "autonomy.perceive.orr"],
  actionKinds: ["move", "gather", "share", "consume", "request", "build", "rest", "wait"],
};
