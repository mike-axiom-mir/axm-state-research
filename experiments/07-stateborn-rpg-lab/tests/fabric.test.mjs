import test from "node:test";
import assert from "node:assert/strict";
import { canonicalStringify, digest, sha256 } from "../dist/engine.js";
import { createWorldEngine, emergenceProbe, RESOURCES } from "../dist/world.js";

function runProbe(engine) {
  return emergenceProbe.map((step) => engine.perform(step.actionId, step.params, {
    operationId: step.operationId,
    expectedRevision: engine.state.meta.revision,
  }));
}

test("SHA-256 is identical to the standard abc vector", () => {
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("canonical state ignores object insertion order", () => {
  const left = { z: 3, a: { y: 2, x: 1 } };
  const right = { a: { x: 1, y: 2 }, z: 3 };
  assert.equal(canonicalStringify(left), canonicalStringify(right));
  assert.equal(digest(left), digest(right));
});

test("same seed creates byte-equivalent stabilized genesis", () => {
  const left = createWorldEngine("repeatable-seed");
  const right = createWorldEngine("repeatable-seed");
  assert.equal(left.stateDigest, right.stateDigest);
  assert.deepEqual(left.state, right.state);
});

test("unavailable interaction refuses without changing canonical state", () => {
  const engine = createWorldEngine();
  const before = engine.stateDigest;
  const receipt = engine.perform("share", { target: "rhea", resource: "food" }, { operationId: "bad-share" });
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "TARGET_NOT_PRESENT");
  assert.equal(receipt.previousDigest, receipt.nextDigest);
  assert.equal(engine.stateDigest, before);
  assert.equal(engine.state.meta.revision, 0);
});

test("stale revision refuses without rebasing the request", () => {
  const engine = createWorldEngine();
  const before = engine.stateDigest;
  const receipt = engine.perform("gather", { resource: "food" }, {
    operationId: "stale-gather",
    expectedRevision: 99,
  });
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "STALE_REVISION");
  assert.equal(engine.stateDigest, before);
});

test("operation IDs are idempotent", () => {
  const engine = createWorldEngine();
  const first = engine.perform("gather", { resource: "food" }, { operationId: "one-gather", expectedRevision: 0 });
  const digestAfterFirst = engine.stateDigest;
  const duplicate = engine.perform("gather", { resource: "food" }, { operationId: "one-gather", expectedRevision: 1 });
  assert.equal(first.status, "APPLIED");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.eventId, first.eventId);
  assert.equal(engine.stateDigest, digestAfterFirst);
  assert.equal(engine.state.nodes.player.inventory.food, 1);
});

test("invariant failure rolls back the entire transaction", () => {
  const engine = createWorldEngine();
  const before = engine.stateDigest;
  const receipt = engine.perform("test_breach", {}, { operationId: "breach" });
  assert.equal(receipt.status, "REFUSED");
  assert.match(receipt.reason, /^ATOMIC_ROLLBACK:player\.energy_bounded/);
  assert.equal(engine.stateDigest, before);
  assert.equal(engine.state.nodes.player.energy, 12);
});

test("generic action evidence produces an identity pattern without class selection", () => {
  const engine = createWorldEngine();
  const receipts = runProbe(engine);
  assert.ok(receipts.every((receipt) => receipt.status === "APPLIED"));
  assert.equal(engine.state.evidence.actionCounts.gather, 2);
  assert.equal(engine.state.evidence.actionCounts.share, 2);
  assert.equal(engine.state.derived.competence.finding, 1);
  assert.equal(engine.state.derived.competence.care, 2);
  assert.deepEqual(engine.state.derived.identityPattern, {
    label: "Keeper-shaped",
    strength: 2,
    basis: "care is the strongest receipt-backed behavior",
  });
  assert.equal(engine.state.edges.bond_rhea.strength, 2);
  assert.equal(engine.state.derived.discoveries.length, 1);
  assert.equal(engine.state.derived.discoveries[0].kind, "reciprocal_knowledge");
  assert.ok(RESOURCES.includes(engine.state.derived.discoveries[0].resource));
  const discoveredCell = engine.state.nodes[engine.state.derived.discoveries[0].cell];
  assert.ok(discoveredCell.resources[engine.state.derived.discoveries[0].resource] > 0);
});

test("node wake trace exposes the causal work floor", () => {
  const engine = createWorldEngine();
  engine.perform("gather", { resource: "food" }, { operationId: "trace-gather" });
  const receipt = engine.receipts.at(-1);
  assert.ok(receipt.wokenNodes.includes("evidence.observe_action"));
  assert.ok(receipt.wokenNodes.includes("identity.derive_competence"));
  assert.ok(receipt.firedNodes.includes("evidence.observe_action"));
  assert.ok(receipt.changedPaths.includes("evidence.actionCounts.gather"));
  assert.ok(receipt.changedPaths.includes("meta.revision"));
});

test("exact replay reconstructs the same canonical state digest", () => {
  const engine = createWorldEngine();
  engine.perform("share", { target: "rhea", resource: "food" }, { operationId: "refused-first" });
  runProbe(engine);
  const result = engine.verifyReplay();
  assert.equal(result.status, "PASS");
  assert.equal(result.actual, engine.stateDigest);
  assert.equal(result.eventsReplayed, 5);
});

test("sealed saves import only when state and receipt chain agree", () => {
  const source = createWorldEngine();
  runProbe(source);
  const save = source.exportSave();
  const target = createWorldEngine();
  const imported = target.importSave(save);
  assert.equal(imported.status, "IMPORTED");
  assert.equal(target.stateDigest, source.stateDigest);

  const tampered = structuredClone(save);
  tampered.state.nodes.player.energy = 999;
  const refused = createWorldEngine().importSave(tampered);
  assert.equal(refused.status, "REFUSED");
  assert.equal(refused.reason, "SAVE_SEAL_MISMATCH");
});

test("two independent runs of the probe produce the same receipt-bound result", () => {
  const left = createWorldEngine("pair-seed");
  const right = createWorldEngine("pair-seed");
  runProbe(left);
  runProbe(right);
  assert.equal(left.stateDigest, right.stateDigest);
  assert.deepEqual(left.receipts, right.receipts);
});
