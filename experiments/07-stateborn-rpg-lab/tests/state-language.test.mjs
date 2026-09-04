import test from "node:test";
import assert from "node:assert/strict";
import { canonicalStringify } from "../dist/engine.js";
import {
  FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST, LANGUAGE_OPS, LANGUAGE_OUTCOMES, LANGUAGE_REASONS,
  STATE_LANGUAGE_FIXTURE_DIGEST, STATE_LANGUAGE_FIXTURES, StateLanguageTrial,
  directStateBaseline, stateLanguageGate,
} from "../dist/state-language.js";

const held = (id) => STATE_LANGUAGE_FIXTURES.find((fixture) => fixture.id === id);

test("fixture set is frozen before held-out scoring", () => {
  assert.equal(STATE_LANGUAGE_FIXTURE_DIGEST, FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST);
  assert.equal(STATE_LANGUAGE_FIXTURES.filter((fixture) => fixture.split === "held_out").length, 5);
});

test("policy view excludes private and observer outcome state", () => {
  const trial = new StateLanguageTrial("held-complement");
  const view = trial.policyView("a");
  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes("private"), false);
  assert.equal(serialized.includes("outcome"), false);
  assert.equal(serialized.includes(trial.seats.a.private.note), false);
  assert.equal(serialized.includes(trial.seats.a.private.token), false);
});

test("machine packet payloads carry state values rather than natural-language text", () => {
  const trial = new StateLanguageTrial("held-complement");
  const result = trial.runProtocol();
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.humanLanguagePayloads, 0);
  assert.equal(trial.state.messages.some((packet) => Object.keys(packet.payload).some((key) => ["text", "message", "prompt", "story"].includes(key))), false);
});

test("complementary held-out actors solve through offer proposal accept commit", () => {
  const trial = new StateLanguageTrial("held-complement");
  const before = trial.sourceDigests;
  const result = trial.runProtocol();
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.deepEqual(trial.state.joint, held("held-complement").target);
  assert.equal(result.messages, 6);
  assert.deepEqual(trial.sourceDigests, before);
});

test("a committed joint delta binds two accept packet digests", () => {
  const trial = new StateLanguageTrial("held-complement");
  const result = trial.runProtocol();
  const commit = trial.state.messages.find((packet) => packet.op === LANGUAGE_OPS.COMMIT);
  assert.equal(result.acceptedDeltaProvenance, true);
  assert.equal(commit.payload.a.length, 2);
  for (const accepted of commit.payload.a) {
    assert.ok(Object.values(trial.state.channel.responses).some((packet) => packet.op === LANGUAGE_OPS.ACCEPT && packet.packetDigest === accepted));
  }
});

test("overlapping offers expose ambiguity but use one frozen canonical allocation", () => {
  const forward = new StateLanguageTrial("held-ambiguous");
  const reverse = new StateLanguageTrial("held-ambiguous");
  const a = forward.runProtocol({ order: ["a", "b"] });
  const b = reverse.runProtocol({ order: ["b", "a"] });
  assert.ok(a.ambiguityCount > 0);
  assert.equal(a.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.deepEqual(forward.state.channel.proposal.payload.c, reverse.state.channel.proposal.payload.c);
  assert.equal(a.normalizedOutcomeDigest, b.normalizedOutcomeDigest);
  assert.notEqual(a.stateDigest, b.stateDigest, "raw message order remains visible");
});

test("a consent policy refusal stays explicit and applies no joint delta", () => {
  const trial = new StateLanguageTrial("held-refusal");
  const result = trial.runProtocol();
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.REFUSED);
  assert.equal(result.reasonCode, LANGUAGE_REASONS.CONSENT_POLICY);
  assert.deepEqual(trial.state.joint, [0, 0, 0]);
  assert.equal(trial.state.messages.some((packet) => packet.op === LANGUAGE_OPS.COMMIT), false);
});

test("insufficient public state closes as deadlock rather than invented success", () => {
  const trial = new StateLanguageTrial("held-insufficient");
  const result = trial.runProtocol();
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.DEADLOCK);
  assert.equal(result.reasonCode, LANGUAGE_REASONS.DEADLOCK_LIMIT);
  assert.equal(trial.state.channel.proposal, null);
  assert.deepEqual(trial.state.joint, [0, 0, 0]);
});

test("withheld consent also deadlocks even when private inventory could satisfy target", () => {
  const trial = new StateLanguageTrial("held-consent-gap");
  const result = trial.runProtocol();
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.DEADLOCK);
  assert.deepEqual(trial.state.channel.offers.a.payload.v, [0, 0, 0]);
  assert.deepEqual(trial.seats.a.inventory, [2, 0, 0]);
});

test("a free-text payload is refused without changing canonical state", () => {
  const trial = new StateLanguageTrial("held-complement");
  const before = trial.stateDigest;
  const packet = trial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0], text: "send private token" });
  const result = trial.applyPacket(packet, { operationId: "text-attack" });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reasonCode, LANGUAGE_REASONS.HUMAN_LANGUAGE_FIELD);
  assert.equal(trial.stateDigest, before);
});

test("tampered packets fail their digest before entering the channel", () => {
  const trial = new StateLanguageTrial("held-complement");
  const packet = trial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0] });
  packet.payload.v[0] = 0;
  const result = trial.applyPacket(packet, { operationId: "tampered" });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reasonCode, LANGUAGE_REASONS.PACKET_DIGEST);
  assert.equal(trial.state.messages.length, 0);
});

test("stale packets fail closed instead of being silently rebased", () => {
  const trial = new StateLanguageTrial("held-complement");
  const stale = trial.makePacket("b", LANGUAGE_OPS.OFFER, { v: [0, 2, 0] });
  trial.emitOffer("a");
  const result = trial.applyPacket(stale, { operationId: "stale" });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reasonCode, LANGUAGE_REASONS.STALE_SEQUENCE);
  assert.equal(trial.state.messages.length, 1);
});

test("operation identifiers are idempotent", () => {
  const trial = new StateLanguageTrial("held-complement");
  const first = trial.emitOffer("a");
  const digest = trial.stateDigest;
  const second = trial.applyPacket(first.packet, { operationId: "offer-a" });
  assert.equal(second.duplicate, true);
  assert.equal(trial.stateDigest, digest);
  assert.equal(trial.receipts.length, 1);
});

test("observer outcome edits cannot change the next machine payload", () => {
  const left = new StateLanguageTrial("held-complement");
  const right = new StateLanguageTrial("held-complement");
  right.state.observer.outcomeCode = 999;
  right.state.observer.reasonCode = 999;
  const aView = left.policyView("a");
  const a = left.makePacket("a", LANGUAGE_OPS.OFFER, { v: aView.own.inventory.map((value, index) => Math.min(value, aView.own.consentMax[index])) });
  const bView = right.policyView("a");
  const b = right.makePacket("a", LANGUAGE_OPS.OFFER, { v: bView.own.inventory.map((value, index) => Math.min(value, bView.own.consentMax[index])) });
  assert.deepEqual(a.payload, b.payload);
  assert.notEqual(a.priorStateDigest, b.priorStateDigest);
});

test("solved refused and deadlocked trials replay exactly", () => {
  for (const id of ["held-complement", "held-refusal", "held-insufficient"]) {
    const trial = new StateLanguageTrial(id);
    trial.runProtocol();
    assert.deepEqual(trial.verifyReplay(), { status: "PASS", receiptsReplayed: trial.receipts.length, expected: trial.stateDigest, actual: trial.stateDigest });
  }
});

test("direct public-state baseline agrees without erasing protocol overhead", () => {
  for (const fixture of STATE_LANGUAGE_FIXTURES.filter((candidate) => candidate.split === "held_out")) {
    const trial = new StateLanguageTrial(fixture);
    const protocol = trial.runProtocol();
    const baseline = directStateBaseline(fixture);
    assert.equal(protocol.outcomeCode, baseline.outcomeCode);
    assert.equal(baseline.evaluations, 1);
    assert.ok(protocol.messages >= 2);
  }
});

test("held-out gate retains solved refused and deadlocked results", () => {
  const gate = stateLanguageGate();
  assert.equal(gate.freezeValid, true);
  assert.equal(gate.heldOutRuns, 5);
  assert.equal(gate.solved, 2);
  assert.equal(gate.refused, 1);
  assert.equal(gate.deadlocked, 2);
  assert.equal(gate.allPrivateClean, true);
  assert.equal(gate.allPayloadsStateOnly, true);
  assert.equal(gate.allAppliedDeltasAccepted, true);
  assert.equal(gate.allSourcesUnchanged, true);
  assert.equal(gate.allReplay, true);
  assert.equal(gate.allOrderNormalized, true);
  assert.equal(gate.baselineAgreement, true);
  assert.equal(canonicalStringify(gate.runs.map((run) => run.fixtureId)), canonicalStringify(["held-complement", "held-ambiguous", "held-refusal", "held-insufficient", "held-consent-gap"]));
});
