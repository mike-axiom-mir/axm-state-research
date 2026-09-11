import { canonicalStringify, deepClone, digest } from "./engine.js";
import { StateLanguageTrial } from "./state-language.js";
import { STATE_TRANSPORT_FIXTURES } from "./state-transport.js";

const AUTHORITY = Object.freeze({
  automaticResume: false,
  transportMutation: false,
  canonicalStateMutation: false,
  merge: false,
  canon: false,
});

function sealVerification(receipt) {
  const sealed = { ...receipt, authority: { ...AUTHORITY } };
  sealed.verificationDigest = digest(sealed);
  return sealed;
}

function hold(fixtureId, checkpointDigest, reasonCode, at = null) {
  const receipt = {
    schema: "axm.stateborn.transport-checkpoint-verification/v1",
    status: "HOLD",
    fixtureId: fixtureId ?? null,
    checkpointDigest: checkpointDigest ?? null,
    reasonCode,
  };
  if (at !== null) receipt.at = at;
  return sealVerification(receipt);
}

function fixtureById(id) {
  return STATE_TRANSPORT_FIXTURES.find((candidate) => candidate.id === id) ?? null;
}

export function verifyTransportCheckpoint(fixtureId, checkpointInput) {
  const fixture = fixtureById(fixtureId);
  if (!fixture) return hold(fixtureId, null, "CHECKPOINT_FIXTURE");

  let checkpoint;
  try {
    checkpoint = deepClone(checkpointInput);
  } catch {
    return hold(fixture.id, null, "CHECKPOINT_SCHEMA");
  }
  if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
    return hold(fixture.id, null, "CHECKPOINT_SCHEMA");
  }

  const sealed = checkpoint.checkpointDigest;
  delete checkpoint.checkpointDigest;
  if (typeof sealed !== "string" || digest(checkpoint) !== sealed) {
    return hold(fixture.id, typeof sealed === "string" ? sealed : null, "CHECKPOINT_DIGEST");
  }
  if (checkpoint.schema !== "axm.stateborn.transport-checkpoint/v2"
    || checkpoint.fixtureId !== fixture.id
    || !Array.isArray(checkpoint.engineReceipts)
    || !Array.isArray(checkpoint.engineReceiptIds)
    || !Array.isArray(checkpoint.deliveredDigests)) {
    return hold(fixture.id, sealed, "CHECKPOINT_SCHEMA");
  }

  const receiptIds = checkpoint.engineReceipts.map((receipt) => receipt?.receiptId);
  if (canonicalStringify(receiptIds) !== canonicalStringify(checkpoint.engineReceiptIds)) {
    return hold(fixture.id, sealed, "CHECKPOINT_RECEIPTS");
  }

  const recovered = new StateLanguageTrial(fixture.languageFixtureId);
  for (const expected of checkpoint.engineReceipts) {
    let actual;
    try {
      actual = expected?.kind === "CLOSE"
        ? recovered.closeDeadlock({ operationId: expected.operationId })
        : recovered.applyPacket(expected.packet, { operationId: expected.operationId });
    } catch {
      return hold(fixture.id, sealed, "CHECKPOINT_REPLAY", expected?.index ?? null);
    }
    if (actual.receiptId !== expected.receiptId) {
      return hold(fixture.id, sealed, "CHECKPOINT_REPLAY", expected.index ?? null);
    }
  }

  const recoveredReceiptIds = recovered.receipts.map((receipt) => receipt.receiptId);
  if (recovered.stateDigest !== checkpoint.engineStateDigest
    || canonicalStringify(recoveredReceiptIds) !== canonicalStringify(checkpoint.engineReceiptIds)
    || canonicalStringify(recovered.sourceDigests) !== canonicalStringify(checkpoint.sourceDigests)) {
    return hold(fixture.id, sealed, "CHECKPOINT_STATE");
  }

  return sealVerification({
    schema: "axm.stateborn.transport-checkpoint-verification/v1",
    status: "PASS",
    fixtureId: fixture.id,
    checkpointDigest: sealed,
    engineStateDigest: recovered.stateDigest,
    engineReceiptIds: recoveredReceiptIds,
    sourceDigests: deepClone(recovered.sourceDigests),
    deliveredDigests: deepClone(checkpoint.deliveredDigests),
    reasonCode: null,
  });
}
