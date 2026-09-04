import { canonicalStringify, deepClone, digest } from "./engine.js";
import { DeterministicField } from "./living-world.js";

export const CURIOSITY_SIGNALS = ["hush", "pulse", "turn", "open"];
const DIRECTIONS = [
  { id: "north", dx: 0, dy: -1 },
  { id: "east", dx: 1, dy: 0 },
  { id: "south", dx: 0, dy: 1 },
  { id: "west", dx: -1, dy: 0 },
];
const BASE_VITALITY = 3;
const FIELD_VERSION = "axm.stateborn.curiosity-field/v1";
const POLICY_VERSION = "axm.stateborn.curiosity-policy/v1";

function numberFrom(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function keyOf(x, y) {
  return `${x}_${y}`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function circularDistance(left, right, size) {
  const direct = Math.abs(left - right);
  return Math.min(direct, size - direct);
}

function observationSignature(cell) {
  return `${cell.terrain}:${cell.phase}`;
}

function conditionOf(vitality) {
  if (vitality >= 5) return "bloom";
  if (vitality <= 1) return "scar";
  return "quiet";
}

export class CuriosityField {
  constructor({ seed, width, height, chunkSize = 32 }) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.chunkSize = chunkSize;
    this.terrainField = new DeterministicField({ seed: `${seed}:terrain`, width, height, chunkSize });
    this.baseCommitment = digest({
      schema: FIELD_VERSION,
      seed,
      width,
      height,
      chunkSize,
      terrainCommitment: this.terrainField.baseCommitment,
      baseVitality: BASE_VITALITY,
    });
  }

  contains(x, y) {
    return this.terrainField.contains(x, y);
  }

  baseCell(x, y) {
    const terrain = this.terrainField.baseCell(x, y);
    if (!terrain) return null;
    const hidden = numberFrom(`${this.seed}:${x}:${y}`);
    return {
      id: keyOf(x, y),
      x,
      y,
      terrain: terrain.terrain,
      phase: (hidden >>> 5) % CURIOSITY_SIGNALS.length,
      vitality: BASE_VITALITY,
      touches: 0,
      condition: "quiet",
    };
  }

  affinity(x, y) {
    return numberFrom(`${this.seed}:affinity:${x}:${y}`) % CURIOSITY_SIGNALS.length;
  }

  cell(state, x, y) {
    const base = this.baseCell(x, y);
    if (!base) return null;
    const override = state.world.overrides[keyOf(x, y)] || {};
    const cell = { ...base, ...deepClone(override) };
    cell.condition = conditionOf(cell.vitality);
    return cell;
  }

  stats(state) {
    const changed = Object.keys(state.world.overrides);
    return {
      logicalCells: this.width * this.height,
      materializedCells: this.terrainField.cache.size,
      sleepingCells: this.width * this.height - this.terrainField.cache.size,
      changedCells: changed.length,
      changedChunks: new Set(changed.map((key) => {
        const [x, y] = key.split("_").map(Number);
        return `${Math.floor(x / this.chunkSize)}_${Math.floor(y / this.chunkSize)}`;
      })).size,
    };
  }
}

function actorTemplate(id, name, x, y, index) {
  return {
    id,
    name,
    position: { x, y },
    movesSinceTouch: index % 2,
    memory: {
      seen: {},
      trials: {},
      recent: [],
    },
  };
}

function createGenesis(options, field) {
  const center = { x: Math.floor(options.width / 2), y: Math.floor(options.height / 2) };
  const offsets = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]];
  const names = ["Mote", "Rill", "Vey", "Luma", "Kite", "Nim"];
  const actors = {};
  for (let index = 0; index < offsets.length; index += 1) {
    const [dx, dy] = offsets[index];
    const id = `curious_${String(index + 1).padStart(2, "0")}`;
    actors[id] = actorTemplate(id, names[index], center.x + dx, center.y + dy, index);
  }
  return {
    schema: "axm.stateborn.curiosity-world/v1",
    seed: options.seed,
    meta: { revision: 0, step: 0, policy: POLICY_VERSION, claim: "EXPERIMENTAL" },
    world: {
      width: options.width,
      height: options.height,
      chunkSize: options.chunkSize,
      baseCommitment: field.baseCommitment,
      overrides: {},
    },
    actors,
    evidence: { events: [] },
    derived: {
      observer: {
        touchedCells: 0,
        healthDelta: 0,
        growthEvents: 0,
        damageEvents: 0,
        neutralEvents: 0,
        bloomCells: 0,
        scarCells: 0,
        echoCells: 0,
        uniqueActorObservations: 0,
      },
      patterns: [],
    },
  };
}

function recordCount(map, key, amount = 1) {
  map[key] = Number(map[key] || 0) + amount;
}

function policyView(state, field, actorId) {
  const actor = state.actors[actorId];
  const here = field.cell(state, actor.position.x, actor.position.y);
  const neighbours = DIRECTIONS.map((direction) => {
    const x = actor.position.x + direction.dx;
    const y = actor.position.y + direction.dy;
    const cell = field.cell(state, x, y);
    if (!cell) return null;
    const signature = observationSignature(cell);
    return {
      direction: direction.id,
      x,
      y,
      terrain: cell.terrain,
      phase: cell.phase,
      seenCount: Number(actor.memory.seen[signature] || 0),
      triedCount: Number(actor.memory.trials[`move:${direction.id}:${signature}`] || 0),
    };
  }).filter(Boolean);
  const currentSignature = observationSignature(here);
  return {
    schema: "axm.stateborn.curiosity-view/v1",
    actor: actor.id,
    step: state.meta.step,
    position: deepClone(actor.position),
    current: { terrain: here.terrain, phase: here.phase, signature: currentSignature },
    neighbours,
    signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${currentSignature}`] || 0)])),
    currentSeenCount: Number(actor.memory.seen[currentSignature] || 0),
    movesSinceTouch: actor.movesSinceTouch,
  };
}

function chooseFromView(view, seed) {
  const candidates = [];
  for (const neighbour of view.neighbours) {
    const novelty = neighbour.seenCount === 0 ? 100 : Math.max(4, 28 - neighbour.seenCount * 4);
    const untried = neighbour.triedCount === 0 ? 10 : 0;
    candidates.push({
      intent: { kind: "move", to: { x: neighbour.x, y: neighbour.y }, direction: neighbour.direction },
      score: novelty + untried,
      basis: neighbour.seenCount === 0 ? "unseen_neighbour" : "least_familiar_neighbour",
      key: `move:${neighbour.direction}`,
    });
  }
  for (const signal of CURIOSITY_SIGNALS) {
    const trials = view.signalTrials[signal];
    const novelty = trials === 0 ? 68 : Math.max(2, 18 - trials * 4);
    const questionPressure = view.movesSinceTouch * 48;
    candidates.push({
      intent: { kind: "signal", signal },
      score: novelty + questionPressure,
      basis: trials === 0 ? "untried_signal_in_context" : "least_tried_signal_in_context",
      key: `signal:${signal}`,
    });
  }
  return candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const leftTie = numberFrom(`${seed}:${view.step}:${view.actor}:${left.key}`);
    const rightTie = numberFrom(`${seed}:${view.step}:${view.actor}:${right.key}`);
    return leftTie - rightTie || left.key.localeCompare(right.key);
  })[0];
}

function updateObserver(state) {
  const changedCells = Object.entries(state.world.overrides);
  const observer = {
    touchedCells: changedCells.length,
    healthDelta: changedCells.reduce((sum, [, cell]) => sum + Number(cell.vitality - BASE_VITALITY), 0),
    growthEvents: state.evidence.events.filter((event) => event.observerOutcome === "growth").length,
    damageEvents: state.evidence.events.filter((event) => event.observerOutcome === "damage").length,
    neutralEvents: state.evidence.events.filter((event) => event.observerOutcome === "change").length,
    bloomCells: changedCells.filter(([, cell]) => conditionOf(cell.vitality) === "bloom").length,
    scarCells: changedCells.filter(([, cell]) => conditionOf(cell.vitality) === "scar").length,
    echoCells: 0,
    uniqueActorObservations: Object.values(state.actors).reduce((sum, actor) => sum + Object.keys(actor.memory.seen).length, 0),
  };
  const touchedBy = new Map();
  for (const event of state.evidence.events.filter((event) => event.intent.kind === "signal")) {
    if (!touchedBy.has(event.cell)) touchedBy.set(event.cell, new Set());
    touchedBy.get(event.cell).add(event.actor);
  }
  observer.echoCells = [...touchedBy.values()].filter((actors) => actors.size > 1).length;

  const patterns = [];
  if (observer.echoCells > 0) patterns.push({ id: "shared_echo", kind: "shared_echo", strength: observer.echoCells, basis: "multiple actors changed the same cell" });
  if (observer.bloomCells >= 3) patterns.push({ id: "bloom_scatter", kind: "bloom_scatter", strength: observer.bloomCells, basis: "three or more changed cells crossed the bloom threshold" });
  if (observer.scarCells >= 3) patterns.push({ id: "scar_scatter", kind: "scar_scatter", strength: observer.scarCells, basis: "three or more changed cells crossed the scar threshold" });
  if (observer.touchedCells >= 12) patterns.push({ id: "curiosity_trail", kind: "curiosity_trail", strength: observer.touchedCells, basis: "questions changed twelve or more sparse cells" });
  state.derived.observer = observer;
  state.derived.patterns = patterns;
}

function validateState(state, field) {
  for (const actor of Object.values(state.actors)) {
    if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
    if (actor.movesSinceTouch < 0) return `actor.movesSinceTouch:${actor.id}`;
  }
  for (const [cellId, override] of Object.entries(state.world.overrides)) {
    if (override.vitality < 0 || override.vitality > 6) return `cell.vitality:${cellId}`;
    if (override.phase < 0 || override.phase >= CURIOSITY_SIGNALS.length) return `cell.phase:${cellId}`;
  }
  return null;
}

export class CuriosityWorld {
  constructor({ seed = "AXM-CURIOSITY-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
    this.options = { seed, width, height, chunkSize };
    this.field = new CuriosityField(this.options);
    this.genesis = createGenesis(this.options, this.field);
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
  }

  get stateDigest() {
    return digest({ baseCommitment: this.field.baseCommitment, mutableState: this.state });
  }

  get actorIds() {
    return Object.keys(this.state.actors).sort();
  }

  policyInput(actorId = this.actorIds[this.state.meta.step % this.actorIds.length]) {
    return policyView(this.state, this.field, actorId);
  }

  previewDecision(actorId = this.actorIds[this.state.meta.step % this.actorIds.length]) {
    const view = this.policyInput(actorId);
    return { actor: actorId, view, ...chooseFromView(view, this.options.seed) };
  }

  step({ operationId, expectedRevision } = {}) {
    const actorId = this.actorIds[this.state.meta.step % this.actorIds.length];
    const resolvedOperationId = operationId || `curiosity-${this.receipts.length}`;
    if (this.operations.has(resolvedOperationId)) return { ...deepClone(this.operations.get(resolvedOperationId)), duplicate: true };
    const beforeDigest = this.stateDigest;
    const beforeRevision = this.state.meta.revision;
    if (expectedRevision !== undefined && expectedRevision !== beforeRevision) {
      const refused = {
        schema: "axm.stateborn.curiosity-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedOperationId,
        status: "REFUSED",
        reason: "STALE_REVISION",
        actor: actorId,
        beforeRevision,
        afterRevision: beforeRevision,
        beforeDigest,
        afterDigest: beforeDigest,
        policyView: null,
        intent: null,
        observerOutcome: null,
        changedPaths: [],
      };
      refused.eventId = digest(refused);
      this.receipts.push(refused);
      this.operations.set(resolvedOperationId, refused);
      return deepClone(refused);
    }

    const decision = this.previewDecision(actorId);
    const draft = deepClone(this.state);
    const actor = draft.actors[actorId];
    const changedPaths = [];
    const hereBefore = this.field.cell(draft, actor.position.x, actor.position.y);
    recordCount(actor.memory.seen, observationSignature(hereBefore));
    changedPaths.push(`actors.${actorId}.memory.seen`);
    let observerOutcome = null;
    let consequence = null;

    if (decision.intent.kind === "move") {
      const trialKey = `move:${decision.intent.direction}:${observationSignature(this.field.cell(draft, decision.intent.to.x, decision.intent.to.y))}`;
      recordCount(actor.memory.trials, trialKey);
      actor.position = deepClone(decision.intent.to);
      actor.movesSinceTouch += 1;
      changedPaths.push(`actors.${actorId}.position`, `actors.${actorId}.movesSinceTouch`, `actors.${actorId}.memory.trials`);
    } else {
      const signalIndex = CURIOSITY_SIGNALS.indexOf(decision.intent.signal);
      const targetIndex = (this.field.affinity(hereBefore.x, hereBefore.y) + hereBefore.phase) % CURIOSITY_SIGNALS.length;
      const distance = circularDistance(signalIndex, targetIndex, CURIOSITY_SIGNALS.length);
      const vitalityDelta = distance === 0 ? 2 : distance === 2 ? -2 : 0;
      const nextVitality = clamp(hereBefore.vitality + vitalityDelta, 0, 6);
      const nextPhase = (hereBefore.phase + signalIndex + 1) % CURIOSITY_SIGNALS.length;
      const nextOverride = { vitality: nextVitality, phase: nextPhase, touches: hereBefore.touches + 1 };
      draft.world.overrides[hereBefore.id] = nextOverride;
      const trialKey = `signal:${decision.intent.signal}:${observationSignature(hereBefore)}`;
      recordCount(actor.memory.trials, trialKey);
      actor.movesSinceTouch = 0;
      observerOutcome = vitalityDelta > 0 ? "growth" : vitalityDelta < 0 ? "damage" : "change";
      consequence = { cell: hereBefore.id, vitalityDelta, phaseBefore: hereBefore.phase, phaseAfter: nextPhase };
      changedPaths.push(`world.overrides.${hereBefore.id}`, `actors.${actorId}.movesSinceTouch`, `actors.${actorId}.memory.trials`);
    }

    actor.memory.recent = [...actor.memory.recent, { step: draft.meta.step, signature: observationSignature(hereBefore), intent: decision.intent.kind }].slice(-12);
    const event = {
      index: draft.evidence.events.length,
      actor: actorId,
      cell: hereBefore.id,
      intent: deepClone(decision.intent),
      curiosityBasis: decision.basis,
      observerOutcome,
    };
    draft.evidence.events.push(event);
    changedPaths.push(`actors.${actorId}.memory.recent`, "evidence.events");
    draft.meta.revision += 1;
    draft.meta.step += 1;
    changedPaths.push("meta.revision", "meta.step");
    updateObserver(draft);
    changedPaths.push("derived.observer", "derived.patterns");

    const invariantFailure = validateState(draft, this.field);
    if (invariantFailure) throw new Error(`curiosity invariant failed: ${invariantFailure}`);
    this.state = draft;
    const afterDigest = this.stateDigest;
    const receipt = {
      schema: "axm.stateborn.curiosity-receipt/v1",
      sequence: this.receipts.length,
      operationId: resolvedOperationId,
      status: "APPLIED",
      reason: "OK",
      actor: actorId,
      beforeRevision,
      afterRevision: draft.meta.revision,
      beforeDigest,
      afterDigest,
      policyView: decision.view,
      noveltyPressure: decision.score,
      curiosityBasis: decision.basis,
      intent: deepClone(decision.intent),
      observerOutcome,
      consequence,
      changedPaths: [...new Set(changedPaths)],
    };
    receipt.eventId = digest(receipt);
    this.receipts.push(receipt);
    this.operations.set(resolvedOperationId, receipt);
    return deepClone(receipt);
  }

  run(steps) {
    const results = [];
    for (let index = 0; index < steps; index += 1) {
      results.push(this.step({ operationId: `run-${this.receipts.length}`, expectedRevision: this.state.meta.revision }));
    }
    return results;
  }

  visibleCells(radius = 8) {
    const center = { x: Math.floor(this.options.width / 2), y: Math.floor(this.options.height / 2) };
    const cells = [];
    for (let y = center.y - radius; y <= center.y + radius; y += 1) {
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        const cell = this.field.cell(this.state, x, y);
        if (cell) cells.push(cell);
      }
    }
    return cells;
  }

  verifyReplay() {
    const replay = new CuriosityWorld(this.options);
    for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
      const result = replay.step({ operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
      if (result.afterDigest !== receipt.afterDigest || canonicalStringify(result.intent) !== canonicalStringify(receipt.intent)) {
        return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
      }
    }
    return {
      status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
      stepsReplayed: replay.state.meta.step,
      expected: this.stateDigest,
      actual: replay.stateDigest,
    };
  }

  stats() {
    return {
      logicalNodes: this.options.width * this.options.height + this.actorIds.length,
      actors: this.actorIds.length,
      ...this.field.stats(this.state),
      ...deepClone(this.state.derived.observer),
    };
  }
}

export const curiosityPolicyContract = {
  version: POLICY_VERSION,
  visible: ["terrain", "phase", "unexplored-neighbour count", "context/action trial counts", "recent observation signatures"],
  forbidden: ["reward", "score of success", "damage", "vitality", "bloom", "scar", "observer summary"],
  selection: "highest deterministic novelty pressure; no outcome reward",
};
