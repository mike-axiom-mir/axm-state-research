import test from "node:test";
import assert from "node:assert/strict";
import { ActorStateOwner, CapsuleSession, capsuleContracts, verifyCapsule, verifyReturnPacket } from "../dist/capsule-world.js";

function pair() {
  const a = new ActorStateOwner({ seed: "owner-a", ownerId: "aster", displayName: "Aster", color: "amber" });
  const b = new ActorStateOwner({ seed: "owner-b", ownerId: "briar", displayName: "Briar", color: "violet" });
  return { a, b, capsuleA: a.issueCapsule().capsule, capsuleB: b.issueCapsule().capsule };
}

test("capsule exports only consented public paths", () => {
  const { a, capsuleA } = pair();
  assert.equal(verifyCapsule(capsuleA).status, "PASS");
  assert.deepEqual(Object.keys(capsuleA.projection).sort(), capsuleContracts.exportAllowlist.sort());
  assert.equal(JSON.stringify(capsuleA).includes(a.state.private.localNote), false);
  assert.equal(JSON.stringify(capsuleA).includes(a.state.private.recoveryToken), false);
});

test("source refuses non-consentable export or return paths", () => {
  const owner = new ActorStateOwner();
  const before = owner.stateDigest;
  const exportRefusal = owner.issueCapsule({ exportPaths: ["private.localNote"], operationId: "bad-export" });
  const returnRefusal = owner.issueCapsule({ returnPaths: ["private.recoveryToken"], operationId: "bad-return" });
  assert.equal(exportRefusal.status, "REFUSED");
  assert.equal(returnRefusal.status, "REFUSED");
  assert.equal(owner.stateDigest, before);
});

test("tampered capsule is refused before composition", () => {
  const { capsuleA } = pair();
  capsuleA.projection["public.displayName"] = "Impostor";
  const session = new CapsuleSession();
  const before = session.stateDigest;
  const receipt = session.compose(capsuleA);
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "CAPSULE_DIGEST");
  assert.equal(session.stateDigest, before);
});

test("two actor states compose into distinct namespaces", () => {
  const { capsuleA, capsuleB } = pair();
  const session = new CapsuleSession();
  session.compose(capsuleA); session.compose(capsuleB);
  assert.deepEqual(Object.keys(session.state.projections).sort(), ["aster", "briar"]);
  assert.equal(session.state.projections.aster.namespace, "capsules.aster");
  assert.equal(session.state.projections.briar.namespace, "capsules.briar");
  assert.notEqual(session.state.projections.aster.capsuleId, session.state.projections.briar.capsuleId);
});

test("owner namespace collision stays explicit rather than fusing", () => {
  const owner = new ActorStateOwner({ ownerId: "aster" });
  const full = owner.issueCapsule({ operationId: "full" }).capsule;
  const narrow = owner.issueCapsule({ exportPaths: ["public.displayName", "public.position"], operationId: "narrow" }).capsule;
  const session = new CapsuleSession();
  session.compose(full);
  const before = session.stateDigest;
  const receipt = session.compose(narrow);
  assert.equal(receipt.status, "REFUSED");
  assert.equal(receipt.reason, "OWNER_NAMESPACE_COLLISION");
  assert.ok(receipt.conflict.existingCapsuleId);
  assert.equal(session.stateDigest, before);
});

test("session operations are idempotent and stale actions refuse", () => {
  const { capsuleA } = pair();
  const session = new CapsuleSession();
  const first = session.compose(capsuleA, { operationId: "once", expectedRevision: 0 });
  const after = session.stateDigest;
  const duplicate = session.compose(capsuleA, { operationId: "once", expectedRevision: 1 });
  const stale = session.act("aster", { kind: "signal", signal: "open" }, { operationId: "stale", expectedRevision: 0 });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.receiptId, first.receiptId);
  assert.equal(stale.status, "REFUSED");
  assert.equal(session.stateDigest, after);
});

test("independent capsule actions can earn a receipt-backed shared signal", () => {
  const { capsuleA, capsuleB } = pair();
  const session = new CapsuleSession();
  session.compose(capsuleA); session.compose(capsuleB);
  session.act("aster", { kind: "signal", signal: "open" });
  assert.equal(session.state.threads.length, 0);
  session.act("briar", { kind: "signal", signal: "open" });
  assert.equal(session.state.threads.length, 1);
  assert.equal(session.state.threads[0].kind, "shared_signal");
  assert.deepEqual(session.state.threads[0].owners, ["aster", "briar"]);
  assert.equal(session.state.threads[0].evidence.length, 2);
});

test("session activity cannot mutate either source", () => {
  const { a, b, capsuleA, capsuleB } = pair();
  const aDigest = a.stateDigest; const bDigest = b.stateDigest;
  const session = new CapsuleSession();
  session.compose(capsuleA); session.compose(capsuleB);
  session.act("aster", { kind: "move", direction: "east" });
  session.act("briar", { kind: "signal", signal: "turn" });
  assert.equal(a.stateDigest, aDigest);
  assert.equal(b.stateDigest, bDigest);
});

test("return packet proposes only consented paths and has no write authority", () => {
  const { a, capsuleA } = pair();
  const sourceBefore = a.stateDigest;
  const session = new CapsuleSession();
  session.compose(capsuleA);
  session.act("aster", { kind: "move", direction: "east" });
  session.act("aster", { kind: "signal", signal: "pulse" });
  const proposal = session.proposeReturn("aster");
  assert.equal(proposal.status, "PROPOSED");
  assert.equal(verifyReturnPacket(proposal.packet).status, "PASS");
  assert.deepEqual(proposal.packet.deltas.map((delta) => delta.path).sort(), capsuleA.consent.returnPaths);
  assert.equal(a.stateDigest, sourceBefore);
});

test("source accepts only explicitly selected return paths", () => {
  const { a, capsuleA } = pair();
  const session = new CapsuleSession();
  session.compose(capsuleA);
  session.act("aster", { kind: "move", direction: "east" });
  session.act("aster", { kind: "signal", signal: "pulse" });
  const packet = session.proposeReturn("aster").packet;
  const receipt = a.applyReturn(packet, { acceptedPaths: ["accepted.sharedSignals"], expectedRevision: 0 });
  assert.equal(receipt.status, "APPLIED");
  assert.deepEqual(receipt.changedPaths, ["accepted.sharedSignals"]);
  assert.equal(a.state.accepted.sharedSignals.length, 1);
  assert.equal(a.state.accepted.visitedCells.length, 0);
  assert.deepEqual(receipt.ignoredPaths, ["accepted.visitedCells"]);
});

test("tampered and stale return packets fail closed", () => {
  const { a, capsuleA } = pair();
  const session = new CapsuleSession();
  session.compose(capsuleA); session.act("aster", { kind: "signal", signal: "hush" });
  const packet = session.proposeReturn("aster").packet;
  const tampered = structuredClone(packet);
  tampered.deltas[0].values.push("forged");
  const before = a.stateDigest;
  assert.equal(a.applyReturn(tampered, { acceptedPaths: ["accepted.sharedSignals"], operationId: "tampered" }).reason, "RETURN_DIGEST");
  assert.equal(a.stateDigest, before);
  assert.equal(a.applyReturn(packet, { acceptedPaths: ["accepted.sharedSignals"], operationId: "first" }).status, "APPLIED");
  const after = a.stateDigest;
  assert.equal(a.applyReturn(packet, { acceptedPaths: ["accepted.sharedSignals"], operationId: "stale" }).reason, "RETURN_SOURCE_STALE");
  assert.equal(a.stateDigest, after);
});

test("detachment removes projection while retaining separation evidence", () => {
  const { a, capsuleA } = pair();
  const sourceBefore = a.stateDigest;
  const session = new CapsuleSession();
  session.compose(capsuleA); session.act("aster", { kind: "signal", signal: "open" });
  const receipt = session.detach("aster", { expectedRevision: 2 });
  assert.equal(receipt.status, "APPLIED");
  assert.equal(session.state.projections.aster, undefined);
  assert.ok(session.state.detached.aster.eventIds.length === 1);
  assert.equal(a.stateDigest, sourceBefore);
});

test("session replay reconstructs composition, collaboration, and separation", () => {
  const { capsuleA, capsuleB } = pair();
  const session = new CapsuleSession({ seed: "capsule-replay" });
  session.compose(capsuleA); session.compose(capsuleB);
  session.act("aster", { kind: "move", direction: "east" });
  session.act("aster", { kind: "move", direction: "west" });
  session.act("aster", { kind: "signal", signal: "turn" });
  session.act("briar", { kind: "signal", signal: "turn" });
  session.detach("briar");
  const replay = session.verifyReplay();
  assert.equal(replay.status, "PASS");
  assert.equal(replay.actual, session.stateDigest);
});
