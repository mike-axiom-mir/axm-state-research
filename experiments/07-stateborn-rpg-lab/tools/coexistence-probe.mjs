import { CoexistenceWorld } from "../dist/coexistence-world.js";

const cycles = Number(process.argv[2] || 64);
const seedCount = Number(process.argv[3] || 12);
const runs = [];
for (let index = 1; index <= seedCount; index += 1) {
  const seed = `AXM-COEXIST-${String(index).padStart(3, "0")}`;
  const world = new CoexistenceWorld({ seed });
  world.run(cycles);
  const stats = world.stats();
  const clean = world.receipts.every((receipt) => {
    const view = JSON.stringify(receipt.machineDecision?.view || {}).toLowerCase();
    return !["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"].some((term) => view.includes(term));
  });
  runs.push({ seed, digest: world.stateDigest, replay: world.verifyReplay().status, machineViewsClean: clean,
    cycles: stats.cycles, events: stats.events, changedCells: stats.changedCells, growth: stats.growthEvents,
    damage: stats.damageEvents, threads: stats.threads, sharedSites: stats.sharedSites,
    threeWayMarks: stats.threeWayMarks, healthDelta: stats.healthDelta, materializedCells: stats.materializedCells });
}
const result = { schema: "axm.stateborn.coexistence-probe/v1", cyclesPerSeed: cycles, seedCount,
  allReplay: runs.every((run) => run.replay === "PASS"),
  allMachineViewsClean: runs.every((run) => run.machineViewsClean),
  allHaveSharedSites: runs.every((run) => run.sharedSites > 0),
  allHaveThreeWayMarks: runs.every((run) => run.threeWayMarks > 0),
  allHaveGrowthAndDamage: runs.every((run) => run.growth > 0 && run.damage > 0), runs };
console.log(JSON.stringify(result, null, 2));
if (!result.allReplay || !result.allMachineViewsClean) process.exitCode = 1;
