import test from "node:test";
import assert from "node:assert/strict";
import { LivingWorld, DeterministicField } from "../dist/living-world.js";

const shareFood = { kind: "share", target: "rhea", resource: "food" };

test("one million logical cells begin mostly asleep", () => {
  const world = new LivingWorld();
  const stats = world.stats();
  assert.equal(stats.logicalCells, 1_048_576);
  assert.equal(stats.logicalNodes, 1_048_579);
  assert.ok(stats.materializedCells <= 2);
  assert.ok(stats.sleepingCells > 1_048_570);
});

test("sleeping cells materialize deterministically on demand", () => {
  const left = new LivingWorld({ seed: "same-field" });
  const right = new LivingWorld({ seed: "same-field" });
  const coordinates = [[0, 0], [512, 512], [999, 777], [43, 82]];
  for (const [x, y] of coordinates) {
    assert.deepEqual(left.field.cell(left.state, x, y), right.field.cell(right.state, x, y));
  }
  assert.equal(left.field.baseCommitment, right.field.baseCommitment);
});

test("one player share can trigger an autonomous reciprocal share", () => {
  const world = new LivingWorld();
  const receipt = world.advance(shareFood, { operationId: "mutual-aid", expectedRevision: 0 });
  assert.equal(receipt.status, "APPLIED");
  assert.deepEqual(receipt.actorEvents.map((event) => [event.actor, event.kind, event.target, event.resource]), [
    ["player", "share", "rhea", "food"],
    ["rhea", "share", "player", "water"],
  ]);
  assert.equal(receipt.autonomy.find((entry) => entry.actor === "rhea").intent.cause, "remembered_relation");
  assert.equal(world.state.derived.situations[0].kind, "mutual_aid");
  assert.deepEqual(world.state.derived.situations[0].evidence, [0, 1]);
});

test("waiting instead creates a causally different unanswered-need branch", () => {
  const shareBranch = new LivingWorld();
  shareBranch.advance(shareFood, { operationId: "branch-share", expectedRevision: 0 });
  const waitBranch = new LivingWorld();
  const receipt = waitBranch.advance({ kind: "wait" }, { operationId: "branch-wait", expectedRevision: 0 });
  assert.equal(receipt.status, "APPLIED");
  assert.equal(receipt.actorEvents[1].actor, "rhea");
  assert.equal(receipt.actorEvents[1].kind, "request");
  assert.equal(waitBranch.state.derived.situations[0].kind, "unanswered_need");
  assert.notEqual(waitBranch.stateDigest, shareBranch.stateDigest);
});

test("player and autonomous actors use the same share transform", () => {
  const world = new LivingWorld();
  world.advance(shareFood, { operationId: "shared-transform", expectedRevision: 0 });
  assert.equal(world.state.evidence.behaviors.player.share, 1);
  assert.equal(world.state.evidence.behaviors.rhea.share, 1);
  assert.equal(world.state.actors.rhea.needs.food, 5);
  assert.equal(world.state.actors.player.needs.water, 2);
  assert.equal(world.state.relations.bond_rhea_player.strength, 1);
  assert.equal(world.state.relations.bond_player_rhea.strength, 1);
});

test("indexed rules wake from changed top-level paths without scanning logical cells", () => {
  const world = new LivingWorld();
  const receipt = world.advance(shareFood, { operationId: "indexed-wake", expectedRevision: 0 });
  assert.ok(receipt.wokenNodes.includes("identity.project_behavior"));
  assert.ok(receipt.wokenNodes.includes("situations.project_causal_patterns"));
  assert.ok(receipt.wokenNodes.includes("autonomy.perceive.rhea"));
  assert.equal(receipt.logicalNodeCount, 1_048_579);
  assert.ok(receipt.wokenNodes.length < 10);
});

test("gather changes one sparse cell override rather than materializing the field", () => {
  const world = new LivingWorld();
  const before = world.field.cell(world.state, 512, 512).resources.food;
  const receipt = world.advance({ kind: "gather", resource: "food" }, { operationId: "sparse-gather", expectedRevision: 0 });
  assert.equal(receipt.status, "APPLIED");
  assert.equal(world.field.cell(world.state, 512, 512).resources.food, before - 1);
  assert.equal(world.stats().changedCells, 1);
  assert.ok(world.stats().materializedCells < 100);
});

test("stale living-world intent refuses without waking autonomy", () => {
  const world = new LivingWorld();
  const before = world.stateDigest;
  const receipt = world.advance(shareFood, { operationId: "stale-living", expectedRevision: 4 });
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "STALE_REVISION");
  assert.deepEqual(receipt.autonomy, []);
  assert.equal(world.stateDigest, before);
});

test("living-world operation IDs are idempotent", () => {
  const world = new LivingWorld();
  const first = world.advance(shareFood, { operationId: "once", expectedRevision: 0 });
  const after = world.stateDigest;
  const duplicate = world.advance(shareFood, { operationId: "once", expectedRevision: 1 });
  assert.equal(first.status, "APPLIED");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.eventId, first.eventId);
  assert.equal(world.stateDigest, after);
  assert.equal(world.state.meta.revision, 1);
});

test("living-world invariant failure rolls back player and autonomous draft state", () => {
  const world = new LivingWorld();
  const before = world.stateDigest;
  const receipt = world.advance({ kind: "test_breach" }, { operationId: "living-breach", expectedRevision: 0 });
  assert.equal(receipt.status, "REFUSED");
  assert.match(receipt.reason, /^ATOMIC_ROLLBACK:actor\.energy:player/);
  assert.equal(world.stateDigest, before);
  assert.equal(world.state.meta.revision, 0);
});

test("living-world exact replay reproduces autonomous decisions and digest", () => {
  const world = new LivingWorld();
  world.advance({ kind: "wait" }, { operationId: "replay-wait", expectedRevision: 0 });
  world.advance(shareFood, { operationId: "replay-share", expectedRevision: 1 });
  const result = world.verifyReplay();
  assert.equal(result.status, "PASS");
  assert.equal(result.actual, world.stateDigest);
  assert.equal(result.eventsReplayed, 2);
});

test("living-world sealed saves reject tampering and restore by replay", () => {
  const source = new LivingWorld();
  source.advance(shareFood, { operationId: "save-share", expectedRevision: 0 });
  const save = source.exportSave();
  const target = new LivingWorld();
  assert.equal(target.importSave(save).status, "IMPORTED");
  assert.equal(target.stateDigest, source.stateDigest);
  const tampered = structuredClone(save);
  tampered.state.actors.rhea.inventory.water = 99;
  const refused = new LivingWorld().importSave(tampered);
  assert.equal(refused.status, "REFUSED");
  assert.equal(refused.reason, "SAVE_SEAL_MISMATCH");
});

test("logical scale changes the commitment, not materialization demand", () => {
  const million = new LivingWorld({ width: 1000, height: 1000, seed: "scale-shape" });
  const hundredMillion = new LivingWorld({ width: 10000, height: 10000, seed: "scale-shape" });
  assert.equal(million.stats().logicalCells, 1_000_000);
  assert.equal(hundredMillion.stats().logicalCells, 100_000_000);
  assert.ok(million.stats().materializedCells <= 2);
  assert.ok(hundredMillion.stats().materializedCells <= 2);
  assert.notEqual(million.field.baseCommitment, hundredMillion.field.baseCommitment);
});
