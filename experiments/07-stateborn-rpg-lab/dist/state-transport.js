import { canonicalStringify, deepClone, digest } from "./engine.js";
import {
  LANGUAGE_OUTCOMES, LANGUAGE_REASONS, StateLanguageTrial, directStateBaseline,
} from "./state-language.js";

export const TRANSPORT_FAULTS = Object.freeze({
  PASS: "PASS", DROP: "DROP", DUPLICATE: "DUPLICATE", DELAY: "DELAY",
  EXPIRE: "EXPIRE", CORRUPT: "CORRUPT",
});

const PASS = Object.freeze({ kind: TRANSPORT_FAULTS.PASS });
const RAW_TRANSPORT_FIXTURES = [
  { id: "train-clean", split: "training", languageFixtureId: "train-complement", expectedOutcomeCode: 1 },
  { id: "train-drop", split: "training", languageFixtureId: "train-complement", expectedOutcomeCode: 1,
    faults: { "offer-a": ["DROP", "PASS"] } },
  { id: "held-drop-retry", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    faults: { "offer-a": ["DROP", "PASS"] } },
  { id: "held-duplicate", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    faults: { proposal: ["DUPLICATE"] } },
  { id: "held-delay", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    faults: { "offer-b": [{ kind: "DELAY", delay: 3 }] } },
  { id: "held-reorder-stale", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    parallelOffers: true, faults: { "offer-a": [{ kind: "DELAY", delay: 2 }, "PASS"], "offer-b": ["PASS"] } },
  { id: "held-disconnect-recover", split: "held_out", languageFixtureId: "held-ambiguous", expectedOutcomeCode: 1,
    disconnects: [{ start: 1, end: 4 }] },
  { id: "held-expiry-retry", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    faults: { "response-b": [{ kind: "EXPIRE", delay: 3, ttl: 1 }, "PASS"] } },
  { id: "held-corrupt-retry", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 1,
    faults: { proposal: ["CORRUPT", "PASS"] } },
  { id: "held-consent-refusal", split: "held_out", languageFixtureId: "held-refusal", expectedOutcomeCode: 2,
    faults: { "offer-a": ["DUPLICATE"] } },
  { id: "held-insufficient", split: "held_out", languageFixtureId: "held-insufficient", expectedOutcomeCode: 3 },
  { id: "held-loss-exhaustion", split: "held_out", languageFixtureId: "held-complement", expectedOutcomeCode: 3,
    maxAttempts: 3, faults: { "offer-a": ["DROP", "DROP", "DROP"] } },
];

export const STATE_TRANSPORT_FIXTURES = deepClone(RAW_TRANSPORT_FIXTURES);
export const STATE_TRANSPORT_FIXTURE_DIGEST = digest(STATE_TRANSPORT_FIXTURES);
export const FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST = "937ea582ce4576bdff15db1afebbece7c9f11e2b138860d66cfcbc381f948079";

const encoder = new TextEncoder();
const normalizeFault = (fault) => typeof fault === "string" ? { kind: fault } : deepClone(fault || PASS);
const bytesOf = (value) => encoder.encode(canonicalStringify(value)).length;

function fixtureById(id) {
  const fixture = STATE_TRANSPORT_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`UNKNOWN_TRANSPORT_FIXTURE:${id}`);
  return deepClone(fixture);
}

function eventRecord(index, tick, type, data = {}) {
  const event = { index, tick, type, ...deepClone(data) };
  event.eventId = digest(event);
  return event;
}

export class HostileTransportTrial {
  constructor(fixtureOrId = "train-clean") {
    this.fixture = typeof fixtureOrId === "string" ? fixtureById(fixtureOrId) : deepClone(fixtureOrId);
    this.engine = new StateLanguageTrial(this.fixture.languageFixtureId);
    this.initialSourceDigests = deepClone(this.engine.sourceDigests);
    this.tick = 0;
    this.online = true;
    this.queue = [];
    this.ledger = [];
    this.attempts = {};
    this.deliveredDigests = new Set();
    this.sendIndex = 0;
    this.maxDeliveredSendIndex = -1;
    this.latestCheckpoint = null;
    this.terminalReason = null;
    this.maxAttempts = this.fixture.maxAttempts ?? 3;
    this.maxTicks = this.fixture.maxTicks ?? 48;
    this.defaultTtl = this.fixture.defaultTtl ?? 6;
    this.#checkpoint();
  }

  get outcomeCode() { return this.engine.state.observer.outcomeCode; }
  get closed() { return this.outcomeCode !== LANGUAGE_OUTCOMES.OPEN; }

  #record(type, data = {}) {
    const event = eventRecord(this.ledger.length, this.tick, type, data);
    this.ledger.push(event);
    return event;
  }

  #checkpoint() {
    const value = {
      schema: "axm.stateborn.transport-checkpoint/v1", fixtureId: this.fixture.id,
      engineStateDigest: this.engine.stateDigest,
      engineReceiptIds: this.engine.receipts.map((receipt) => receipt.receiptId),
      deliveredDigests: [...this.deliveredDigests].sort(), sourceDigests: this.engine.sourceDigests,
    };
    value.checkpointDigest = digest(value);
    this.latestCheckpoint = deepClone(value);
    return value;
  }

  #onlineAt(tick) {
    return !(this.fixture.disconnects || []).some((window) => tick >= window.start && tick < window.end);
  }

  #recover() {
    const checkpoint = deepClone(this.latestCheckpoint);
    const sealed = checkpoint.checkpointDigest;
    delete checkpoint.checkpointDigest;
    if (digest(checkpoint) !== sealed) {
      this.terminalReason = "CHECKPOINT_DIGEST";
      this.engine.closeDeadlock({ operationId: `transport-checkpoint-fail-${this.tick}` });
      this.#record("RECOVERY_FAIL", { reason: this.terminalReason });
      return false;
    }
    const recovered = new StateLanguageTrial(this.fixture.languageFixtureId);
    for (const expected of this.engine.receipts) {
      const actual = expected.kind === "CLOSE"
        ? recovered.closeDeadlock({ operationId: expected.operationId })
        : recovered.applyPacket(expected.packet, { operationId: expected.operationId });
      if (actual.receiptId !== expected.receiptId) {
        this.terminalReason = "CHECKPOINT_REPLAY";
        this.engine.closeDeadlock({ operationId: `transport-replay-fail-${this.tick}` });
        this.#record("RECOVERY_FAIL", { reason: this.terminalReason, at: expected.index });
        return false;
      }
    }
    if (recovered.stateDigest !== this.engine.stateDigest
      || canonicalStringify(recovered.sourceDigests) !== canonicalStringify(checkpoint.sourceDigests)) {
      this.terminalReason = "CHECKPOINT_STATE";
      this.engine.closeDeadlock({ operationId: `transport-state-fail-${this.tick}` });
      this.#record("RECOVERY_FAIL", { reason: this.terminalReason });
      return false;
    }
    this.engine = recovered;
    this.deliveredDigests = new Set(checkpoint.deliveredDigests);
    this.#record("RECOVERY_PASS", { checkpointDigest: sealed, receipts: recovered.receipts.length });
    return true;
  }

  #faultFor(logicalKey, attempt) {
    const faults = this.fixture.faults?.[logicalKey] || [];
    return normalizeFault(faults[attempt - 1] || PASS);
  }

  #pending(logicalKey) {
    return this.queue.some((envelope) => envelope.logicalKey === logicalKey && envelope.status === "QUEUED");
  }

  #prepare(logicalKey) {
    if (logicalKey === "offer-a") return { status: "READY", packet: this.engine.prepareOffer("a") };
    if (logicalKey === "offer-b") return { status: "READY", packet: this.engine.prepareOffer("b") };
    if (logicalKey === "proposal") return this.engine.prepareProposal();
    if (logicalKey === "response-a") return this.engine.prepareResponse("a");
    if (logicalKey === "response-b") return this.engine.prepareResponse("b");
    if (logicalKey === "commit") return { status: "READY", packet: this.engine.prepareCommit() };
    throw new Error(`UNKNOWN_LOGICAL_KEY:${logicalKey}`);
  }

  #enqueue(logicalKey) {
    const attempt = (this.attempts[logicalKey] || 0) + 1;
    this.attempts[logicalKey] = attempt;
    const prepared = this.#prepare(logicalKey);
    if (!prepared.packet) {
      if (prepared.reasonCode === LANGUAGE_REASONS.INSUFFICIENT_OFFER) {
        this.terminalReason = "STATE_INSUFFICIENT";
        const result = this.engine.closeDeadlock({ operationId: `transport-state-deadlock-${this.tick}` });
        this.#record("LOCAL_DEADLOCK", { logicalKey, reasonCode: prepared.reasonCode, receiptId: result.receiptId });
        this.#checkpoint();
      }
      return null;
    }
    const fault = this.#faultFor(logicalKey, attempt);
    const delay = fault.delay ?? 0;
    const ttl = fault.ttl ?? this.defaultTtl;
    const packet = deepClone(prepared.packet);
    if (fault.kind === TRANSPORT_FAULTS.CORRUPT) packet.payload = { ...packet.payload, x: 1 };
    const envelope = {
      schema: "axm.stateborn.transport-envelope/v1", logicalKey, attempt,
      sendIndex: this.sendIndex, sentTick: this.tick, deliverTick: this.tick + delay,
      expiresTick: this.tick + ttl, copies: fault.kind === TRANSPORT_FAULTS.DUPLICATE ? 2 : 1,
      faultKind: fault.kind, packet, status: "QUEUED",
    };
    envelope.envelopeId = digest(envelope);
    this.sendIndex += 1;
    this.#record("SEND", { envelopeId: envelope.envelopeId, logicalKey, attempt,
      packetDigest: packet.packetDigest, faultKind: fault.kind, bytes: bytesOf(packet) * envelope.copies });
    if (fault.kind === TRANSPORT_FAULTS.DROP) {
      envelope.status = "DROPPED";
      this.#record("DROP", { envelopeId: envelope.envelopeId, logicalKey, attempt,
        engineDigestBefore: this.engine.stateDigest, engineDigestAfter: this.engine.stateDigest });
    } else {
      this.queue.push(envelope);
    }
    return envelope;
  }

  #requiredKeys() {
    const channel = this.engine.state.channel;
    if (!channel.offers.a || !channel.offers.b) {
      const missing = ["a", "b"].filter((id) => !channel.offers[id]).map((id) => `offer-${id}`);
      return this.fixture.parallelOffers ? missing : missing.slice(0, 1);
    }
    if (!channel.proposal) return ["proposal"];
    if (!channel.responses.a) return ["response-a"];
    if (!channel.responses.b) return ["response-b"];
    return ["commit"];
  }

  #plan() {
    for (const logicalKey of this.#requiredKeys()) {
      if (this.#pending(logicalKey)) continue;
      if ((this.attempts[logicalKey] || 0) >= this.maxAttempts) {
        this.terminalReason = "TRANSPORT_ATTEMPTS_EXHAUSTED";
        const result = this.engine.closeDeadlock({ operationId: `transport-exhausted-${logicalKey}` });
        this.#record("ATTEMPTS_EXHAUSTED", { logicalKey, attempts: this.attempts[logicalKey], receiptId: result.receiptId });
        this.#checkpoint();
        return;
      }
      this.#enqueue(logicalKey);
      if (this.closed) return;
    }
  }

  #deliverCopy(envelope, copy) {
    const before = this.engine.stateDigest;
    if (this.deliveredDigests.has(envelope.packet.packetDigest)) {
      this.#record("DUPLICATE_SUPPRESSED", { envelopeId: envelope.envelopeId, logicalKey: envelope.logicalKey,
        copy, packetDigest: envelope.packet.packetDigest, engineDigestBefore: before, engineDigestAfter: before });
      return;
    }
    const result = this.engine.applyPacket(envelope.packet, { operationId: `transport-${envelope.envelopeId}` });
    if (result.status === "APPLIED") this.deliveredDigests.add(envelope.packet.packetDigest);
    this.#record(result.status === "APPLIED" ? "DELIVER_APPLIED" : "DELIVER_REFUSED", {
      envelopeId: envelope.envelopeId, logicalKey: envelope.logicalKey, copy,
      packetDigest: envelope.packet.packetDigest, receiptId: result.receiptId, reasonCode: result.reasonCode,
      engineDigestBefore: before, engineDigestAfter: this.engine.stateDigest,
    });
    this.#checkpoint();
  }

  #deliver() {
    const due = this.queue.filter((envelope) => envelope.status === "QUEUED" && envelope.deliverTick <= this.tick)
      .sort((left, right) => left.deliverTick - right.deliverTick || left.sendIndex - right.sendIndex);
    for (const envelope of due) {
      if (envelope.sendIndex < this.maxDeliveredSendIndex) {
        this.#record("REORDER", { envelopeId: envelope.envelopeId, logicalKey: envelope.logicalKey,
          sendIndex: envelope.sendIndex, priorMaximum: this.maxDeliveredSendIndex });
      }
      this.maxDeliveredSendIndex = Math.max(this.maxDeliveredSendIndex, envelope.sendIndex);
      if (this.tick > envelope.expiresTick) {
        envelope.status = "EXPIRED";
        const same = this.engine.stateDigest;
        this.#record("EXPIRED", { envelopeId: envelope.envelopeId, logicalKey: envelope.logicalKey,
          packetDigest: envelope.packet.packetDigest, engineDigestBefore: same, engineDigestAfter: same });
        continue;
      }
      envelope.status = "DELIVERED";
      for (let copy = 0; copy < envelope.copies; copy += 1) this.#deliverCopy(envelope, copy);
      if (this.closed) break;
    }
  }

  tickOnce() {
    if (this.closed) return this.summary();
    const nowOnline = this.#onlineAt(this.tick);
    if (nowOnline !== this.online) {
      this.online = nowOnline;
      if (!nowOnline) {
        this.#checkpoint();
        this.#record("DISCONNECT", { checkpointDigest: this.latestCheckpoint.checkpointDigest });
      } else {
        this.#record("RECONNECT", { queued: this.queue.filter((item) => item.status === "QUEUED").length });
        this.#recover();
      }
    }
    if (this.online && !this.closed) {
      this.#plan();
      if (!this.closed) this.#deliver();
    }
    this.tick += 1;
    if (!this.closed && this.tick >= this.maxTicks) {
      this.terminalReason = "TRANSPORT_TICK_LIMIT";
      const result = this.engine.closeDeadlock({ operationId: "transport-tick-limit" });
      this.#record("TICK_LIMIT", { maxTicks: this.maxTicks, receiptId: result.receiptId });
      this.#checkpoint();
    }
    return this.summary();
  }

  run() {
    while (!this.closed && this.tick < this.maxTicks) this.tickOnce();
    return this.summary();
  }

  #evidence() {
    return {
      fixtureId: this.fixture.id, tick: this.tick, online: this.online,
      attempts: deepClone(this.attempts), queue: deepClone(this.queue), ledger: deepClone(this.ledger),
      terminalReason: this.terminalReason, engineStateDigest: this.engine.stateDigest,
      engineReceiptIds: this.engine.receipts.map((receipt) => receipt.receiptId),
      normalizedOutcomeDigest: this.engine.normalizedOutcomeDigest(), sourceDigests: this.engine.sourceDigests,
    };
  }

  summary() {
    const language = this.engine.summary();
    const count = (type) => this.ledger.filter((event) => event.type === type).length;
    const mutationSafe = (type) => this.ledger.filter((event) => event.type === type)
      .every((event) => event.engineDigestBefore === event.engineDigestAfter);
    return {
      fixtureId: this.fixture.id, split: this.fixture.split,
      languageFixtureId: this.fixture.languageFixtureId,
      outcomeCode: this.outcomeCode, expectedOutcomeCode: this.fixture.expectedOutcomeCode,
      baselineOutcomeCode: directStateBaseline(this.fixture.languageFixtureId).outcomeCode,
      outcomeMatchesExpected: this.outcomeCode === this.fixture.expectedOutcomeCode,
      terminalReason: this.terminalReason,
      ticks: this.tick, attempts: count("SEND"), acceptedPackets: language.messages,
      transmittedBytes: this.ledger.filter((event) => event.type === "SEND").reduce((sum, event) => sum + event.bytes, 0),
      acceptedBytes: language.bytes, drops: count("DROP"), duplicatesSuppressed: count("DUPLICATE_SUPPRESSED"),
      delayed: this.queue.filter((envelope) => envelope.deliverTick > envelope.sentTick && envelope.faultKind === TRANSPORT_FAULTS.DELAY).length,
      expired: count("EXPIRED"), reorders: count("REORDER"), disconnects: count("DISCONNECT"),
      recoveryPasses: count("RECOVERY_PASS"), recoveryFailures: count("RECOVERY_FAIL"),
      staleRefusals: this.ledger.filter((event) => event.type === "DELIVER_REFUSED"
        && [LANGUAGE_REASONS.STALE_SEQUENCE, LANGUAGE_REASONS.STALE_STATE].includes(event.reasonCode)).length,
      tamperRefusals: this.ledger.filter((event) => event.type === "DELIVER_REFUSED"
        && event.reasonCode === LANGUAGE_REASONS.PACKET_DIGEST).length,
      duplicateNoEffect: mutationSafe("DUPLICATE_SUPPRESSED"), expiredNoEffect: mutationSafe("EXPIRED"),
      sourcesUnchanged: canonicalStringify(this.initialSourceDigests) === canonicalStringify(this.engine.sourceDigests),
      privateLeakage: language.privateLeakage, humanLanguagePayloads: language.humanLanguagePayloads,
      acceptedDeltaProvenance: language.acceptedDeltaProvenance,
      engineReplay: this.engine.verifyReplay().status,
      transportDigest: digest(this.#evidence()),
    };
  }

  verifyReplay() {
    const expected = this.summary();
    const replay = new HostileTransportTrial(this.fixture);
    while (replay.tick < this.tick && !replay.closed) replay.tickOnce();
    const actual = replay.summary();
    return {
      status: actual.transportDigest === expected.transportDigest ? "PASS" : "FAIL",
      expected: expected.transportDigest, actual: actual.transportDigest,
      ticksReplayed: replay.tick, engineReplay: actual.engineReplay,
    };
  }
}

export function stateTransportGate(fixtures = STATE_TRANSPORT_FIXTURES.filter((fixture) => fixture.split === "held_out")) {
  const runs = fixtures.map((fixture) => {
    const trial = new HostileTransportTrial(fixture);
    const result = trial.run();
    return { ...result, replay: trial.verifyReplay().status };
  });
  return {
    schema: "axm.stateborn.hostile-transport-gate/v1",
    fixtureDigest: STATE_TRANSPORT_FIXTURE_DIGEST,
    frozenFixtureDigest: FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST,
    freezeValid: STATE_TRANSPORT_FIXTURE_DIGEST === FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST,
    heldOutRuns: runs.length,
    solved: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED).length,
    refused: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.REFUSED).length,
    deadlocked: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK).length,
    totalAttempts: runs.reduce((sum, run) => sum + run.attempts, 0),
    totalAcceptedPackets: runs.reduce((sum, run) => sum + run.acceptedPackets, 0),
    totalTransmittedBytes: runs.reduce((sum, run) => sum + run.transmittedBytes, 0),
    totalDrops: runs.reduce((sum, run) => sum + run.drops, 0),
    totalDuplicatesSuppressed: runs.reduce((sum, run) => sum + run.duplicatesSuppressed, 0),
    totalExpired: runs.reduce((sum, run) => sum + run.expired, 0),
    totalReorders: runs.reduce((sum, run) => sum + run.reorders, 0),
    totalDisconnects: runs.reduce((sum, run) => sum + run.disconnects, 0),
    totalRecoveryPasses: runs.reduce((sum, run) => sum + run.recoveryPasses, 0),
    allExpectedOutcomes: runs.every((run) => run.outcomeMatchesExpected),
    allReplay: runs.every((run) => run.replay === "PASS" && run.engineReplay === "PASS"),
    allSourcesUnchanged: runs.every((run) => run.sourcesUnchanged),
    allConsentBound: runs.every((run) => run.acceptedDeltaProvenance),
    allPrivateClean: runs.every((run) => run.privateLeakage === 0),
    allPayloadsStateOnly: runs.every((run) => run.humanLanguagePayloads === 0),
    allDuplicatesNoEffect: runs.every((run) => run.duplicateNoEffect),
    allExpiredNoEffect: runs.every((run) => run.expiredNoEffect),
    interruptedRecoverySolved: runs.some((run) => run.disconnects > 0 && run.recoveryPasses > 0
      && run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED),
    retainedTransportFailure: runs.some((run) => run.baselineOutcomeCode === LANGUAGE_OUTCOMES.SOLVED
      && run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK),
    runs,
  };
}

export const stateTransportContracts = {
  claim: "the v0.6 typed packets can preserve bounded consent and recovery under frozen simulated transport faults",
  faults: deepClone(TRANSPORT_FAULTS),
  exclusions: ["real networking", "cryptographic identity", "hostile Internet safety", "production multiplayer",
    "human-state movement", "private machine language", "subjective understanding"],
};
