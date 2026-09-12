import test from "node:test";
import assert from "node:assert/strict";

await import("../dist/transport-experience.js");
const experience = globalThis.AXM_STATE_TRANSPORT_EXPERIENCE;

test("transport feedback describes applied and held effects from receipt events", () => {
  assert.equal(experience.describeEvent({ type: "DELIVER_APPLIED", logicalKey: "proposal" }), "proposal accepted · protocol state advanced");
  assert.equal(experience.describeEvent({ type: "DUPLICATE_SUPPRESSED", logicalKey: "proposal" }), "duplicate proposal blocked · no second state effect");
  assert.equal(experience.describeEvent({ type: "DROP", logicalKey: "offer-a" }), "offer-a dropped before delivery · protocol state held");

  const applied = experience.summarizeDelta({
    action: "tick",
    beforeTick: 2,
    afterTick: 3,
    protocolChanged: true,
    events: [{ type: "SEND", logicalKey: "proposal", attempt: 1, faultKind: "PASS" }, { type: "DELIVER_APPLIED", logicalKey: "proposal" }],
  });
  assert.equal(applied.effect, "PROTOCOL STATE CHANGED");
  assert.equal(applied.tone, "applied");

  const duplicate = experience.summarizeDelta({
    action: "tick",
    beforeTick: 3,
    afterTick: 4,
    protocolChanged: false,
    events: [{ type: "DUPLICATE_SUPPRESSED", logicalKey: "proposal" }],
  });
  assert.equal(duplicate.effect, "PROTOCOL STATE HELD");
  assert.equal(duplicate.tone, "blocked");
});

test("transport feedback keeps recovery, disconnect, and deadlock semantically distinct", () => {
  assert.equal(experience.dominantTone([{ type: "SEND" }, { type: "DISCONNECT" }]), "offline");
  assert.equal(experience.dominantTone([{ type: "RECONNECT" }, { type: "RECOVERY_PASS" }]), "recovered");
  assert.equal(experience.dominantTone([{ type: "RECOVERY_PASS" }, { type: "ATTEMPTS_EXHAUSTED" }]), "blocked");
  assert.match(experience.describeEvent({ type: "RECOVERY_PASS" }), /exact protocol state/);
  assert.match(experience.describeEvent({ type: "ATTEMPTS_EXHAUSTED", logicalKey: "offer-a" }), /deadlocked/);
});

test("next-action copy follows only visible transport state", () => {
  assert.match(experience.nextActionFor({ closed: true, online: true, queue: [] }), /verify exact replay/);
  assert.match(experience.nextActionFor({ closed: false, online: false, queue: [] }), /reconnect window/);
  assert.match(experience.nextActionFor({ closed: false, online: true, queue: [{ status: "QUEUED" }] }), /1 queued envelope/);
  assert.match(experience.nextActionFor({ closed: false, online: true, queue: [] }), /plan the next required packet/);
});

test("keyboard mapping is bounded and does not invent gameplay authority", () => {
  assert.equal(experience.shortcutAction(" "), "tick");
  assert.equal(experience.shortcutAction("R"), "run");
  assert.equal(experience.shortcutAction("v"), "replay");
  assert.equal(experience.shortcutAction("Escape"), "reset");
  assert.equal(experience.shortcutAction("["), "previous");
  assert.equal(experience.shortcutAction("]"), "next");
  assert.equal(experience.shortcutAction("ArrowUp"), null);
});
