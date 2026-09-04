import { canonicalStringify, deepClone, digest, getPath } from "./engine.js";
import { CURIOSITY_SIGNALS } from "./curiosity-world.js";

export const ALLOWED_EXPORT_PATHS = ["public.displayName", "public.color", "public.position", "public.signalCount"];
export const ALLOWED_RETURN_PATHS = ["accepted.sharedSignals", "accepted.visitedCells"];
const DIRECTIONS = {
  north: { dx: 0, dy: -1 }, east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 }, west: { dx: -1, dy: 0 },
};

function uniqueSorted(values) { return [...new Set(values)].sort(); }
function packetPayload(packet) {
  const payload = deepClone(packet);
  delete payload.packetDigest;
  return payload;
}
function capsulePayload(capsule) {
  const payload = deepClone(capsule);
  delete payload.capsuleDigest;
  return payload;
}
function refusedReceipt(schema, sequence, operationId, reason, beforeRevision, beforeDigest, extra = {}) {
  const receipt = { schema, sequence, operationId, status: "REFUSED", reason,
    beforeRevision, afterRevision: beforeRevision, beforeDigest, afterDigest: beforeDigest, changedPaths: [], ...extra };
  receipt.receiptId = digest(receipt);
  return receipt;
}

export function verifyCapsule(capsule) {
  if (!capsule || capsule.schema !== "axm.stateborn.actor-capsule/v1") return { status: "REFUSED", reason: "CAPSULE_SCHEMA" };
  if (digest(capsulePayload(capsule)) !== capsule.capsuleDigest) return { status: "REFUSED", reason: "CAPSULE_DIGEST" };
  const exportPaths = capsule.consent?.exportPaths || [];
  const returnPaths = capsule.consent?.returnPaths || [];
  if (exportPaths.some((path) => !ALLOWED_EXPORT_PATHS.includes(path))) return { status: "REFUSED", reason: "CAPSULE_EXPORT_SCOPE" };
  if (returnPaths.some((path) => !ALLOWED_RETURN_PATHS.includes(path))) return { status: "REFUSED", reason: "CAPSULE_RETURN_SCOPE" };
  if (Object.keys(capsule.projection || {}).some((path) => !exportPaths.includes(path))) return { status: "REFUSED", reason: "CAPSULE_PROJECTION_SCOPE" };
  return { status: "PASS", reason: "CAPSULE_VALID" };
}

export function verifyReturnPacket(packet) {
  if (!packet || packet.schema !== "axm.stateborn.return-packet/v1") return { status: "REFUSED", reason: "RETURN_SCHEMA" };
  if (digest(packetPayload(packet)) !== packet.packetDigest) return { status: "REFUSED", reason: "RETURN_DIGEST" };
  if ((packet.deltas || []).some((delta) => !ALLOWED_RETURN_PATHS.includes(delta.path) || delta.operation !== "append_unique" || !Array.isArray(delta.values))) {
    return { status: "REFUSED", reason: "RETURN_DELTA_SCOPE" };
  }
  return { status: "PASS", reason: "RETURN_VALID" };
}

export class ActorStateOwner {
  constructor({ seed = "AXM-CAPSULE-SOURCE", ownerId = "source-a", displayName = "Aster", color = "amber", position = { x: 3, y: 3 } } = {}) {
    this.options = { seed, ownerId, displayName, color, position: deepClone(position) };
    this.genesis = {
      schema: "axm.stateborn.actor-source/v1", seed, ownerId,
      meta: { revision: 0 },
      public: { displayName, color, position: deepClone(position), signalCount: 0 },
      accepted: { sharedSignals: [], visitedCells: [] },
      private: { localNote: `${seed}:PRIVATE_NOTE`, recoveryToken: digest(`${seed}:RECOVERY`) },
    };
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
  }

  get stateDigest() { return digest(this.state); }

  issueCapsule({ exportPaths = ALLOWED_EXPORT_PATHS, returnPaths = ALLOWED_RETURN_PATHS, operationId } = {}) {
    const resolvedId = operationId || `issue-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeDigest = this.stateDigest;
    const invalidExport = exportPaths.find((path) => !ALLOWED_EXPORT_PATHS.includes(path));
    const invalidReturn = returnPaths.find((path) => !ALLOWED_RETURN_PATHS.includes(path));
    if (invalidExport || invalidReturn) {
      const refused = refusedReceipt("axm.stateborn.source-receipt/v1", this.receipts.length, resolvedId,
        invalidExport ? `EXPORT_NOT_CONSENTABLE:${invalidExport}` : `RETURN_NOT_CONSENTABLE:${invalidReturn}`,
        this.state.meta.revision, beforeDigest, { kind: "ISSUE_CAPSULE", capsule: null });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }
    const consent = { exportPaths: uniqueSorted(exportPaths), returnPaths: uniqueSorted(returnPaths) };
    const projection = Object.fromEntries(consent.exportPaths.map((path) => [path, deepClone(getPath(this.state, path))]));
    const capsule = {
      schema: "axm.stateborn.actor-capsule/v1", ownerId: this.state.ownerId,
      sourceRevision: this.state.meta.revision, sourceStateDigest: beforeDigest,
      issuedSequence: this.receipts.length, consent, projection,
    };
    capsule.capsuleId = digest({ ownerId: capsule.ownerId, sourceStateDigest: capsule.sourceStateDigest, consent: capsule.consent });
    capsule.capsuleDigest = digest(capsulePayload(capsule));
    const receipt = { schema: "axm.stateborn.source-receipt/v1", sequence: this.receipts.length, operationId: resolvedId,
      kind: "ISSUE_CAPSULE", status: "APPLIED", reason: "CONSENTED_PROJECTION_ONLY",
      beforeRevision: this.state.meta.revision, afterRevision: this.state.meta.revision,
      beforeDigest, afterDigest: beforeDigest, capsule, changedPaths: [] };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt); this.operations.set(resolvedId, receipt); return deepClone(receipt);
  }

  applyReturn(packet, { acceptedPaths = [], operationId, expectedRevision } = {}) {
    const resolvedId = operationId || `return-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    const validity = verifyReturnPacket(packet);
    let reason = validity.status === "PASS" ? null : validity.reason;
    if (!reason && expectedRevision !== undefined && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
    if (!reason && packet.ownerId !== this.state.ownerId) reason = "RETURN_OWNER_MISMATCH";
    if (!reason && packet.baseSourceDigest !== beforeDigest) reason = "RETURN_SOURCE_STALE";
    if (!reason && acceptedPaths.some((path) => !packet.consentReturnPaths.includes(path))) reason = "ACCEPT_PATH_NOT_CONSENTED";
    if (!reason && packet.deltas.some((delta) => !packet.consentReturnPaths.includes(delta.path))) reason = "PACKET_PATH_NOT_CONSENTED";
    if (reason) {
      const refused = refusedReceipt("axm.stateborn.source-receipt/v1", this.receipts.length, resolvedId, reason,
        beforeRevision, beforeDigest, { kind: "APPLY_RETURN", packetDigest: packet?.packetDigest || null, acceptedPaths: deepClone(acceptedPaths) });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }

    const draft = deepClone(this.state);
    const changedPaths = [];
    const accepted = uniqueSorted(acceptedPaths);
    for (const delta of packet.deltas.filter((candidate) => accepted.includes(candidate.path))) {
      const current = getPath(draft, delta.path);
      const next = uniqueSorted([...current, ...delta.values]);
      if (canonicalStringify(current) !== canonicalStringify(next)) {
        const [root, key] = delta.path.split(".");
        draft[root][key] = next;
        changedPaths.push(delta.path);
      }
    }
    if (changedPaths.length) draft.meta.revision += 1;
    this.state = draft;
    const receipt = { schema: "axm.stateborn.source-receipt/v1", sequence: this.receipts.length,
      operationId: resolvedId, kind: "APPLY_RETURN", status: "APPLIED",
      reason: changedPaths.length ? "EXPLICIT_PATH_ACCEPTANCE" : "ACCEPTED_NO_DELTA",
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest,
      packetDigest: packet.packetDigest, acceptedPaths: accepted,
      ignoredPaths: packet.deltas.map((delta) => delta.path).filter((path) => !accepted.includes(path)), changedPaths };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt); this.operations.set(resolvedId, receipt); return deepClone(receipt);
  }
}

function sessionThreads(state) {
  const signals = state.events.filter((event) => event.intent.kind === "signal");
  const groups = new Map();
  for (const event of signals) {
    const key = `${event.cell}:${event.intent.signal}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()].flatMap(([key, events]) => {
    const owners = uniqueSorted(events.map((event) => event.ownerId));
    if (owners.length < 2) return [];
    const [cell, signal] = key.split(":");
    return [{ id: `shared_signal:${key}`, kind: "shared_signal", cell, signal, owners,
      evidence: events.map((event) => event.eventId), basis: "independent capsule namespaces emitted the same signal at one cell" }];
  }).sort((left, right) => left.id.localeCompare(right.id));
}

export class CapsuleSession {
  constructor({ seed = "AXM-CAPSULE-SESSION", width = 7, height = 7 } = {}) {
    this.options = { seed, width, height };
    this.genesis = { schema: "axm.stateborn.capsule-session/v1", seed,
      meta: { revision: 0, sequence: 0, fixture: "EMPTY_SHARED_SESSION" },
      world: { width, height }, projections: {}, events: [], detached: {}, threads: [] };
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
  }

  get stateDigest() { return digest(this.state); }

  compose(capsule, { operationId, expectedRevision } = {}) {
    const resolvedId = operationId || `compose-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    const validity = verifyCapsule(capsule);
    let reason = validity.status === "PASS" ? null : validity.reason;
    if (!reason && expectedRevision !== undefined && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
    const occupied = !reason ? this.state.projections[capsule.ownerId] : null;
    if (!reason && occupied) reason = occupied.capsuleId === capsule.capsuleId ? "CAPSULE_ALREADY_COMPOSED" : "OWNER_NAMESPACE_COLLISION";
    const position = capsule?.projection?.["public.position"];
    if (!reason && (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)
      || position.x < 0 || position.y < 0 || position.x >= this.options.width || position.y >= this.options.height)) reason = "PROJECTION_POSITION";
    if (reason) {
      const refused = refusedReceipt("axm.stateborn.session-receipt/v1", this.receipts.length, resolvedId, reason,
        beforeRevision, beforeDigest, { kind: "COMPOSE", ownerId: capsule?.ownerId || null,
          conflict: reason === "OWNER_NAMESPACE_COLLISION" ? { existingCapsuleId: occupied.capsuleId, proposedCapsuleId: capsule.capsuleId } : null });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }
    const draft = deepClone(this.state);
    draft.projections[capsule.ownerId] = {
      namespace: `capsules.${capsule.ownerId}`, capsuleId: capsule.capsuleId,
      sourceStateDigest: capsule.sourceStateDigest, sourceRevision: capsule.sourceRevision,
      consent: deepClone(capsule.consent), sourceProjection: deepClone(capsule.projection),
      session: { active: true, position: deepClone(position), visitedCells: [`${position.x}_${position.y}`], signals: [] },
    };
    draft.meta.revision += 1; draft.meta.sequence += 1;
    this.state = draft;
    const receipt = { schema: "axm.stateborn.session-receipt/v1", sequence: this.receipts.length, operationId: resolvedId,
      kind: "COMPOSE", status: "APPLIED", reason: "NAMESPACED_PROJECTION",
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest,
      ownerId: capsule.ownerId, capsule: deepClone(capsule), namespace: `capsules.${capsule.ownerId}`,
      changedPaths: [`projections.${capsule.ownerId}`, "meta.revision", "meta.sequence"] };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt); this.operations.set(resolvedId, receipt); return deepClone(receipt);
  }

  act(ownerId, rawIntent, { operationId, expectedRevision } = {}) {
    const resolvedId = operationId || `act-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    const projection = this.state.projections[ownerId];
    let reason = null;
    if (expectedRevision !== undefined && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
    if (!reason && (!projection || !projection.session.active)) reason = "CAPSULE_NOT_ACTIVE";
    let intent = null;
    if (!reason && rawIntent?.kind === "signal" && CURIOSITY_SIGNALS.includes(rawIntent.signal)) intent = { kind: "signal", signal: rawIntent.signal };
    else if (!reason && rawIntent?.kind === "move" && DIRECTIONS[rawIntent.direction]) {
      const direction = DIRECTIONS[rawIntent.direction];
      const to = { x: projection.session.position.x + direction.dx, y: projection.session.position.y + direction.dy };
      if (to.x < 0 || to.y < 0 || to.x >= this.options.width || to.y >= this.options.height) reason = "MOVE_OUT_OF_BOUNDS";
      else intent = { kind: "move", direction: rawIntent.direction, to };
    } else if (!reason) reason = "UNKNOWN_INTENT";
    if (reason) {
      const refused = refusedReceipt("axm.stateborn.session-receipt/v1", this.receipts.length, resolvedId, reason,
        beforeRevision, beforeDigest, { kind: "ACT", ownerId, intent: deepClone(rawIntent) });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }
    const draft = deepClone(this.state);
    const actor = draft.projections[ownerId];
    if (intent.kind === "move") {
      actor.session.position = deepClone(intent.to);
      actor.session.visitedCells = uniqueSorted([...actor.session.visitedCells, `${intent.to.x}_${intent.to.y}`]);
    } else {
      actor.session.signals.push({ cell: `${actor.session.position.x}_${actor.session.position.y}`, signal: intent.signal });
    }
    const event = { schema: "axm.stateborn.capsule-session-event/v1", index: draft.events.length,
      sequence: draft.meta.sequence, ownerId, namespace: actor.namespace,
      cell: `${actor.session.position.x}_${actor.session.position.y}`, intent: deepClone(intent) };
    event.eventId = digest(event);
    draft.events.push(event);
    draft.meta.revision += 1; draft.meta.sequence += 1;
    draft.threads = sessionThreads(draft);
    this.state = draft;
    const receipt = { schema: "axm.stateborn.session-receipt/v1", sequence: this.receipts.length, operationId: resolvedId,
      kind: "ACT", status: "APPLIED", reason: "SESSION_ONLY_DELTA", beforeRevision, afterRevision: draft.meta.revision,
      beforeDigest, afterDigest: this.stateDigest, ownerId, intent, eventId: event.eventId,
      threadIds: draft.threads.map((thread) => thread.id),
      changedPaths: [`projections.${ownerId}.session`, "events", "threads", "meta.revision", "meta.sequence"] };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt); this.operations.set(resolvedId, receipt); return deepClone(receipt);
  }

  proposeReturn(ownerId) {
    const projection = this.state.projections[ownerId];
    if (!projection?.session.active) return { status: "REFUSED", reason: "CAPSULE_NOT_ACTIVE", packet: null };
    const values = {
      "accepted.visitedCells": uniqueSorted(projection.session.visitedCells),
      "accepted.sharedSignals": uniqueSorted(projection.session.signals.map((entry) => `${entry.cell}:${entry.signal}`)),
    };
    const packet = { schema: "axm.stateborn.return-packet/v1", ownerId, capsuleId: projection.capsuleId,
      baseSourceDigest: projection.sourceStateDigest, sessionStateDigest: this.stateDigest,
      consentReturnPaths: deepClone(projection.consent.returnPaths),
      deltas: projection.consent.returnPaths.map((path) => ({ path, operation: "append_unique", values: deepClone(values[path]) })) };
    packet.packetDigest = digest(packetPayload(packet));
    return { status: "PROPOSED", reason: "SOURCE_MUST_ACCEPT_PATHS", packet };
  }

  detach(ownerId, { operationId, expectedRevision } = {}) {
    const resolvedId = operationId || `detach-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    const projection = this.state.projections[ownerId];
    let reason = expectedRevision !== undefined && expectedRevision !== beforeRevision ? "STALE_REVISION" : null;
    if (!reason && (!projection || !projection.session.active)) reason = "CAPSULE_NOT_ACTIVE";
    if (reason) {
      const refused = refusedReceipt("axm.stateborn.session-receipt/v1", this.receipts.length, resolvedId, reason,
        beforeRevision, beforeDigest, { kind: "DETACH", ownerId });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }
    const draft = deepClone(this.state);
    draft.detached[ownerId] = { capsuleId: projection.capsuleId, sourceStateDigest: projection.sourceStateDigest,
      finalSessionDigest: beforeDigest, eventIds: draft.events.filter((event) => event.ownerId === ownerId).map((event) => event.eventId) };
    delete draft.projections[ownerId];
    draft.threads = sessionThreads(draft);
    draft.meta.revision += 1; draft.meta.sequence += 1;
    this.state = draft;
    const receipt = { schema: "axm.stateborn.session-receipt/v1", sequence: this.receipts.length, operationId: resolvedId,
      kind: "DETACH", status: "APPLIED", reason: "REVERSIBLE_SEPARATION", ownerId,
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest,
      changedPaths: [`projections.${ownerId}`, `detached.${ownerId}`, "threads", "meta.revision", "meta.sequence"] };
    receipt.receiptId = digest(receipt);
    this.receipts.push(receipt); this.operations.set(resolvedId, receipt); return deepClone(receipt);
  }

  verifyReplay() {
    const replay = new CapsuleSession(this.options);
    for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
      let result;
      const options = { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision };
      if (receipt.kind === "COMPOSE") result = replay.compose(receipt.capsule, options);
      else if (receipt.kind === "ACT") result = replay.act(receipt.ownerId, receipt.intent, options);
      else result = replay.detach(receipt.ownerId, options);
      if (result.afterDigest !== receipt.afterDigest) return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
    }
    return { status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL", receiptsReplayed: replay.state.meta.revision,
      expected: this.stateDigest, actual: replay.stateDigest };
  }
}

export const capsuleContracts = {
  claim: "a structured state projection can be composed and separated under explicit consent; a human person is not moved",
  exportAllowlist: [...ALLOWED_EXPORT_PATHS], returnAllowlist: [...ALLOWED_RETURN_PATHS],
  authority: {
    source: "owns private state and explicitly accepts return paths",
    session: "owns only namespaced temporary projections and session events",
    returnPacket: "proposal only; cannot mutate its source",
  },
  exclusions: ["network transport", "identity fusion", "automatic writeback", "cryptographic identity proof", "real personal data"],
};
