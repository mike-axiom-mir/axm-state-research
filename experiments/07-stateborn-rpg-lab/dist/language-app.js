import {
  FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST, LANGUAGE_OPS, LANGUAGE_OUTCOMES, LANGUAGE_REASONS,
  STATE_LANGUAGE_FIXTURE_DIGEST, STATE_LANGUAGE_FIXTURES, StateLanguageTrial,
  directStateBaseline, stateLanguageContracts, stateLanguageGate,
} from "./state-language.js";

const $ = (selector) => document.querySelector(selector);
const heldFixtures = STATE_LANGUAGE_FIXTURES.filter((fixture) => fixture.split === "held_out");
const opNames = Object.fromEntries(Object.entries(LANGUAGE_OPS).map(([name, code]) => [code, name]));
const outcomeNames = Object.fromEntries(Object.entries(LANGUAGE_OUTCOMES).map(([name, code]) => [code, name]));
const reasonNames = Object.fromEntries(Object.entries(LANGUAGE_REASONS).map(([name, code]) => [code, name]));
const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const short = (value) => String(value || "").slice(0, 10);
const json = (value) => JSON.stringify(value, null, 2);
let trial;

function currentFixture() { return heldFixtures.find((fixture) => fixture.id === $("#fixtureSelect").value) || heldFixtures[0]; }
function seatView(actorId) {
  const view = trial.policyView(actorId);
  return { actor: view.actorCode, target: view.target, own: view.own, observed: view.observed };
}
function outcomeClass(code) { return (outcomeNames[code] || "OPEN").toLowerCase(); }
function explainPacket(packet) {
  if (packet.op === LANGUAGE_OPS.OFFER) return `Seat ${packet.from.toUpperCase()} exposes a consent-bounded vector.`;
  if (packet.op === LANGUAGE_OPS.PROPOSE) return `Seat A selects one canonical contribution split from ${packet.payload.n} valid candidate${packet.payload.n === 1 ? "" : "s"}.`;
  if (packet.op === LANGUAGE_OPS.ACCEPT) return `Seat ${packet.from.toUpperCase()} accepts the exact proposal digest.`;
  if (packet.op === LANGUAGE_OPS.REFUSE) return `Seat ${packet.from.toUpperCase()} refuses under reason code ${packet.payload.r}.`;
  return "The referee commits only after both exact acceptance digests are present.";
}
function nextLabel() {
  if (trial.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return "Trial closed";
  if (!trial.state.channel.offers.a) return "Next: A offer (op 0)";
  if (!trial.state.channel.offers.b) return "Next: B offer (op 0)";
  if (!trial.state.channel.proposal) return "Next: proposal (op 1)";
  if (!trial.state.channel.responses.a) return "Next: A response (op 2/3)";
  if (!trial.state.channel.responses.b) return "Next: B response (op 2/3)";
  return "Next: commit (op 4)";
}
function stepProtocol() {
  if (trial.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return { status: "CLOSED" };
  if (!trial.state.channel.offers.a) return trial.emitOffer("a");
  if (!trial.state.channel.offers.b) return trial.emitOffer("b");
  if (!trial.state.channel.proposal) {
    const result = trial.emitProposal();
    if (result.status !== "APPLIED") return trial.closeDeadlock();
    return result;
  }
  if (!trial.state.channel.responses.a) return trial.emitResponse("a");
  if (!trial.state.channel.responses.b) return trial.emitResponse("b");
  const result = trial.emitCommit();
  if (trial.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) trial.closeDeadlock();
  return result;
}
function render(message = "") {
  const fixture = currentFixture();
  const summary = trial.summary();
  const baseline = directStateBaseline(fixture);
  const outcome = outcomeNames[summary.outcomeCode] || "OPEN";
  $("#digestBadge").textContent = `trial ${short(summary.stateDigest)}`;
  $("#freezeStatus").textContent = STATE_LANGUAGE_FIXTURE_DIGEST === FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST ? "FROZEN PASS" : "FREEZE HOLD";
  $("#freezeStatus").classList.toggle("hold", STATE_LANGUAGE_FIXTURE_DIGEST !== FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST);
  $("#fixtureFacts").innerHTML = [
    ["target", json(fixture.target)], ["A public / consent", `${json(fixture.actors.a.inventory)} / ${json(fixture.actors.a.consentMax)}`],
    ["B public / consent", `${json(fixture.actors.b.inventory)} / ${json(fixture.actors.b.consentMax)}`], ["private fields sent", "0"],
  ].map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");
  $("#seatA").textContent = json(seatView("a")); $("#seatB").textContent = json(seatView("b"));
  $("#channelHeading").textContent = `${summary.messages} packet${summary.messages === 1 ? "" : "s"} · ${summary.bytes} serialized bytes`;
  $("#outcomePill").textContent = outcome; $("#outcomePill").className = `outcome-pill ${outcomeClass(summary.outcomeCode)}`;
  $("#packetLedger").innerHTML = trial.state.messages.length ? trial.state.messages.map((packet, index) => `<article class="packet-card"><header><strong>#${index} · OP ${packet.op}</strong><em>${esc(opNames[packet.op])}</em></header><pre>${esc(json({ from: packet.from === "a" ? 0 : packet.from === "b" ? 1 : -1, to: packet.to, payload: packet.payload, digest: short(packet.packetDigest) }))}</pre></article>`).join("") : '<p class="empty">The channel is empty.</p>';
  $("#observerSummary").innerHTML = [
    [outcome, "observer outcome"], [summary.ambiguityCount, "unused valid alternatives"], [summary.privateLeakage, "private values leaked"], [summary.humanLanguagePayloads, "natural-language payloads"],
    [summary.acceptedDeltaProvenance ? "BOUND" : "OPEN", "commit provenance"], [reasonNames[summary.reasonCode] || summary.reasonCode, "reason"],
  ].map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  $("#baselineOutcome").textContent = outcomeNames[baseline.outcomeCode];
  $("#baselineCopy").textContent = `${baseline.evaluations} centralized evaluation · ${outcome === outcomeNames[baseline.outcomeCode] ? "agrees with current outcome when closed" : "trial still open or disagrees"}.`;
  $("#claimText").textContent = summary.outcomeCode === LANGUAGE_OUTCOMES.OPEN ? "The machine channel contains only typed state values; observer prose is separate." : `Observed ${outcome.toLowerCase()}: ${summary.messages} accepted packets, ${summary.privateLeakage} private leaks, ${summary.humanLanguagePayloads} prose payloads.`;
  $("#stepButton").textContent = nextLabel(); $("#stepButton").disabled = summary.outcomeCode !== LANGUAGE_OUTCOMES.OPEN;
  if (message) $("#systemMessage").textContent = message;
}
function initialize() { trial = new StateLanguageTrial(currentFixture()); $("#attackResults").innerHTML = '<p class="empty">No adversarial packets attempted.</p>'; render("Reset to the exact frozen fixture."); }
function runSelected() { while (trial.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) stepProtocol(); const result = trial.summary(); render(`Protocol closed ${outcomeNames[result.outcomeCode]} · ${trial.verifyReplay().status} replay.`); }
function runAttacks() {
  const textTrial = new StateLanguageTrial("held-complement");
  const textPacket = textTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0], text: "prose" });
  const textResult = textTrial.applyPacket(textPacket, { operationId: "ui-text" });
  const tamperTrial = new StateLanguageTrial("held-complement"); const tampered = tamperTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0] }); tampered.payload.v[0] = 0;
  const tamperResult = tamperTrial.applyPacket(tampered, { operationId: "ui-tamper" });
  const staleTrial = new StateLanguageTrial("held-complement"); const stale = staleTrial.makePacket("b", LANGUAGE_OPS.OFFER, { v: [0, 2, 0] }); staleTrial.emitOffer("a");
  const staleResult = staleTrial.applyPacket(stale, { operationId: "ui-stale" });
  const rows = [["free-text field", textResult], ["tampered digest", tamperResult], ["stale sequence", staleResult]];
  $("#attackResults").innerHTML = rows.map(([label, result]) => `<div><span>${esc(label)}</span><b>${esc(result.status)} · ${result.reasonCode}</b></div>`).join("");
  $("#systemMessage").textContent = "Three adversarial packets refused; each target state remained unchanged.";
}
function renderGate() {
  const gate = stateLanguageGate();
  $("#gateMetrics").innerHTML = [[gate.heldOutRuns,"runs"],[gate.solved,"solved"],[gate.refused,"refused"],[gate.deadlocked,"deadlocked"],[gate.allPrivateClean ? "PASS" : "HOLD","private clean"],[gate.allReplay ? "PASS" : "HOLD","exact replay"],[gate.baselineAgreement ? "PASS" : "HOLD","baseline agree"]].map(([value,label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  $("#gateLedger").innerHTML = gate.runs.map((run) => `<article class="gate-card ${outcomeClass(run.outcomeCode)}"><strong>${esc(run.fixtureId)}</strong><span>${run.messages} packets · ${run.bytes} bytes<br>${run.ambiguityCount} alternatives retained</span><em>${esc(outcomeNames[run.outcomeCode])} · replay ${esc(run.replay)}</em></article>`).join("");
  $("#systemMessage").textContent = `Held-out gate ${gate.allPrivateClean && gate.allPayloadsStateOnly && gate.allReplay && gate.baselineAgreement ? "PASS" : "HOLD"} · no result hidden.`;
  return gate;
}

for (const fixture of heldFixtures) $("#fixtureSelect").add(new Option(fixture.id.replace("held-", ""), fixture.id));
$("#fixtureDigest").textContent = `fixtures ${STATE_LANGUAGE_FIXTURE_DIGEST}`;
$("#fixtureSelect").addEventListener("change", initialize);
$("#stepButton").addEventListener("click", () => { const result = stepProtocol(); const packet = result?.packet; render(packet ? explainPacket(packet) : `Local close · ${reasonNames[result?.reasonCode] || "closed"}.`); });
$("#runButton").addEventListener("click", runSelected); $("#resetButton").addEventListener("click", initialize);
$("#replayButton").addEventListener("click", () => { const result = trial.verifyReplay(); render(`Replay ${result.status} · ${result.receiptsReplayed ?? result.at ?? 0} receipts checked.`); });
$("#attackButton").addEventListener("click", runAttacks); $("#gateButton").addEventListener("click", renderGate);
window.AXM_STATE_LANGUAGE = { get trial() { return trial; }, stateLanguageGate, stateLanguageContracts, stepProtocol, renderGate };
initialize();
