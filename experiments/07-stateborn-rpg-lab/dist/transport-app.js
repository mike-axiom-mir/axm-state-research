import { LANGUAGE_OPS, LANGUAGE_OUTCOMES } from "./state-language.js";
import {
  FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST, HostileTransportTrial,
  STATE_TRANSPORT_FIXTURE_DIGEST, STATE_TRANSPORT_FIXTURES,
  stateTransportContracts, stateTransportGate,
} from "./state-transport.js";

const $ = (selector) => document.querySelector(selector);
const fixtures = STATE_TRANSPORT_FIXTURES.filter((fixture) => fixture.split === "held_out");
const outcomeNames = Object.fromEntries(Object.entries(LANGUAGE_OUTCOMES).map(([name, code]) => [code, name]));
const opNames = Object.fromEntries(Object.entries(LANGUAGE_OPS).map(([name, code]) => [code, name]));
const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const short = (value) => String(value || "").slice(0, 11);
let trial;

function currentFixture() { return fixtures.find((fixture) => fixture.id === $("#fixtureSelect").value) || fixtures[0]; }
function faultSummary(fixture) {
  const faults = Object.entries(fixture.faults || {}).flatMap(([key, values]) => values.map((value) => `${key}:${typeof value === "string" ? value : value.kind}`));
  const disconnects = (fixture.disconnects || []).map((window) => `offline ${window.start}–${window.end}`);
  return [...faults, ...disconnects].join(", ") || "none";
}
function outcomeClass(code) { return (outcomeNames[code] || "OPEN").toLowerCase(); }
function render(message = "") {
  const fixture = currentFixture(); const result = trial.summary(); const outcome = outcomeNames[result.outcomeCode];
  $("#freezeStatus").textContent = STATE_TRANSPORT_FIXTURE_DIGEST === FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST ? "FROZEN PASS" : "FREEZE HOLD";
  $("#freezeStatus").classList.toggle("hold", STATE_TRANSPORT_FIXTURE_DIGEST !== FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST);
  $("#digestBadge").textContent = `transport ${short(result.transportDigest)}`;
  $("#fixtureFacts").innerHTML = [["base state task", fixture.languageFixtureId],["fault plan",faultSummary(fixture)],["attempt limit",fixture.maxAttempts ?? 3],["expected close",outcomeNames[fixture.expectedOutcomeCode]]].map(([label,value])=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");
  $("#networkHeading").textContent = `Tick ${result.ticks} · ${result.attempts} sends · ${result.acceptedPackets} accepted`;
  $("#connectionPill").textContent = trial.online ? "ONLINE" : "OFFLINE"; $("#connectionPill").className = `connection-pill ${trial.online ? "online" : "offline"}`;
  $("#seatARevision").textContent = `source ${short(trial.engine.sourceDigests.a)}`; $("#seatBRevision").textContent = `source ${short(trial.engine.sourceDigests.b)}`;
  const queued = trial.queue.filter((envelope) => envelope.status === "QUEUED"); $("#queueCount").textContent = `${queued.length} queued`;
  $("#queueLedger").innerHTML = queued.length ? queued.map((envelope)=>`<article class="queue-card"><strong>${esc(envelope.logicalKey)} · #${envelope.attempt}</strong><span>deliver ${envelope.deliverTick} · expire ${envelope.expiresTick}<br>${esc(envelope.faultKind)}</span></article>`).join("") : '<p class="empty">No packet is in flight.</p>';
  $("#eventCount").textContent = `${trial.ledger.length} events`;
  $("#eventLedger").innerHTML = trial.ledger.length ? [...trial.ledger].reverse().slice(0,20).map((event)=>`<article class="event-card ${event.type.toLowerCase()}"><strong>${esc(event.type)}</strong><span>tick ${event.tick} · ${esc(event.logicalKey || "transport")}</span><em>${esc(short(event.eventId))}</em></article>`).join("") : '<p class="empty">Advance a tick to emit the first packet.</p>';
  $("#outcomePill").textContent = outcome; $("#outcomePill").className = `outcome-pill ${outcomeClass(result.outcomeCode)}`;
  $("#resultMetrics").innerHTML = [[result.attempts,"send attempts"],[result.transmittedBytes,"wire bytes"],[result.drops,"drops"],[result.duplicatesSuppressed,"duplicates blocked"],[result.expired,"expired"],[result.staleRefusals + result.tamperRefusals,"packet refusals"],[result.recoveryPasses,"recoveries"],[result.sourcesUnchanged ? "YES" : "NO","sources unchanged"]].map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  $("#checkpointDigest").textContent = trial.latestCheckpoint?.checkpointDigest || "—";
  $("#checkpointCopy").textContent = result.recoveryPasses ? `${result.recoveryPasses} reconnect rebuilt and verified the packet engine.` : "The latest engine state remains sealed for a possible reconnect.";
  $("#acceptedPackets").innerHTML = trial.engine.state.messages.length ? trial.engine.state.messages.map((packet,index)=>`<span class="packet-chip">#${index} · ${esc(opNames[packet.op])}</span>`).join("") : '<p class="empty">No packet accepted.</p>';
  $("#tickButton").disabled = trial.closed; $("#tickButton").textContent = trial.closed ? "Route closed" : "Advance one tick";
  $("#claimText").textContent = trial.closed ? `${outcome}: ${result.acceptedPackets} packets accepted, ${result.drops} dropped, ${result.duplicatesSuppressed} duplicate effects blocked, sources unchanged ${result.sourcesUnchanged}.` : "The simulator may damage delivery, never the source or consent rules.";
  if (message) $("#systemMessage").textContent = message;
}
function initialize(){trial=new HostileTransportTrial(currentFixture());render("Reset to the exact frozen route.");}
function runSelected(){const result=trial.run();render(`Route ${outcomeNames[result.outcomeCode]} · ${trial.verifyReplay().status} replay · ${result.terminalReason || "protocol closed normally"}.`);}
function runGate(){const gate=stateTransportGate();$("#gateMetrics").innerHTML=[[gate.heldOutRuns,"routes"],[gate.solved,"solved"],[gate.refused,"refused"],[gate.deadlocked,"deadlocked"],[gate.totalDrops,"drops"],[gate.totalDuplicatesSuppressed,"dups blocked"],[gate.totalExpired,"expired"],[gate.totalRecoveryPasses,"recoveries"]].map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");$("#gateLedger").innerHTML=gate.runs.map((run)=>`<article class="gate-card ${outcomeClass(run.outcomeCode)}"><strong>${esc(run.fixtureId.replace("held-",""))}</strong><span>${run.attempts} sends · ${run.acceptedPackets} accepted<br>${run.transmittedBytes} wire bytes · ${run.ticks} ticks</span><em>${esc(outcomeNames[run.outcomeCode])} · replay ${esc(run.replay)}</em></article>`).join("");$("#systemMessage").textContent=`Fault matrix ${gate.allExpectedOutcomes&&gate.allReplay&&gate.allSourcesUnchanged?"PASS":"HOLD"} · the repeated-loss deadlock remains in the result.`;return gate;}

for(const fixture of fixtures)$("#fixtureSelect").add(new Option(fixture.id.replace("held-", ""),fixture.id));
$("#fixtureDigest").textContent=`fixtures ${STATE_TRANSPORT_FIXTURE_DIGEST}`;
$("#fixtureSelect").addEventListener("change",initialize);$("#tickButton").addEventListener("click",()=>{trial.tickOnce();render(`Tick ${trial.tick} committed to the transport receipt chain.`);});$("#runButton").addEventListener("click",runSelected);$("#resetButton").addEventListener("click",initialize);$("#replayButton").addEventListener("click",()=>{const result=trial.verifyReplay();render(`Transport replay ${result.status} · ${result.ticksReplayed} ticks · engine ${result.engineReplay}.`);});$("#gateButton").addEventListener("click",runGate);
window.AXM_STATE_TRANSPORT={get trial(){return trial;},stateTransportGate,stateTransportContracts,runGate};initialize();
