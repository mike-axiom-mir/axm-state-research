import test from "node:test";
import assert from "node:assert/strict";
import { CuriosityWorld, curiosityPolicyContract } from "../dist/curiosity-world.js";

const forbiddenPolicyTerms = ["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"];

test("curiosity policy view excludes outcome and reward language", () => {
  const world = new CuriosityWorld();
  const serialized = JSON.stringify(world.policyInput()).toLowerCase();
  for (const term of forbiddenPolicyTerms) assert.equal(serialized.includes(term), false, `leaked ${term}`);
  assert.ok(curiosityPolicyContract.forbidden.length > 0);
});

test("observer summaries cannot change a curiosity decision", () => {
  const world = new CuriosityWorld();
  const before = world.previewDecision();
  world.state.derived.observer.healthDelta = -999;
  world.state.derived.observer.damageEvents = 999;
  world.state.derived.patterns = [{ kind: "fake_success" }];
  const after = world.previewDecision();
  assert.deepEqual(after, before);
});

test("same genesis and curiosity loop produce identical receipts", () => {
  const left = new CuriosityWorld({ seed: "same-curiosity" });
  const right = new CuriosityWorld({ seed: "same-curiosity" });
  left.run(64);
  right.run(64);
  assert.equal(left.stateDigest, right.stateDigest);
  assert.deepEqual(left.receipts.map((receipt) => receipt.eventId), right.receipts.map((receipt) => receipt.eventId));
});

test("curiosity alternates movement and state signals without an efficiency target", () => {
  const world = new CuriosityWorld();
  world.run(64);
  const kinds = new Set(world.receipts.map((receipt) => receipt.intent.kind));
  const signals = new Set(world.receipts.filter((receipt) => receipt.intent.kind === "signal").map((receipt) => receipt.intent.signal));
  assert.deepEqual([...kinds].sort(), ["move", "signal"]);
  assert.ok(signals.size >= 3);
});

test("the game observer sees both growth and damage after the same blind loop", () => {
  const world = new CuriosityWorld();
  world.run(64);
  const observer = world.state.derived.observer;
  assert.ok(observer.growthEvents > 0);
  assert.ok(observer.damageEvents > 0);
  assert.ok(observer.bloomCells > 0);
  assert.ok(observer.scarCells > 0);
  assert.ok(world.receipts.every((receipt) => !JSON.stringify(receipt.policyView).includes("observerOutcome")));
});

test("world change remains sparse and slower than loop steps", () => {
  const world = new CuriosityWorld();
  world.run(128);
  const stats = world.stats();
  assert.equal(stats.logicalCells, 1_048_576);
  assert.ok(stats.changedCells > 0);
  assert.ok(stats.changedCells < 128);
  assert.ok(stats.materializedCells < 128);
  assert.ok(stats.sleepingCells > 1_048_400);
});

test("multiple curious actors can leave a shared echo without messaging", () => {
  const world = new CuriosityWorld();
  world.run(64);
  assert.ok(world.state.derived.observer.echoCells > 0);
  assert.ok(world.state.derived.patterns.some((pattern) => pattern.kind === "shared_echo"));
});

test("curiosity receipts are idempotent", () => {
  const world = new CuriosityWorld();
  const first = world.step({ operationId: "once", expectedRevision: 0 });
  const after = world.stateDigest;
  const duplicate = world.step({ operationId: "once", expectedRevision: 1 });
  assert.equal(first.status, "APPLIED");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.eventId, first.eventId);
  assert.equal(world.stateDigest, after);
});

test("a stale curiosity step refuses without selecting an action", () => {
  const world = new CuriosityWorld();
  const before = world.stateDigest;
  const receipt = world.step({ operationId: "stale", expectedRevision: 4 });
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "STALE_REVISION");
  assert.equal(receipt.policyView, null);
  assert.equal(receipt.intent, null);
  assert.equal(world.stateDigest, before);
});

test("exact replay reconstructs curiosity choices and observer-visible consequences", () => {
  const world = new CuriosityWorld();
  world.run(128);
  const replay = world.verifyReplay();
  assert.equal(replay.status, "PASS");
  assert.equal(replay.stepsReplayed, 128);
  assert.equal(replay.actual, world.stateDigest);
});

test("larger untouched logical worlds do not materialize extra cells", () => {
  const million = new CuriosityWorld({ width: 1000, height: 1000, seed: "curiosity-scale" });
  const hundredMillion = new CuriosityWorld({ width: 10000, height: 10000, seed: "curiosity-scale" });
  million.run(16);
  hundredMillion.run(16);
  assert.equal(million.stats().logicalCells, 1_000_000);
  assert.equal(hundredMillion.stats().logicalCells, 100_000_000);
  assert.equal(million.stats().materializedCells, hundredMillion.stats().materializedCells);
  assert.equal(million.stats().changedCells, hundredMillion.stats().changedCells);
});
