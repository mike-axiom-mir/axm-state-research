import { ActorStateOwner, CapsuleSession, verifyCapsule, verifyReturnPacket } from "../dist/capsule-world.js";

const runs = [];
for (let index = 1; index <= 16; index += 1) {
  const sourceA = new ActorStateOwner({ seed: `capsule-a-${index}`, ownerId: `a-${index}`, displayName: "Aster", color: "amber" });
  const sourceB = new ActorStateOwner({ seed: `capsule-b-${index}`, ownerId: `b-${index}`, displayName: "Briar", color: "violet" });
  const capsuleA = sourceA.issueCapsule().capsule;
  const capsuleB = sourceB.issueCapsule().capsule;
  const sourceBefore = [sourceA.stateDigest, sourceB.stateDigest];
  const session = new CapsuleSession({ seed: `capsule-session-${index}` });
  session.compose(capsuleA); session.compose(capsuleB);
  const signal = ["hush", "pulse", "turn", "open"][index % 4];
  session.act(sourceA.state.ownerId, { kind: "signal", signal });
  session.act(sourceB.state.ownerId, { kind: "signal", signal });
  const returnA = session.proposeReturn(sourceA.state.ownerId).packet;
  const returnB = session.proposeReturn(sourceB.state.ownerId).packet;
  const unchangedBeforeAcceptance = sourceA.stateDigest === sourceBefore[0] && sourceB.stateDigest === sourceBefore[1];
  const acceptedA = sourceA.applyReturn(returnA, { acceptedPaths: ["accepted.sharedSignals"] });
  const acceptedB = sourceB.applyReturn(returnB, { acceptedPaths: [] });
  const tampered = structuredClone(returnA);
  tampered.deltas[0].values.push("forged");
  const tamperRefusal = new ActorStateOwner({ seed: `capsule-a-${index}`, ownerId: `a-${index}`, displayName: "Aster", color: "amber" })
    .applyReturn(tampered, { acceptedPaths: ["accepted.sharedSignals"] });
  runs.push({
    run: index, capsuleA: verifyCapsule(capsuleA).status, capsuleB: verifyCapsule(capsuleB).status,
    namespacesDistinct: session.state.projections[sourceA.state.ownerId].namespace !== session.state.projections[sourceB.state.ownerId].namespace,
    sharedThreads: session.state.threads.length, returnA: verifyReturnPacket(returnA).status, returnB: verifyReturnPacket(returnB).status,
    unchangedBeforeAcceptance, acceptedA: acceptedA.status, acceptedB: acceptedB.status,
    aReturnedSignals: sourceA.state.accepted.sharedSignals.length, bReturnedSignals: sourceB.state.accepted.sharedSignals.length,
    tamperRefusal: tamperRefusal.reason, replay: session.verifyReplay().status,
  });
}

const result = { schema: "axm.stateborn.capsule-probe/v1", runCount: runs.length,
  allCapsulesValid: runs.every((run) => run.capsuleA === "PASS" && run.capsuleB === "PASS"),
  allNamespacesDistinct: runs.every((run) => run.namespacesDistinct),
  allSharedThreads: runs.every((run) => run.sharedThreads === 1),
  allSourcesUnchangedBeforeAcceptance: runs.every((run) => run.unchangedBeforeAcceptance),
  allSelectiveReturns: runs.every((run) => run.aReturnedSignals === 1 && run.bReturnedSignals === 0),
  allTamperingRefused: runs.every((run) => run.tamperRefusal === "RETURN_DIGEST"),
  allReplay: runs.every((run) => run.replay === "PASS"), runs: runs };
console.log(JSON.stringify(result, null, 2));
if (Object.entries(result).some(([key, value]) => key.startsWith("all") && value !== true)) process.exitCode = 1;
