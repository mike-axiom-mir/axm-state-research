import test from "node:test";
import assert from "node:assert/strict";
import { CoexistenceWorld, coexistenceContracts } from "../dist/coexistence-world.js";

const forbidden = ["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"];

test("authored shared genesis invents no adventure", () => {
  const world = new CoexistenceWorld();
  assert.equal(world.state.meta.fixture, "AUTHORED_SHARED_START");
  assert.equal(world.state.evidence.events.length, 0);
  assert.deepEqual(world.state.derived.threads, []);
});

test("one cycle gives every seat one validated transform", () => {
  const world = new CoexistenceWorld({ seed: "coexist-one" });
  const receipt = world.cycle({ kind: "signal", signal: "open" }, { expectedRevision: 0 });
  assert.equal(receipt.status, "APPLIED");
  assert.equal(receipt.eventIds.length, 3);
  assert.deepEqual(world.state.evidence.events.map((event) => event.role), ["human", "machine", "ai"]);
  assert.equal(receipt.aiDecision.source, "DETERMINISTIC_STAND_IN");
  assert.equal(coexistenceContracts.aiSeat.externalModelConnected, false);
});

test("machine curiosity input contains no outcome channel", () => {
  const world = new CoexistenceWorld();
  world.cycle({ kind: "signal", signal: "open" });
  const serialized = JSON.stringify(world.receipts[0].machineDecision.view).toLowerCase();
  for (const term of forbidden) assert.equal(serialized.includes(term), false, `leaked ${term}`);
});

test("observer edits cannot change machine curiosity", () => {
  const world = new CoexistenceWorld({ seed: "coexist-policy" });
  const before = world.previewMachineDecision();
  world.state.derived.observer.healthDelta = -999;
  world.state.derived.threads = [{ kind: "fake_success" }];
  assert.deepEqual(world.previewMachineDecision(), before);
});

test("AI-compatible view is bounded and stand-in is labelled", () => {
  const world = new CoexistenceWorld();
  const preview = world.previewStandInProposal();
  assert.equal(preview.source, "DETERMINISTIC_STAND_IN");
  assert.deepEqual(preview.view.allowedIntentKinds, ["move", "signal", "wait"]);
  assert.equal("world" in preview.view, false);
  assert.equal("receipts" in preview.view, false);
});

test("invalid external AI proposal is refused without fallback", () => {
  const world = new CoexistenceWorld();
  const receipt = world.cycle({ kind: "wait" }, {
    aiProposal: { kind: "move", to: { x: 900, y: 900 } }, expectedRevision: 0,
  });
  assert.equal(receipt.status, "APPLIED");
  assert.equal(receipt.aiDecision.source, "EXTERNAL_PROPOSAL");
  assert.equal(receipt.aiDecision.status, "REFUSED");
  assert.equal(receipt.aiDecision.fallbackUsed, false);
  assert.equal(receipt.aiEventId, null);
  assert.equal(receipt.eventIds.length, 2);
  assert.equal(world.state.evidence.events.some((event) => event.role === "ai"), false);
});

test("valid external AI proposal is applied after local validation", () => {
  const world = new CoexistenceWorld();
  const receipt = world.cycle({ kind: "wait" }, { aiProposal: { kind: "signal", signal: "hush" } });
  assert.equal(receipt.aiDecision.status, "ACCEPTED");
  assert.equal(receipt.aiDecision.reason, "VALIDATED_BY_LOCAL_REFEREE");
  assert.equal(world.state.evidence.events.at(-1).role, "ai");
});

test("adventure threads bind intersecting role events", () => {
  const world = new CoexistenceWorld({ seed: "coexist-thread" });
  world.cycle({ kind: "signal", signal: "open" });
  const kinds = new Set(world.state.derived.threads.map((thread) => thread.kind));
  assert.ok(kinds.has("shared_site"));
  assert.ok(kinds.has("three_way_mark"));
  assert.ok(kinds.has("encounter"));
  const events = new Set(world.state.evidence.events.map((event) => event.eventId));
  for (const thread of world.state.derived.threads) assert.ok(thread.evidence.length && thread.evidence.every((id) => events.has(id)));
});

test("stale or invalid human action stops the whole cycle", () => {
  const world = new CoexistenceWorld();
  const before = world.stateDigest;
  const stale = world.cycle({ kind: "wait" }, { operationId: "stale", expectedRevision: 4 });
  assert.equal(stale.status, "REFUSED");
  assert.equal(stale.machineDecision, null);
  assert.equal(world.stateDigest, before);
  assert.equal(world.cycle({ kind: "teleport" }, { operationId: "invalid" }).status, "REFUSED");
  assert.equal(world.stateDigest, before);
});

test("cycle operations are idempotent", () => {
  const world = new CoexistenceWorld();
  const first = world.cycle({ kind: "wait" }, { operationId: "once", expectedRevision: 0 });
  const after = world.stateDigest;
  const duplicate = world.cycle({ kind: "signal", signal: "open" }, { operationId: "once", expectedRevision: 1 });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.receiptId, first.receiptId);
  assert.equal(world.stateDigest, after);
});

test("exact replay reconstructs stand-in and external cycles", () => {
  const world = new CoexistenceWorld({ seed: "coexist-replay" });
  world.run(12);
  world.cycle({ kind: "signal", signal: "turn" }, { aiProposal: { kind: "signal", signal: "open" } });
  world.cycle({ kind: "wait" }, { aiProposal: { kind: "move", to: { x: 0, y: 0 } } });
  const replay = world.verifyReplay();
  assert.equal(replay.status, "PASS");
  assert.equal(replay.cyclesReplayed, 14);
});

test("coexistence remains sparse in a larger sleeping field", () => {
  const small = new CoexistenceWorld({ seed: "coexist-scale", width: 1000, height: 1000 });
  const large = new CoexistenceWorld({ seed: "coexist-scale", width: 10000, height: 10000 });
  small.run(32); large.run(32);
  assert.equal(small.stats().logicalNodes, 1_000_003);
  assert.equal(large.stats().logicalNodes, 100_000_003);
  assert.ok(small.stats().materializedCells < 160);
  assert.ok(large.stats().materializedCells < 160);
  assert.ok(small.stats().changedCells < 64);
  assert.ok(large.stats().changedCells < 64);
});

test("human choice can branch the same genesis", () => {
  const left = new CoexistenceWorld({ seed: "coexist-branch" });
  const right = new CoexistenceWorld({ seed: "coexist-branch" });
  left.cycle({ kind: "signal", signal: "open" });
  right.cycle({ kind: "move", direction: "north" });
  assert.notEqual(left.stateDigest, right.stateDigest);
});
