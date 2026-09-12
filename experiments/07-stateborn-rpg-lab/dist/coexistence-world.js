import { canonicalStringify, deepClone, digest } from "./engine.js";
import { CuriosityField, CURIOSITY_SIGNALS } from "./curiosity-world.js";

const DIRECTIONS = [
  { id: "north", dx: 0, dy: -1 }, { id: "east", dx: 1, dy: 0 },
  { id: "south", dx: 0, dy: 1 }, { id: "west", dx: -1, dy: 0 },
];
const ROLES = ["human", "machine", "ai"];
const BASE_VITALITY = 3;
const POLICY_VERSION = "axm.stateborn.coexistence-policy/v1";

function numberFrom(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  return hash >>> 0;
}

const keyOf = (x, y) => `${x}_${y}`;
const signatureOf = (cell) => `${cell.terrain}:${cell.phase}`;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
function circularDistance(left, right, size) {
  const direct = Math.abs(left - right);
  return Math.min(direct, size - direct);
}
function recordCount(map, key) { map[key] = Number(map[key] || 0) + 1; }

function actorTemplate(id, name, role, center) {
  return { id, name, role, position: deepClone(center), movesSinceTouch: 1, memory: { seen: {}, trials: {}, recent: [] } };
}

function createGenesis(options, field) {
  const center = { x: Math.floor(options.width / 2), y: Math.floor(options.height / 2) };
  return {
    schema: "axm.stateborn.coexistence-world/v1", seed: options.seed,
    meta: { revision: 0, cycle: 0, policy: POLICY_VERSION, claim: "EXPERIMENTAL", fixture: "AUTHORED_SHARED_START" },
    world: { width: options.width, height: options.height, chunkSize: options.chunkSize, baseCommitment: field.baseCommitment, overrides: {} },
    actors: {
      witness: actorTemplate("witness", "Witness", "human", center),
      mote: actorTemplate("mote", "Mote", "machine", center),
      lumen: actorTemplate("lumen", "Lumen", "ai", center),
    },
    evidence: { events: [] },
    derived: {
      observer: { growthEvents: 0, damageEvents: 0, changeEvents: 0, movementEvents: 0, waitEvents: 0, changedCells: 0, healthDelta: 0 },
      threads: [],
    },
  };
}

function normalizeIntent(actor, raw) {
  if (!raw || typeof raw !== "object") return { error: "INTENT_REQUIRED" };
  if (!["move", "signal", "wait"].includes(raw.kind)) return { error: "UNKNOWN_INTENT_KIND" };
  if (raw.kind === "wait") return { intent: { kind: "wait" } };
  if (raw.kind === "signal") return CURIOSITY_SIGNALS.includes(raw.signal)
    ? { intent: { kind: "signal", signal: raw.signal } } : { error: "UNKNOWN_SIGNAL" };
  let direction = DIRECTIONS.find((candidate) => candidate.id === raw.direction);
  if (!direction && raw.to && Number.isInteger(raw.to.x) && Number.isInteger(raw.to.y)) {
    direction = DIRECTIONS.find((candidate) => actor.position.x + candidate.dx === raw.to.x && actor.position.y + candidate.dy === raw.to.y);
  }
  if (!direction) return { error: "MOVE_NOT_CARDINAL_ADJACENT" };
  return { intent: { kind: "move", direction: direction.id, to: { x: actor.position.x + direction.dx, y: actor.position.y + direction.dy } } };
}

function validateIntent(state, field, actorId, raw) {
  const result = normalizeIntent(state.actors[actorId], raw);
  if (result.intent?.kind === "move" && !field.contains(result.intent.to.x, result.intent.to.y)) return { error: "MOVE_OUT_OF_BOUNDS" };
  return result;
}

function machinePolicyView(state, field) {
  const actor = state.actors.mote;
  const here = field.cell(state, actor.position.x, actor.position.y);
  const signature = signatureOf(here);
  const neighbours = DIRECTIONS.map((direction) => {
    const x = actor.position.x + direction.dx;
    const y = actor.position.y + direction.dy;
    const cell = field.cell(state, x, y);
    if (!cell) return null;
    const nextSignature = signatureOf(cell);
    return { direction: direction.id, x, y, terrain: cell.terrain, phase: cell.phase,
      seenCount: Number(actor.memory.seen[nextSignature] || 0),
      triedCount: Number(actor.memory.trials[`move:${direction.id}:${nextSignature}`] || 0) };
  }).filter(Boolean);
  return {
    schema: "axm.stateborn.machine-curiosity-view/v1", actor: actor.id, cycle: state.meta.cycle,
    position: deepClone(actor.position), current: { terrain: here.terrain, phase: here.phase, signature }, neighbours,
    signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${signature}`] || 0)])),
    currentSeenCount: Number(actor.memory.seen[signature] || 0), movesSinceTouch: actor.movesSinceTouch,
  };
}

function chooseMachineIntent(view, seed) {
  const candidates = view.neighbours.map((neighbour) => ({
    intent: { kind: "move", direction: neighbour.direction, to: { x: neighbour.x, y: neighbour.y } },
    score: (neighbour.seenCount === 0 ? 100 : Math.max(4, 28 - neighbour.seenCount * 4)) + (neighbour.triedCount === 0 ? 10 : 0),
    basis: neighbour.seenCount === 0 ? "unseen_neighbour" : "least_familiar_neighbour", key: `move:${neighbour.direction}`,
  }));
  for (const signal of CURIOSITY_SIGNALS) {
    const trials = view.signalTrials[signal];
    candidates.push({ intent: { kind: "signal", signal },
      score: (trials === 0 ? 68 : Math.max(2, 18 - trials * 4)) + view.movesSinceTouch * 48,
      basis: trials === 0 ? "untried_signal_in_context" : "least_tried_signal_in_context", key: `signal:${signal}` });
  }
  return candidates.sort((left, right) => right.score - left.score
    || numberFrom(`${seed}:${view.cycle}:machine:${left.key}`) - numberFrom(`${seed}:${view.cycle}:machine:${right.key}`)
    || left.key.localeCompare(right.key))[0];
}

function aiProposalView(state, field) {
  const actor = state.actors.lumen;
  const here = field.cell(state, actor.position.x, actor.position.y);
  const signature = signatureOf(here);
  return {
    schema: "axm.stateborn.ai-proposal-view/v1", cycle: state.meta.cycle,
    seat: { id: actor.id, role: actor.role, position: deepClone(actor.position) },
    current: { terrain: here.terrain, phase: here.phase, condition: here.condition, touches: here.touches },
    otherSeats: Object.values(state.actors).filter((candidate) => candidate.id !== actor.id)
      .map((candidate) => ({ id: candidate.id, role: candidate.role, position: deepClone(candidate.position) })),
    allowedIntentKinds: ["move", "signal", "wait"], allowedSignals: [...CURIOSITY_SIGNALS],
    signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${signature}`] || 0)])),
    recentEvents: state.evidence.events.slice(-6).map((event) => ({ eventId: event.eventId, role: event.role, cell: event.cell, kind: event.intent.kind, outcome: event.observerOutcome })),
  };
}

function standInProposal(view, seed) {
  const coLocated = view.otherSeats.some((seat) => seat.position.x === view.seat.position.x && seat.position.y === view.seat.position.y);
  if (coLocated) {
    const least = Math.min(...Object.values(view.signalTrials));
    const signal = CURIOSITY_SIGNALS.filter((candidate) => view.signalTrials[candidate] === least)
      .sort((left, right) => numberFrom(`${seed}:${view.cycle}:stand-in:${left}`) - numberFrom(`${seed}:${view.cycle}:stand-in:${right}`) || left.localeCompare(right))[0];
    return { intent: { kind: "signal", signal }, basis: "least_tried_signal_while_co_located" };
  }
  const target = [...view.otherSeats].sort((left, right) => {
    const leftDistance = Math.abs(left.position.x - view.seat.position.x) + Math.abs(left.position.y - view.seat.position.y);
    const rightDistance = Math.abs(right.position.x - view.seat.position.x) + Math.abs(right.position.y - view.seat.position.y);
    return leftDistance - rightDistance || left.id.localeCompare(right.id);
  })[0];
  if (!target) return { intent: { kind: "wait" }, basis: "no_other_seat_visible" };
  const horizontal = target.position.x - view.seat.position.x;
  const vertical = target.position.y - view.seat.position.y;
  const direction = Math.abs(horizontal) >= Math.abs(vertical) ? (horizontal > 0 ? "east" : "west") : (vertical > 0 ? "south" : "north");
  return { intent: { kind: "move", direction }, basis: "step_toward_nearest_visible_seat" };
}

function applyIntent(state, field, actorId, intent, decisionBasis) {
  const actor = state.actors[actorId];
  const beforePosition = deepClone(actor.position);
  const here = field.cell(state, actor.position.x, actor.position.y);
  const signature = signatureOf(here);
  recordCount(actor.memory.seen, signature);
  let observerOutcome = null;
  let consequence = null;
  let eventCell = here.id;
  if (intent.kind === "move") {
    const target = field.cell(state, intent.to.x, intent.to.y);
    recordCount(actor.memory.trials, `move:${intent.direction}:${signatureOf(target)}`);
    actor.position = deepClone(intent.to);
    actor.movesSinceTouch += 1;
    eventCell = target.id;
  } else if (intent.kind === "signal") {
    const signalIndex = CURIOSITY_SIGNALS.indexOf(intent.signal);
    const targetIndex = (field.affinity(here.x, here.y) + here.phase) % CURIOSITY_SIGNALS.length;
    const distance = circularDistance(signalIndex, targetIndex, CURIOSITY_SIGNALS.length);
    const proposedDelta = distance === 0 ? 2 : distance === 2 ? -2 : 0;
    const nextVitality = clamp(here.vitality + proposedDelta, 0, 6);
    const vitalityDelta = nextVitality - here.vitality;
    const nextPhase = (here.phase + signalIndex + 1) % CURIOSITY_SIGNALS.length;
    state.world.overrides[here.id] = { vitality: nextVitality, phase: nextPhase, touches: here.touches + 1 };
    recordCount(actor.memory.trials, `signal:${intent.signal}:${signature}`);
    actor.movesSinceTouch = 0;
    observerOutcome = vitalityDelta > 0 ? "growth" : vitalityDelta < 0 ? "damage" : "change";
    consequence = { cell: here.id, vitalityDelta, vitalityBefore: here.vitality, vitalityAfter: nextVitality, phaseBefore: here.phase, phaseAfter: nextPhase };
  } else {
    recordCount(actor.memory.trials, `wait:${signature}`);
    observerOutcome = "quiet";
  }
  actor.memory.recent = [...actor.memory.recent, { cycle: state.meta.cycle, at: signature, kind: intent.kind }].slice(-12);
  const event = { schema: "axm.stateborn.coexistence-event/v1", index: state.evidence.events.length,
    cycle: state.meta.cycle, actor: actor.id, role: actor.role, from: beforePosition, to: deepClone(actor.position),
    cell: eventCell, intent: deepClone(intent), decisionBasis, observerOutcome, consequence };
  event.eventId = digest(event);
  state.evidence.events.push(event);
  return event;
}

function projectThreads(state) {
  const byCell = new Map();
  for (const event of state.evidence.events) {
    if (!byCell.has(event.cell)) byCell.set(event.cell, []);
    byCell.get(event.cell).push(event);
  }
  const threads = [];
  for (const [cell, events] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const touches = events.filter((event) => event.intent.kind === "signal");
    const roles = new Set(touches.map((event) => event.role));
    if (roles.size >= 2) threads.push({ id: `shared_site:${cell}`, kind: "shared_site", cell,
      roles: [...roles].sort(), evidence: touches.map((event) => event.eventId),
      basis: "two or more roles committed signals at this cell" });
    if (ROLES.every((role) => roles.has(role))) threads.push({ id: `three_way_mark:${cell}`, kind: "three_way_mark", cell,
      roles: [...ROLES], evidence: touches.map((event) => event.eventId),
      basis: "human, machine, and AI-compatible seats each committed a signal here" });
    for (let index = 0; index < touches.length; index += 1) {
      const damage = touches[index];
      if ((damage.consequence?.vitalityDelta || 0) >= 0) continue;
      const recovery = touches.slice(index + 1).find((event) => event.role !== damage.role && (event.consequence?.vitalityDelta || 0) > 0);
      if (recovery) {
        threads.push({ id: `cross_role_recovery:${cell}`, kind: "cross_role_recovery", cell,
          roles: [damage.role, recovery.role], evidence: [damage.eventId, recovery.eventId],
          basis: "a different role produced positive vitality after recorded damage" });
        break;
      }
    }
  }
  const occupants = new Map();
  for (const actor of Object.values(state.actors)) {
    const cell = keyOf(actor.position.x, actor.position.y);
    if (!occupants.has(cell)) occupants.set(cell, []);
    occupants.get(cell).push(actor);
  }
  for (const [cell, actors] of occupants) {
    if (actors.length < 2) continue;
    const evidence = actors.map((actor) => [...state.evidence.events].reverse().find((event) => event.actor === actor.id && event.cell === cell)).filter(Boolean);
    if (evidence.length === actors.length) threads.push({ id: `encounter:${cell}`, kind: "encounter", cell,
      roles: actors.map((actor) => actor.role).sort(), evidence: evidence.map((event) => event.eventId),
      basis: "co-located seats each have a recorded event at this cell" });
  }
  return threads.sort((left, right) => left.id.localeCompare(right.id));
}

function updateDerived(state) {
  const signals = state.evidence.events.filter((event) => event.intent.kind === "signal");
  const changed = Object.entries(state.world.overrides);
  state.derived.observer = {
    growthEvents: signals.filter((event) => event.observerOutcome === "growth").length,
    damageEvents: signals.filter((event) => event.observerOutcome === "damage").length,
    changeEvents: signals.filter((event) => event.observerOutcome === "change").length,
    movementEvents: state.evidence.events.filter((event) => event.intent.kind === "move").length,
    waitEvents: state.evidence.events.filter((event) => event.intent.kind === "wait").length,
    changedCells: changed.length,
    healthDelta: changed.reduce((sum, [, override]) => sum + Number(override.vitality - BASE_VITALITY), 0),
  };
  state.derived.threads = projectThreads(state);
}

function validateState(state, field) {
  for (const actor of Object.values(state.actors)) {
    if (!ROLES.includes(actor.role)) return `actor.role:${actor.id}`;
    if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
  }
  for (const [cell, override] of Object.entries(state.world.overrides)) {
    if (override.vitality < 0 || override.vitality > 6) return `cell.vitality:${cell}`;
    if (override.phase < 0 || override.phase >= CURIOSITY_SIGNALS.length) return `cell.phase:${cell}`;
  }
  const events = new Set(state.evidence.events.map((event) => event.eventId));
  for (const thread of state.derived.threads) {
    if (!thread.evidence.length || thread.evidence.some((eventId) => !events.has(eventId))) return `thread.evidence:${thread.id}`;
  }
  return null;
}

export class CoexistenceWorld {
  constructor({ seed = "AXM-COEXIST-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
    this.options = { seed, width, height, chunkSize };
    this.field = new CuriosityField(this.options);
    this.genesis = createGenesis(this.options, this.field);
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
  }

  get stateDigest() { return digest({ baseCommitment: this.field.baseCommitment, mutableState: this.state }); }
  machinePolicyInput() { return machinePolicyView(this.state, this.field); }
  aiProposalInput() { return aiProposalView(this.state, this.field); }
  previewMachineDecision() {
    const view = this.machinePolicyInput();
    return { view, ...chooseMachineIntent(view, this.options.seed) };
  }
  previewStandInProposal() {
    const view = this.aiProposalInput();
    return { view, ...standInProposal(view, this.options.seed), source: "DETERMINISTIC_STAND_IN" };
  }

  cycle(humanIntent, { aiProposal, operationId, expectedRevision } = {}) {
    const resolvedOperationId = operationId || `coexistence-${this.receipts.length}`;
    if (this.operations.has(resolvedOperationId)) return { ...deepClone(this.operations.get(resolvedOperationId)), duplicate: true };
    const beforeDigest = this.stateDigest;
    const beforeRevision = this.state.meta.revision;
    const humanValidation = validateIntent(this.state, this.field, "witness", humanIntent);
    const stale = expectedRevision !== undefined && expectedRevision !== beforeRevision;
    if (stale || humanValidation.error) {
      const refused = { schema: "axm.stateborn.coexistence-receipt/v1", sequence: this.receipts.length,
        operationId: resolvedOperationId, status: "REFUSED", reason: stale ? "STALE_REVISION" : `HUMAN_${humanValidation.error}`,
        beforeRevision, afterRevision: beforeRevision, beforeDigest, afterDigest: beforeDigest,
        humanIntent: humanValidation.intent || deepClone(humanIntent), machineDecision: null, aiDecision: null,
        eventIds: [], threadIds: [], changedPaths: [] };
      refused.receiptId = digest(refused);
      this.receipts.push(refused);
      this.operations.set(resolvedOperationId, refused);
      return deepClone(refused);
    }

    const draft = deepClone(this.state);
    const events = [];
    const humanEvent = applyIntent(draft, this.field, "witness", humanValidation.intent, "DIRECT_HUMAN_CHOICE");
    events.push(humanEvent);
    const machineView = machinePolicyView(draft, this.field);
    const machineChoice = chooseMachineIntent(machineView, this.options.seed);
    const machineValidation = validateIntent(draft, this.field, "mote", machineChoice.intent);
    if (machineValidation.error) throw new Error(`machine policy produced invalid intent: ${machineValidation.error}`);
    const machineEvent = applyIntent(draft, this.field, "mote", machineValidation.intent, machineChoice.basis);
    events.push(machineEvent);

    const aiView = aiProposalView(draft, this.field);
    const aiSource = aiProposal === undefined ? "DETERMINISTIC_STAND_IN" : "EXTERNAL_PROPOSAL";
    const proposed = aiProposal === undefined ? standInProposal(aiView, this.options.seed)
      : { intent: deepClone(aiProposal), basis: "external_bounded_proposal" };
    const aiValidation = validateIntent(draft, this.field, "lumen", proposed.intent);
    let aiEvent = null;
    const aiDecision = { source: aiSource, status: aiValidation.error ? "REFUSED" : "ACCEPTED",
      reason: aiValidation.error || "VALIDATED_BY_LOCAL_REFEREE", view: aiView, viewDigest: digest(aiView),
      proposal: deepClone(proposed.intent), intent: aiValidation.intent || null, basis: proposed.basis, fallbackUsed: false };
    if (!aiValidation.error) {
      aiEvent = applyIntent(draft, this.field, "lumen", aiValidation.intent, proposed.basis);
      events.push(aiEvent);
    }
    draft.meta.revision += 1;
    draft.meta.cycle += 1;
    updateDerived(draft);
    const failure = validateState(draft, this.field);
    if (failure) throw new Error(`coexistence invariant failed: ${failure}`);
    this.state = draft;
    const receipt = { schema: "axm.stateborn.coexistence-receipt/v1", sequence: this.receipts.length,
      operationId: resolvedOperationId, status: "APPLIED",
      reason: aiDecision.status === "REFUSED" ? `AI_PROPOSAL_REFUSED:${aiDecision.reason}` : "OK",
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest,
      humanIntent: deepClone(humanValidation.intent), humanEventId: humanEvent.eventId,
      machineDecision: { status: "ACCEPTED", view: machineView, viewDigest: digest(machineView),
        noveltyPressure: machineChoice.score, basis: machineChoice.basis, intent: deepClone(machineValidation.intent), eventId: machineEvent.eventId },
      aiDecision, aiEventId: aiEvent?.eventId || null,
      externalProposal: aiSource === "EXTERNAL_PROPOSAL" ? deepClone(aiProposal) : null,
      eventIds: events.map((event) => event.eventId), threadIds: draft.derived.threads.map((thread) => thread.id),
      changedPaths: [...events.map((event) => `actors.${event.actor}`), "world.overrides", "evidence.events", "derived.observer", "derived.threads", "meta.revision", "meta.cycle"] };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt);
    this.operations.set(resolvedOperationId, receipt);
    return deepClone(receipt);
  }

  suggestedHumanIntent(cycle = this.state.meta.cycle) {
    const sequence = [
      { kind: "signal", signal: "open" }, { kind: "move", direction: "east" },
      { kind: "signal", signal: "turn" }, { kind: "wait" }, { kind: "move", direction: "west" },
      { kind: "signal", signal: "pulse" }, { kind: "move", direction: "south" },
      { kind: "signal", signal: "hush" }, { kind: "move", direction: "north" },
    ];
    return deepClone(sequence[(cycle + numberFrom(this.options.seed)) % sequence.length]);
  }
  run(cycles) {
    const results = [];
    for (let index = 0; index < cycles; index += 1) results.push(this.cycle(this.suggestedHumanIntent(), {
      operationId: `run-${this.receipts.length}`, expectedRevision: this.state.meta.revision,
    }));
    return results;
  }
  visibleCells(radius = 7) {
    const actors = Object.values(this.state.actors);
    const center = { x: Math.round(actors.reduce((sum, actor) => sum + actor.position.x, 0) / actors.length),
      y: Math.round(actors.reduce((sum, actor) => sum + actor.position.y, 0) / actors.length) };
    const cells = [];
    for (let y = center.y - radius; y <= center.y + radius; y += 1) for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      const cell = this.field.cell(this.state, x, y);
      if (cell) cells.push(cell);
    }
    return cells;
  }
  stats() {
    return { cycles: this.state.meta.cycle, events: this.state.evidence.events.length,
      threads: this.state.derived.threads.length,
      sharedSites: this.state.derived.threads.filter((thread) => thread.kind === "shared_site").length,
      threeWayMarks: this.state.derived.threads.filter((thread) => thread.kind === "three_way_mark").length,
      logicalNodes: this.options.width * this.options.height + Object.keys(this.state.actors).length,
      ...this.field.stats(this.state), ...deepClone(this.state.derived.observer) };
  }
  verifyReplay() {
    const replay = new CoexistenceWorld(this.options);
    for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
      const options = { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision };
      if (receipt.aiDecision.source === "EXTERNAL_PROPOSAL") options.aiProposal = deepClone(receipt.externalProposal);
      const result = replay.cycle(receipt.humanIntent, options);
      const decisionsMatch = canonicalStringify(result.machineDecision.intent) === canonicalStringify(receipt.machineDecision.intent)
        && canonicalStringify(result.aiDecision.intent) === canonicalStringify(receipt.aiDecision.intent)
        && result.aiDecision.status === receipt.aiDecision.status;
      if (result.afterDigest !== receipt.afterDigest || !decisionsMatch) return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
    }
    return { status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL", cyclesReplayed: replay.state.meta.cycle,
      expected: this.stateDigest, actual: replay.stateDigest };
  }
}

export const coexistenceContracts = {
  authority: {
    human: "chooses one validated world intent",
    machine: "chooses one intent from an outcome-blind novelty view",
    ai: "may propose one bounded intent; a proposal is never canonical authority",
    referee: "validates all intents and alone commits consequences",
  },
  machinePolicy: {
    visible: ["terrain", "phase", "unfamiliar neighbours", "context/action trial counts", "moves since touch"],
    forbidden: ["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"],
  },
  aiSeat: { defaultSource: "DETERMINISTIC_STAND_IN", externalModelConnected: false,
    invalidProposal: "refuse and idle; never replace it with a hidden fallback" },
  threadBoundary: "adventure names are observer projections and require event-id evidence from intersecting roles",
};
