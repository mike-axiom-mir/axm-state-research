import { canonicalStringify, deepClone, digest } from "./engine.js";

export const LANGUAGE_DIMENSIONS = 3;
export const LANGUAGE_OPS = Object.freeze({ OFFER: 0, PROPOSE: 1, ACCEPT: 2, REFUSE: 3, COMMIT: 4 });
export const LANGUAGE_OUTCOMES = Object.freeze({ OPEN: 0, SOLVED: 1, REFUSED: 2, DEADLOCK: 3 });
export const LANGUAGE_REASONS = Object.freeze({
  OK: 0, PACKET_SCHEMA: 10, PACKET_DIGEST: 11, TRIAL_MISMATCH: 12,
  STALE_SEQUENCE: 13, STALE_STATE: 14, TRIAL_CLOSED: 15, OP_UNKNOWN: 16,
  ACTOR_UNKNOWN: 17, PAYLOAD_SHAPE: 18, HUMAN_LANGUAGE_FIELD: 19,
  VECTOR_SCOPE: 20, OFFER_AUTHORITY: 21, OFFERS_INCOMPLETE: 22,
  PROPOSER_ORDER: 23, PROPOSAL_TARGET: 24, PROPOSAL_AUTHORITY: 25,
  PROPOSAL_MISMATCH: 26, RESPONSE_DUPLICATE: 27, ACCEPT_AUTHORITY: 28,
  ACCEPTS_INCOMPLETE: 29, COMMIT_AUTHORITY: 30, CONSENT_POLICY: 31,
  INSUFFICIENT_OFFER: 32, DEADLOCK_LIMIT: 33,
});

const RAW_FIXTURES = [
  {
    id: "train-complement", split: "training", target: [1, 1, 0],
    actors: {
      a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "TRAIN_A_PRIVATE", token: "train-a-token" } },
      b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "TRAIN_B_PRIVATE", token: "train-b-token" } },
    },
  },
  {
    id: "train-overlap", split: "training", target: [1, 1, 1],
    actors: {
      a: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "OVERLAP_A_PRIVATE", token: "overlap-a-token" } },
      b: { inventory: [0, 1, 1], consentMax: [0, 1, 1], rejectMask: [0, 0, 0], private: { note: "OVERLAP_B_PRIVATE", token: "overlap-b-token" } },
    },
  },
  {
    id: "held-complement", split: "held_out", target: [1, 2, 1],
    actors: {
      a: { inventory: [2, 0, 1], consentMax: [1, 0, 1], rejectMask: [0, 0, 0], private: { note: "HELD_A_PRIVATE", token: "held-a-token" } },
      b: { inventory: [0, 2, 0], consentMax: [0, 2, 0], rejectMask: [0, 0, 0], private: { note: "HELD_B_PRIVATE", token: "held-b-token" } },
    },
  },
  {
    id: "held-ambiguous", split: "held_out", target: [1, 1, 0],
    actors: {
      a: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "AMBIG_A_PRIVATE", token: "ambig-a-token" } },
      b: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "AMBIG_B_PRIVATE", token: "ambig-b-token" } },
    },
  },
  {
    id: "held-refusal", split: "held_out", target: [1, 1, 0],
    actors: {
      a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "REFUSE_A_PRIVATE", token: "refuse-a-token" } },
      b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 1, 0], private: { note: "REFUSE_B_PRIVATE", token: "refuse-b-token" } },
    },
  },
  {
    id: "held-insufficient", split: "held_out", target: [1, 1, 1],
    actors: {
      a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "SHORT_A_PRIVATE", token: "short-a-token" } },
      b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "SHORT_B_PRIVATE", token: "short-b-token" } },
    },
  },
  {
    id: "held-consent-gap", split: "held_out", target: [1, 1, 0],
    actors: {
      a: { inventory: [2, 0, 0], consentMax: [0, 0, 0], rejectMask: [0, 0, 0], private: { note: "GAP_A_PRIVATE", token: "gap-a-token" } },
      b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "GAP_B_PRIVATE", token: "gap-b-token" } },
    },
  },
];

export const STATE_LANGUAGE_FIXTURES = deepClone(RAW_FIXTURES);
export const STATE_LANGUAGE_FIXTURE_DIGEST = digest(STATE_LANGUAGE_FIXTURES);
export const FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST = "4a70fa25ce93be23e16dff144eb28a201e437589cba69b007c387c12c0c13b1f";

const ACTOR_IDS = ["a", "b"];
const encoder = new TextEncoder();
const isInt = (value) => Number.isInteger(value) && value >= 0;
const isVector = (value) => Array.isArray(value) && value.length === LANGUAGE_DIMENSIONS && value.every(isInt);
const vectorMin = (left, right) => left.map((value, index) => Math.min(value, right[index]));
const vectorLeq = (left, right) => left.every((value, index) => value <= right[index]);
const vectorSum = (vectors) => vectors.reduce((sum, vector) => sum.map((value, index) => value + vector[index]), [0, 0, 0]);
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && canonicalStringify(Object.keys(value).sort()) === canonicalStringify([...keys].sort());
const isHexDigest = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

function packetPayload(packet) {
  const body = deepClone(packet);
  delete body.packetDigest;
  return body;
}

function payloadIsStateOnly(value) {
  if (value === null || typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value === "string") return isHexDigest(value);
  if (Array.isArray(value)) return value.every(payloadIsStateOnly);
  if (typeof value === "object") return Object.values(value).every(payloadIsStateOnly);
  return false;
}

function fixtureById(id) {
  const fixture = STATE_LANGUAGE_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`UNKNOWN_LANGUAGE_FIXTURE:${id}`);
  return deepClone(fixture);
}

function enumerateContributions(target, offers) {
  let candidates = [{ a: [], b: [] }];
  for (let index = 0; index < LANGUAGE_DIMENSIONS; index += 1) {
    const allocations = [];
    for (let a = 0; a <= Math.min(target[index], offers.a[index]); a += 1) {
      const b = target[index] - a;
      if (b >= 0 && b <= offers.b[index]) allocations.push({ a, b });
    }
    if (!allocations.length) return [];
    candidates = candidates.flatMap((candidate) => allocations.map((allocation) => ({
      a: [...candidate.a, allocation.a], b: [...candidate.b, allocation.b],
    })));
  }
  return candidates.sort((left, right) => canonicalStringify(left).localeCompare(canonicalStringify(right)));
}

function receipt({ index, operationId, status, reasonCode, beforeRevision, afterRevision, beforeDigest, afterDigest, packet = null, kind = "PACKET" }) {
  const value = { schema: "axm.stateborn.state-language-receipt/v1", index, operationId, kind,
    status, reasonCode, beforeRevision, afterRevision, beforeDigest, afterDigest,
    packet: packet ? deepClone(packet) : null };
  value.receiptId = digest(value);
  return value;
}

export class StateLanguageTrial {
  constructor(fixtureOrId = "train-complement") {
    this.fixture = typeof fixtureOrId === "string" ? fixtureById(fixtureOrId) : deepClone(fixtureOrId);
    this.trialId = digest({ schema: "axm.stateborn.state-language-trial/v1", fixture: this.fixture });
    this.seats = Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, deepClone(this.fixture.actors[actorId])]));
    this.options = { fixture: deepClone(this.fixture) };
    this.genesis = {
      schema: "axm.stateborn.state-language-session/v1", trialId: this.trialId,
      meta: { revision: 0, sequence: 0, packetLimit: 8 }, task: { target: deepClone(this.fixture.target) },
      actors: Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, {
        inventory: deepClone(this.seats[actorId].inventory), consentMax: deepClone(this.seats[actorId].consentMax),
      }])),
      channel: { offers: {}, proposal: null, responses: {} }, messages: [], joint: [0, 0, 0],
      observer: { outcomeCode: LANGUAGE_OUTCOMES.OPEN, reasonCode: LANGUAGE_REASONS.OK, ambiguityCount: 0 },
    };
    this.state = deepClone(this.genesis);
    this.receipts = [];
    this.operations = new Map();
  }

  get stateDigest() { return digest(this.state); }
  get sourceDigests() { return Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, digest(this.seats[actorId])])); }

  policyView(actorId) {
    if (!ACTOR_IDS.includes(actorId)) throw new Error("ACTOR_UNKNOWN");
    return {
      schema: "axm.stateborn.state-language-view/v1", trialId: this.trialId,
      actorCode: ACTOR_IDS.indexOf(actorId), target: deepClone(this.state.task.target),
      own: {
        inventory: deepClone(this.state.actors[actorId].inventory),
        consentMax: deepClone(this.state.actors[actorId].consentMax),
        rejectMask: deepClone(this.seats[actorId].rejectMask),
      },
      observed: {
        offers: deepClone(this.state.channel.offers), proposal: deepClone(this.state.channel.proposal),
        responses: deepClone(this.state.channel.responses), packetCount: this.state.messages.length,
      },
    };
  }

  makePacket(from, op, payload, { to = -1 } = {}) {
    const packet = {
      schema: "axm.stateborn.state-language-packet/v1", trialId: this.trialId,
      sequence: this.state.meta.sequence, from, to, op, payload: deepClone(payload), priorStateDigest: this.stateDigest,
    };
    packet.packetDigest = digest(packetPayload(packet));
    return packet;
  }

  #reason(packet) {
    if (!packet || packet.schema !== "axm.stateborn.state-language-packet/v1") return LANGUAGE_REASONS.PACKET_SCHEMA;
    if (digest(packetPayload(packet)) !== packet.packetDigest) return LANGUAGE_REASONS.PACKET_DIGEST;
    if (packet.trialId !== this.trialId) return LANGUAGE_REASONS.TRIAL_MISMATCH;
    if (packet.sequence !== this.state.meta.sequence) return LANGUAGE_REASONS.STALE_SEQUENCE;
    if (packet.priorStateDigest !== this.stateDigest) return LANGUAGE_REASONS.STALE_STATE;
    if (this.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return LANGUAGE_REASONS.TRIAL_CLOSED;
    if (!Object.values(LANGUAGE_OPS).includes(packet.op)) return LANGUAGE_REASONS.OP_UNKNOWN;
    if (!payloadIsStateOnly(packet.payload)) return LANGUAGE_REASONS.HUMAN_LANGUAGE_FIELD;
    if (packet.op !== LANGUAGE_OPS.COMMIT && !ACTOR_IDS.includes(packet.from)) return LANGUAGE_REASONS.ACTOR_UNKNOWN;

    if (packet.op === LANGUAGE_OPS.OFFER) {
      if (!exactKeys(packet.payload, ["v"]) || !isVector(packet.payload.v)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      const actor = this.state.actors[packet.from];
      if (!vectorLeq(packet.payload.v, actor.inventory) || !vectorLeq(packet.payload.v, actor.consentMax)) return LANGUAGE_REASONS.OFFER_AUTHORITY;
    } else if (packet.op === LANGUAGE_OPS.PROPOSE) {
      if (!exactKeys(packet.payload, ["c", "n", "o"]) || !exactKeys(packet.payload.c, ACTOR_IDS)
        || !ACTOR_IDS.every((id) => isVector(packet.payload.c[id])) || !isInt(packet.payload.n)
        || !Array.isArray(packet.payload.o) || packet.payload.o.length !== ACTOR_IDS.length || !packet.payload.o.every(isHexDigest)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      if (!ACTOR_IDS.every((id) => this.state.channel.offers[id])) return LANGUAGE_REASONS.OFFERS_INCOMPLETE;
      if (packet.from !== [...ACTOR_IDS].sort()[0]) return LANGUAGE_REASONS.PROPOSER_ORDER;
      const currentOfferDigests = ACTOR_IDS.map((id) => this.state.channel.offers[id].packetDigest).sort();
      if (canonicalStringify(packet.payload.o) !== canonicalStringify(currentOfferDigests)) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (canonicalStringify(vectorSum(ACTOR_IDS.map((id) => packet.payload.c[id]))) !== canonicalStringify(this.state.task.target)) return LANGUAGE_REASONS.PROPOSAL_TARGET;
      if (!ACTOR_IDS.every((id) => vectorLeq(packet.payload.c[id], this.state.channel.offers[id].payload.v))) return LANGUAGE_REASONS.PROPOSAL_AUTHORITY;
    } else if (packet.op === LANGUAGE_OPS.ACCEPT || packet.op === LANGUAGE_OPS.REFUSE) {
      if (!exactKeys(packet.payload, ["p", "r"]) || !isHexDigest(packet.payload.p) || !isInt(packet.payload.r)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      if (!this.state.channel.proposal || packet.payload.p !== this.state.channel.proposal.packetDigest) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (this.state.channel.responses[packet.from]) return LANGUAGE_REASONS.RESPONSE_DUPLICATE;
      if (packet.op === LANGUAGE_OPS.ACCEPT) {
        if (packet.payload.r !== LANGUAGE_REASONS.OK) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
        const contribution = this.state.channel.proposal.payload.c[packet.from];
        const view = this.policyView(packet.from);
        if (!vectorLeq(contribution, view.own.inventory) || !vectorLeq(contribution, view.own.consentMax)
          || contribution.some((value, index) => value > 0 && view.own.rejectMask[index] > 0)) return LANGUAGE_REASONS.ACCEPT_AUTHORITY;
      } else if (packet.payload.r === LANGUAGE_REASONS.OK) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
    } else if (packet.op === LANGUAGE_OPS.COMMIT) {
      if (packet.from !== -1 || !exactKeys(packet.payload, ["a", "p"]) || !isHexDigest(packet.payload.p)
        || !Array.isArray(packet.payload.a) || packet.payload.a.length !== ACTOR_IDS.length || !packet.payload.a.every(isHexDigest)) return LANGUAGE_REASONS.COMMIT_AUTHORITY;
      if (!this.state.channel.proposal || packet.payload.p !== this.state.channel.proposal.packetDigest) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (!ACTOR_IDS.every((id) => this.state.channel.responses[id]?.op === LANGUAGE_OPS.ACCEPT
        && this.state.channel.responses[id].payload.p === packet.payload.p)) return LANGUAGE_REASONS.ACCEPTS_INCOMPLETE;
      const acceptDigests = ACTOR_IDS.map((id) => this.state.channel.responses[id].packetDigest).sort();
      if (canonicalStringify(packet.payload.a) !== canonicalStringify(acceptDigests)) return LANGUAGE_REASONS.ACCEPTS_INCOMPLETE;
    }
    return LANGUAGE_REASONS.OK;
  }

  applyPacket(packet, { operationId } = {}) {
    const resolvedId = operationId || `packet-${this.receipts.length}`;
    if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    const reasonCode = this.#reason(packet);
    if (reasonCode !== LANGUAGE_REASONS.OK) {
      const refused = receipt({ index: this.receipts.length, operationId: resolvedId, status: "REFUSED", reasonCode,
        beforeRevision, afterRevision: beforeRevision, beforeDigest, afterDigest: beforeDigest, packet });
      this.receipts.push(refused); this.operations.set(resolvedId, refused); return deepClone(refused);
    }

    const draft = deepClone(this.state);
    draft.messages.push(deepClone(packet));
    if (packet.op === LANGUAGE_OPS.OFFER) draft.channel.offers[packet.from] = deepClone(packet);
    if (packet.op === LANGUAGE_OPS.PROPOSE) {
      draft.channel.proposal = deepClone(packet);
      draft.observer.ambiguityCount = Math.max(0, packet.payload.n - 1);
    }
    if (packet.op === LANGUAGE_OPS.ACCEPT || packet.op === LANGUAGE_OPS.REFUSE) {
      draft.channel.responses[packet.from] = deepClone(packet);
      if (packet.op === LANGUAGE_OPS.REFUSE) {
        draft.observer.outcomeCode = LANGUAGE_OUTCOMES.REFUSED;
        draft.observer.reasonCode = packet.payload.r;
      }
    }
    if (packet.op === LANGUAGE_OPS.COMMIT) {
      draft.joint = deepClone(draft.task.target);
      draft.observer.outcomeCode = LANGUAGE_OUTCOMES.SOLVED;
      draft.observer.reasonCode = LANGUAGE_REASONS.OK;
    }
    draft.meta.revision += 1;
    draft.meta.sequence += 1;
    this.state = draft;
    const applied = receipt({ index: this.receipts.length, operationId: resolvedId, status: "APPLIED", reasonCode: LANGUAGE_REASONS.OK,
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest, packet });
    this.receipts.push(applied); this.operations.set(resolvedId, applied); return deepClone(applied);
  }

  emitOffer(actorId) {
    return this.applyPacket(this.prepareOffer(actorId), { operationId: `offer-${actorId}` });
  }

  prepareOffer(actorId) {
    const view = this.policyView(actorId);
    return this.makePacket(actorId, LANGUAGE_OPS.OFFER, { v: vectorMin(view.own.inventory, view.own.consentMax) });
  }

  emitProposal() {
    const prepared = this.prepareProposal();
    return prepared.packet ? this.applyPacket(prepared.packet, { operationId: "proposal" }) : prepared;
  }

  prepareProposal() {
    if (!ACTOR_IDS.every((id) => this.state.channel.offers[id])) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.OFFERS_INCOMPLETE };
    const offers = Object.fromEntries(ACTOR_IDS.map((id) => [id, this.state.channel.offers[id].payload.v]));
    const candidates = enumerateContributions(this.state.task.target, offers);
    if (!candidates.length) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.INSUFFICIENT_OFFER };
    const payload = { c: candidates[0], n: candidates.length,
      o: ACTOR_IDS.map((id) => this.state.channel.offers[id].packetDigest).sort() };
    return { status: "READY", reasonCode: LANGUAGE_REASONS.OK, packet: this.makePacket(ACTOR_IDS[0], LANGUAGE_OPS.PROPOSE, payload) };
  }

  emitResponse(actorId) {
    const prepared = this.prepareResponse(actorId);
    return prepared.packet ? this.applyPacket(prepared.packet, { operationId: `response-${actorId}` }) : prepared;
  }

  prepareResponse(actorId) {
    const proposal = this.state.channel.proposal;
    if (!proposal) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.PROPOSAL_MISMATCH };
    const contribution = proposal.payload.c[actorId];
    const rejects = contribution.some((value, index) => value > 0 && this.seats[actorId].rejectMask[index] > 0);
    const op = rejects ? LANGUAGE_OPS.REFUSE : LANGUAGE_OPS.ACCEPT;
    const reasonCode = rejects ? LANGUAGE_REASONS.CONSENT_POLICY : LANGUAGE_REASONS.OK;
    return { status: "READY", reasonCode, packet: this.makePacket(actorId, op, { p: proposal.packetDigest, r: reasonCode }) };
  }

  emitCommit() {
    return this.applyPacket(this.prepareCommit(), { operationId: "commit" });
  }

  prepareCommit() {
    const proposal = this.state.channel.proposal;
    const acceptDigests = ACTOR_IDS.map((id) => this.state.channel.responses[id]?.packetDigest).filter(Boolean).sort();
    return this.makePacket(-1, LANGUAGE_OPS.COMMIT, { p: proposal?.packetDigest || digest(null), a: acceptDigests });
  }

  closeDeadlock({ operationId = "deadlock" } = {}) {
    if (this.operations.has(operationId)) return { ...deepClone(this.operations.get(operationId)), duplicate: true };
    const beforeRevision = this.state.meta.revision;
    const beforeDigest = this.stateDigest;
    if (this.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) {
      const refused = receipt({ index: this.receipts.length, operationId, status: "REFUSED", reasonCode: LANGUAGE_REASONS.TRIAL_CLOSED,
        beforeRevision, afterRevision: beforeRevision, beforeDigest, afterDigest: beforeDigest, kind: "CLOSE" });
      this.receipts.push(refused); this.operations.set(operationId, refused); return deepClone(refused);
    }
    const draft = deepClone(this.state);
    draft.observer.outcomeCode = LANGUAGE_OUTCOMES.DEADLOCK;
    draft.observer.reasonCode = LANGUAGE_REASONS.DEADLOCK_LIMIT;
    draft.meta.revision += 1;
    this.state = draft;
    const applied = receipt({ index: this.receipts.length, operationId, status: "APPLIED", reasonCode: LANGUAGE_REASONS.DEADLOCK_LIMIT,
      beforeRevision, afterRevision: draft.meta.revision, beforeDigest, afterDigest: this.stateDigest, kind: "CLOSE" });
    this.receipts.push(applied); this.operations.set(operationId, applied); return deepClone(applied);
  }

  runProtocol({ order = ACTOR_IDS } = {}) {
    const normalizedOrder = [...order];
    for (const actorId of normalizedOrder) this.emitOffer(actorId);
    const proposal = this.emitProposal();
    if (proposal.status !== "APPLIED") { this.closeDeadlock(); return this.summary(); }
    for (const actorId of normalizedOrder) {
      this.emitResponse(actorId);
      if (this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.REFUSED) return this.summary();
    }
    this.emitCommit();
    if (this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) this.closeDeadlock();
    return this.summary();
  }

  normalizedOutcomeDigest() {
    const proposal = this.state.channel.proposal;
    const responses = this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.SOLVED
      ? Object.fromEntries(ACTOR_IDS.map((id) => [id, this.state.channel.responses[id]?.op ?? null]))
      : this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.REFUSED
        ? ACTOR_IDS.filter((id) => this.state.channel.responses[id]?.op === LANGUAGE_OPS.REFUSE)
        : [];
    return digest({
      trialId: this.trialId, target: this.state.task.target, joint: this.state.joint,
      outcomeCode: this.state.observer.outcomeCode, reasonCode: this.state.observer.reasonCode,
      ambiguityCount: this.state.observer.ambiguityCount,
      contribution: proposal?.payload.c || null,
      responses,
    });
  }

  summary() {
    const privateValues = ACTOR_IDS.flatMap((id) => Object.values(this.seats[id].private));
    const serialized = canonicalStringify(this.state.messages);
    const commits = this.state.messages.filter((packet) => packet.op === LANGUAGE_OPS.COMMIT);
    const acceptedDeltaProvenance = commits.every((packet) => packet.payload.a.length === ACTOR_IDS.length
      && packet.payload.a.every((value) => ACTOR_IDS.some((id) => this.state.channel.responses[id]?.packetDigest === value
        && this.state.channel.responses[id].op === LANGUAGE_OPS.ACCEPT)));
    return {
      fixtureId: this.fixture.id, split: this.fixture.split, outcomeCode: this.state.observer.outcomeCode,
      reasonCode: this.state.observer.reasonCode, messages: this.state.messages.length,
      bytes: this.state.messages.reduce((sum, packet) => sum + encoder.encode(canonicalStringify(packet)).length, 0),
      ambiguityCount: this.state.observer.ambiguityCount,
      privateLeakage: privateValues.filter((value) => serialized.includes(value)).length,
      humanLanguagePayloads: this.state.messages.filter((packet) => !payloadIsStateOnly(packet.payload)).length,
      acceptedDeltaProvenance, stateDigest: this.stateDigest, normalizedOutcomeDigest: this.normalizedOutcomeDigest(),
    };
  }

  verifyReplay() {
    const replay = new StateLanguageTrial(this.fixture);
    for (const expected of this.receipts) {
      const actual = expected.kind === "CLOSE"
        ? replay.closeDeadlock({ operationId: expected.operationId })
        : replay.applyPacket(expected.packet, { operationId: expected.operationId });
      if (actual.receiptId !== expected.receiptId) return { status: "FAIL", at: expected.index, expected: expected.receiptId, actual: actual.receiptId };
    }
    return { status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
      receiptsReplayed: replay.receipts.length, expected: this.stateDigest, actual: replay.stateDigest };
  }
}

export function directStateBaseline(fixtureOrId) {
  const trial = new StateLanguageTrial(fixtureOrId);
  const offers = Object.fromEntries(ACTOR_IDS.map((id) => [id, vectorMin(trial.seats[id].inventory, trial.seats[id].consentMax)]));
  const candidates = enumerateContributions(trial.fixture.target, offers);
  if (!candidates.length) return { outcomeCode: LANGUAGE_OUTCOMES.DEADLOCK, evaluations: 1 };
  const selected = candidates[0];
  const refused = ACTOR_IDS.some((id) => selected[id].some((value, index) => value > 0 && trial.seats[id].rejectMask[index] > 0));
  return { outcomeCode: refused ? LANGUAGE_OUTCOMES.REFUSED : LANGUAGE_OUTCOMES.SOLVED,
    evaluations: 1, ambiguityCount: Math.max(0, candidates.length - 1), contribution: selected };
}

export function stateLanguageGate(fixtures = STATE_LANGUAGE_FIXTURES.filter((fixture) => fixture.split === "held_out")) {
  const runs = fixtures.map((fixture) => {
    const trial = new StateLanguageTrial(fixture);
    const sourceBefore = trial.sourceDigests;
    const result = trial.runProtocol();
    const reverse = new StateLanguageTrial(fixture);
    const reversed = reverse.runProtocol({ order: ["b", "a"] });
    return { ...result, baselineOutcomeCode: directStateBaseline(fixture).outcomeCode,
      sourceUnchanged: canonicalStringify(sourceBefore) === canonicalStringify(trial.sourceDigests),
      replay: trial.verifyReplay().status,
      reverseReplay: reverse.verifyReplay().status,
      orderNormalized: result.normalizedOutcomeDigest === reversed.normalizedOutcomeDigest };
  });
  return {
    schema: "axm.stateborn.state-language-gate/v1", fixtureDigest: STATE_LANGUAGE_FIXTURE_DIGEST,
    frozenFixtureDigest: FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST,
    freezeValid: STATE_LANGUAGE_FIXTURE_DIGEST === FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST,
    heldOutRuns: runs.length,
    solved: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED).length,
    refused: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.REFUSED).length,
    deadlocked: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK).length,
    allPrivateClean: runs.every((run) => run.privateLeakage === 0),
    allPayloadsStateOnly: runs.every((run) => run.humanLanguagePayloads === 0),
    allAppliedDeltasAccepted: runs.every((run) => run.acceptedDeltaProvenance),
    allSourcesUnchanged: runs.every((run) => run.sourceUnchanged),
    allReplay: runs.every((run) => run.replay === "PASS" && run.reverseReplay === "PASS"),
    allOrderNormalized: runs.every((run) => run.orderNormalized),
    baselineAgreement: runs.every((run) => run.outcomeCode === run.baselineOutcomeCode), runs,
  };
}

export const stateLanguageContracts = {
  claim: "bounded deterministic actors can coordinate through typed state packets without a natural-language payload channel",
  packetOps: deepClone(LANGUAGE_OPS), dimensions: LANGUAGE_DIMENSIONS,
  authority: { actor: "offer, propose, accept, or refuse within its own public consent vector", referee: "commit only after two exact proposal acceptances" },
  exclusions: ["private machine language", "subjective understanding", "general communication", "network transport", "secure identity", "production multiplayer"],
};
