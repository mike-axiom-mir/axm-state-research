import { performance } from "node:perf_hooks";
import { StateFabric, deepClone } from "../dist/engine.js";
import { createWorldEngine } from "../dist/world.js";

const sizes = process.argv.slice(2).map(Number).filter(Number.isFinite);
const requestedSizes = sizes.length ? sizes : [0, 1000, 10000, 50000];
const results = [];

for (const dormantNodeCount of requestedSizes) {
  const donor = createWorldEngine("AXM-SCALE-BASELINE");
  const config = donor.config;
  const state = deepClone(config.initialState);
  for (let index = 0; index < dormantNodeCount; index += 1) {
    state.nodes[`dormant_${index}`] = {
      id: `dormant_${index}`,
      kind: "dormant_probe",
      chunk: Math.floor(index / 256),
      value: index % 17,
    };
  }
  const memoryBefore = process.memoryUsage().heapUsed;
  const constructStarted = performance.now();
  const engine = new StateFabric({ ...config, initialState: state });
  const constructMs = performance.now() - constructStarted;
  const actionStarted = performance.now();
  const receipt = engine.perform("gather", { resource: "food" }, {
    operationId: `scale-${dormantNodeCount}`,
    expectedRevision: 0,
  });
  const actionMs = performance.now() - actionStarted;
  const memoryAfter = process.memoryUsage().heapUsed;
  results.push({
    dormantNodeCount,
    constructMs: Number(constructMs.toFixed(3)),
    actionMs: Number(actionMs.toFixed(3)),
    heapDeltaMiB: Number(((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(3)),
    receiptStatus: receipt.status,
    wokenNodes: receipt.wokenNodes.length,
    firedNodes: receipt.firedNodes.length,
  });
}

console.log(JSON.stringify({
  schema: "axm.stateborn.v01-scale-baseline/v1",
  runtime: process.version,
  warning: "Timing is environment-specific; growth shape is the evidence.",
  results,
}, null, 2));
