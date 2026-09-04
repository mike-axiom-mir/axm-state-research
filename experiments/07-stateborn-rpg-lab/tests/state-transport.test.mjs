import test from "node:test";
import assert from "node:assert/strict";
import { canonicalStringify } from "../dist/engine.js";
import { LANGUAGE_OUTCOMES, LANGUAGE_REASONS } from "../dist/state-language.js";
import {
  FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST, HostileTransportTrial,
  STATE_TRANSPORT_FIXTURE_DIGEST, STATE_TRANSPORT_FIXTURES, stateTransportGate,
} from "../dist/state-transport.js";

const run = (id) => { const trial = new HostileTransportTrial(id); return { trial, result: trial.run() }; };

test("transport fixture set is frozen before held-out scoring", () => {
  assert.equal(STATE_TRANSPORT_FIXTURE_DIGEST, FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST);
  assert.equal(STATE_TRANSPORT_FIXTURES.filter((fixture) => fixture.split === "held_out").length, 10);
});

test("transport envelopes preserve the exact v0.6 packet schema", () => {
  const trial = new HostileTransportTrial("held-drop-retry");
  trial.tickOnce();
  const send = trial.ledger.find((event) => event.type === "SEND");
  const dropped = trial.ledger.find((event) => event.type === "DROP");
  assert.equal(send.packetDigest.length, 64);
  assert.equal(dropped.engineDigestBefore, dropped.engineDigestAfter);
});

test("a dropped offer retries and the task still solves", () => {
  const { result } = run("held-drop-retry");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.drops, 1);
  assert.equal(result.attempts, 7);
});

test("a duplicate packet is suppressed before a second state effect", () => {
  const { result } = run("held-duplicate");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.duplicatesSuppressed, 1);
  assert.equal(result.duplicateNoEffect, true);
  assert.equal(result.acceptedPackets, 6);
});

test("a delayed packet remains pending and later converges", () => {
  const { result } = run("held-delay");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.delayed, 1);
  assert.ok(result.ticks > 6);
});

test("reordering stays visible, stale state refuses, and retry solves", () => {
  const { result } = run("held-reorder-stale");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.reorders, 1);
  assert.equal(result.staleRefusals, 1);
});

test("disconnect recovery rebuilds the exact checkpoint before continuing", () => {
  const { trial, result } = run("held-disconnect-recover");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.disconnects, 1);
  assert.equal(result.recoveryPasses, 1);
  assert.equal(result.recoveryFailures, 0);
  assert.ok(trial.ledger.some((event) => event.type === "RECOVERY_PASS"));
});

test("an expired packet has no effect and a fresh retry solves", () => {
  const { result } = run("held-expiry-retry");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.expired, 1);
  assert.equal(result.expiredNoEffect, true);
});

test("transport corruption is refused by the v0.6 digest and clean retry solves", () => {
  const { trial, result } = run("held-corrupt-retry");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.tamperRefusals, 1);
  assert.ok(trial.engine.receipts.some((receipt) => receipt.reasonCode === LANGUAGE_REASONS.PACKET_DIGEST));
});

test("consent refusal survives duplicate transport without a commit", () => {
  const { trial, result } = run("held-consent-refusal");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.REFUSED);
  assert.deepEqual(trial.engine.state.joint, [0, 0, 0]);
});

test("state insufficiency remains a deadlock rather than a transport invention", () => {
  const { result } = run("held-insufficient");
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.DEADLOCK);
  assert.equal(result.terminalReason, "STATE_INSUFFICIENT");
});

test("bounded repeated loss remains an explicit retained transport failure", () => {
  const { result } = run("held-loss-exhaustion");
  assert.equal(result.baselineOutcomeCode, LANGUAGE_OUTCOMES.SOLVED);
  assert.equal(result.outcomeCode, LANGUAGE_OUTCOMES.DEADLOCK);
  assert.equal(result.terminalReason, "TRANSPORT_ATTEMPTS_EXHAUSTED");
  assert.equal(result.acceptedPackets, 0);
});

test("every held-out source remains independently unchanged", () => {
  const gate = stateTransportGate();
  assert.equal(gate.allSourcesUnchanged, true);
  assert.ok(gate.runs.every((result) => result.sourcesUnchanged));
});

test("privacy and state-only payload boundaries survive every fault", () => {
  const gate = stateTransportGate();
  assert.equal(gate.allPrivateClean, true);
  assert.equal(gate.allPayloadsStateOnly, true);
});

test("every solved commit retains exact acceptance provenance", () => {
  const gate = stateTransportGate();
  assert.equal(gate.allConsentBound, true);
  assert.ok(gate.runs.filter((result) => result.outcomeCode === LANGUAGE_OUTCOMES.SOLVED)
    .every((result) => result.acceptedDeltaProvenance));
});

test("each transport ledger and nested engine receipt chain replay exactly", () => {
  for (const fixture of STATE_TRANSPORT_FIXTURES.filter((candidate) => candidate.split === "held_out")) {
    const trial = new HostileTransportTrial(fixture);
    trial.run();
    const replay = trial.verifyReplay();
    assert.equal(replay.status, "PASS", fixture.id);
    assert.equal(replay.engineReplay, "PASS", fixture.id);
  }
});

test("repeated full gates produce identical transport digests", () => {
  const left = stateTransportGate();
  const right = stateTransportGate();
  assert.equal(canonicalStringify(left.runs.map((result) => result.transportDigest)),
    canonicalStringify(right.runs.map((result) => result.transportDigest)));
});

test("held-out gate covers every fault and preserves an honest failure", () => {
  const gate = stateTransportGate();
  assert.equal(gate.allExpectedOutcomes, true);
  assert.deepEqual([gate.solved, gate.refused, gate.deadlocked], [7, 1, 2]);
  assert.ok(gate.totalDrops > 0);
  assert.ok(gate.totalDuplicatesSuppressed > 0);
  assert.ok(gate.totalExpired > 0);
  assert.ok(gate.totalReorders > 0);
  assert.ok(gate.totalDisconnects > 0);
  assert.equal(gate.interruptedRecoverySolved, true);
  assert.equal(gate.retainedTransportFailure, true);
});
