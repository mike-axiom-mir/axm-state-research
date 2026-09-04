import { performance } from "node:perf_hooks";
import { LivingWorld } from "../dist/living-world.js";

const sizes = [
  { width: 1024, height: 1024 },
  { width: 10000, height: 10000 },
];
const results = [];

for (const size of sizes) {
  const memoryBefore = process.memoryUsage().heapUsed;
  const constructStarted = performance.now();
  const world = new LivingWorld({ ...size, seed: "AXM-SCALE-V02" });
  const constructMs = performance.now() - constructStarted;
  const actionStarted = performance.now();
  const receipt = world.advance({ kind: "share", target: "rhea", resource: "food" }, {
    operationId: `scale-${size.width}`,
    expectedRevision: 0,
  });
  const actionMs = performance.now() - actionStarted;
  const memoryAfter = process.memoryUsage().heapUsed;
  results.push({
    logicalCells: size.width * size.height,
    logicalNodes: world.logicalNodeCount,
    constructMs: Number(constructMs.toFixed(3)),
    actionMs: Number(actionMs.toFixed(3)),
    heapDeltaMiB: Number(((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(3)),
    materializedCells: world.stats().materializedCells,
    changedCells: world.stats().changedCells,
    wokenNodes: receipt.wokenNodes.length,
    actorEvents: receipt.actorEvents.length,
    receiptStatus: receipt.status,
    replayStatus: world.verifyReplay().status,
  });
}

console.log(JSON.stringify({
  schema: "axm.stateborn.v02-sparse-scale/v1",
  runtime: process.version,
  warning: "Timing and heap deltas are environment-specific; compare architecture and growth shape, not absolute speed.",
  results,
}, null, 2));
