import { stateTransportGate } from "../dist/state-transport.js";

const result = stateTransportGate();
result.gatePass = result.freezeValid
  && result.heldOutRuns === 10
  && result.solved === 7
  && result.refused === 1
  && result.deadlocked === 2
  && result.totalDrops > 0
  && result.totalDuplicatesSuppressed > 0
  && result.totalExpired > 0
  && result.totalReorders > 0
  && result.totalDisconnects > 0
  && result.totalRecoveryPasses > 0
  && result.allExpectedOutcomes
  && result.allReplay
  && result.allSourcesUnchanged
  && result.allConsentBound
  && result.allPrivateClean
  && result.allPayloadsStateOnly
  && result.allDuplicatesNoEffect
  && result.allExpiredNoEffect
  && result.interruptedRecoverySolved
  && result.retainedTransportFailure;

console.log(JSON.stringify(result, null, 2));
if (!result.gatePass) process.exitCode = 1;
