import {
  LANGUAGE_OPS, LANGUAGE_OUTCOMES, LANGUAGE_REASONS, StateLanguageTrial, stateLanguageGate,
} from "../dist/state-language.js";

const gate = stateLanguageGate();

const textTrial = new StateLanguageTrial("held-complement");
const textPacket = textTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 1], text: "not a state payload" });
const textAttack = textTrial.applyPacket(textPacket, { operationId: "probe-text" });

const tamperTrial = new StateLanguageTrial("held-complement");
const tampered = tamperTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 1] });
tampered.payload.v[0] = 0;
const tamperAttack = tamperTrial.applyPacket(tampered, { operationId: "probe-tamper" });

const staleTrial = new StateLanguageTrial("held-complement");
const stale = staleTrial.makePacket("b", LANGUAGE_OPS.OFFER, { v: [0, 2, 0] });
staleTrial.emitOffer("a");
const staleAttack = staleTrial.applyPacket(stale, { operationId: "probe-stale" });

const result = {
  ...gate,
  adversarial: {
    textPayload: { status: textAttack.status, reasonCode: textAttack.reasonCode, stateUnchanged: textTrial.state.messages.length === 0 },
    tamperedDigest: { status: tamperAttack.status, reasonCode: tamperAttack.reasonCode, stateUnchanged: tamperTrial.state.messages.length === 0 },
    stalePacket: { status: staleAttack.status, reasonCode: staleAttack.reasonCode, onlyFreshOfferPresent: staleTrial.state.messages.length === 1 },
  },
};

result.gatePass = result.freezeValid
  && result.solved >= 1
  && result.refused >= 1
  && result.deadlocked >= 1
  && result.allPrivateClean
  && result.allPayloadsStateOnly
  && result.allAppliedDeltasAccepted
  && result.allSourcesUnchanged
  && result.allReplay
  && result.allOrderNormalized
  && result.baselineAgreement
  && result.adversarial.textPayload.reasonCode === LANGUAGE_REASONS.HUMAN_LANGUAGE_FIELD
  && result.adversarial.tamperedDigest.reasonCode === LANGUAGE_REASONS.PACKET_DIGEST
  && result.adversarial.stalePacket.reasonCode === LANGUAGE_REASONS.STALE_SEQUENCE
  && result.runs.some((run) => run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED);

console.log(JSON.stringify(result, null, 2));
if (!result.gatePass) process.exitCode = 1;
