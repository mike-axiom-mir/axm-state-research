import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digest } from "../dist/engine.js";
import {
  HostileTransportTrial,
  verifyTransportCheckpoint,
} from "../dist/state-transport.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = path.join(ROOT, "tools", "verify-state-transport-checkpoint.mjs");

function checkpointWithAcceptedReceipt() {
  const trial = new HostileTransportTrial("held-disconnect-recover");
  trial.tickOnce();
  trial.tickOnce();
  const checkpoint = structuredClone(trial.latestCheckpoint);
  assert.ok(checkpoint.engineReceiptIds.length > 0);
  return checkpoint;
}

function verifyInFreshProcess(checkpoint) {
  const child = spawnSync(process.execPath, [VERIFIER], {
    cwd: ROOT,
    encoding: "utf8",
    input: `${JSON.stringify({ fixtureId: "held-disconnect-recover", checkpoint })}\n`,
  });
  const stdout = child.stdout.trim();
  return {
    status: child.status,
    stderr: child.stderr.trim(),
    receipt: stdout ? JSON.parse(stdout) : null,
  };
}

test("a serialized transport checkpoint verifies identically in a fresh Node process", () => {
  const checkpoint = checkpointWithAcceptedReceipt();
  const local = verifyTransportCheckpoint("held-disconnect-recover", checkpoint);
  assert.equal(local.status, "PASS");
  assert.equal(local.authority.automaticResume, false);
  assert.equal(local.authority.transportMutation, false);

  const fresh = verifyInFreshProcess(checkpoint);
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.deepEqual(fresh.receipt, local);
  assert.equal(fresh.receipt.checkpointDigest, checkpoint.checkpointDigest);
  assert.deepEqual(fresh.receipt.engineReceiptIds, checkpoint.engineReceiptIds);
  assert.equal(fresh.receipt.engineStateDigest, checkpoint.engineStateDigest);
});

test("a fresh process rejects an altered receipt even after the outer checkpoint is resealed", () => {
  const checkpoint = checkpointWithAcceptedReceipt();
  const tampered = structuredClone(checkpoint);
  tampered.engineReceipts[0].packet.payload = {
    ...tampered.engineReceipts[0].packet.payload,
    processRestartTamper: true,
  };
  delete tampered.checkpointDigest;
  tampered.checkpointDigest = digest(tampered);

  const fresh = verifyInFreshProcess(tampered);
  assert.equal(fresh.status, 2, fresh.stderr);
  assert.equal(fresh.receipt.status, "HOLD");
  assert.equal(fresh.receipt.reasonCode, "CHECKPOINT_REPLAY");
  assert.equal(fresh.receipt.authority.automaticResume, false);
  assert.equal(fresh.receipt.authority.transportMutation, false);
});
