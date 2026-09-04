import { CuriosityWorld } from "../dist/curiosity-world.js";

const steps = Number(process.argv[2] || 64);
const seedCount = Number(process.argv[3] || 12);
const forbidden = ["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"];
const results = [];

for (let index = 1; index <= seedCount; index += 1) {
  const seed = `AXM-CURIOSITY-${String(index).padStart(3, "0")}`;
  const world = new CuriosityWorld({ seed });
  world.run(steps);
  const policyText = JSON.stringify(world.receipts.map((receipt) => receipt.policyView)).toLowerCase();
  const leakedTerms = forbidden.filter((term) => policyText.includes(term));
  results.push({
    seed,
    steps,
    digest: world.stateDigest,
    changedCells: world.stats().changedCells,
    materializedCells: world.stats().materializedCells,
    growthEvents: world.stats().growthEvents,
    damageEvents: world.stats().damageEvents,
    bloomCells: world.stats().bloomCells,
    scarCells: world.stats().scarCells,
    echoCells: world.stats().echoCells,
    healthDelta: world.stats().healthDelta,
    patternKinds: world.state.derived.patterns.map((pattern) => pattern.kind),
    policyLeak: leakedTerms,
    replayStatus: world.verifyReplay().status,
  });
}

const summary = {
  schema: "axm.stateborn.curiosity-multiseed-probe/v1",
  stepsPerSeed: steps,
  seedCount,
  allReplayPass: results.every((result) => result.replayStatus === "PASS"),
  allPolicyViewsClean: results.every((result) => result.policyLeak.length === 0),
  seedsWithGrowthAndDamage: results.filter((result) => result.growthEvents > 0 && result.damageEvents > 0).length,
  healthDrift: {
    positive: results.filter((result) => result.healthDelta > 0).length,
    zero: results.filter((result) => result.healthDelta === 0).length,
    negative: results.filter((result) => result.healthDelta < 0).length,
  },
  changedCells: {
    minimum: Math.min(...results.map((result) => result.changedCells)),
    maximum: Math.max(...results.map((result) => result.changedCells)),
  },
  results,
};

console.log(JSON.stringify(summary, null, 2));
