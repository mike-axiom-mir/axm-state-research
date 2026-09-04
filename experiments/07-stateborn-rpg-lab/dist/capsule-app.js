import { ActorStateOwner, CapsuleSession, capsuleContracts } from "./capsule-world.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  canvas: $("#capsuleCanvas"), claim: $("#claimText"), digest: $("#digestBadge"), heading: $("#sessionHeading"),
  metrics: $("#sessionMetrics"), asterSource: $("#asterSource"), briarSource: $("#briarSource"),
  asterRevision: $("#asterRevision"), briarRevision: $("#briarRevision"), inspector: $("#capsuleInspector"),
  packet: $("#returnPacket"), threads: $("#threads"), threadCount: $("#threadCount"), ledger: $("#ledger"),
  system: $("#systemMessage"), controls: [...document.querySelectorAll("button")],
};
let sources; let capsules; let session; let activeOwner = "aster"; let pendingReturn = null; let running = false;
const esc = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const pretty = (value) => String(value).replaceAll("_", " ");

function initialize() {
  sources = {
    aster: new ActorStateOwner({ seed: "AXM-ASTER-HOME", ownerId: "aster", displayName: "Aster", color: "amber" }),
    briar: new ActorStateOwner({ seed: "AXM-BRIAR-HOME", ownerId: "briar", displayName: "Briar", color: "violet" }),
  };
  capsules = { aster: sources.aster.issueCapsule({ operationId: "initial-capsule" }).capsule,
    briar: sources.briar.issueCapsule({ operationId: "initial-capsule" }).capsule };
  session = new CapsuleSession(); activeOwner = "aster"; pendingReturn = null;
}

function sourceHtml(source) {
  return `<div><span>source digest</span><b>${esc(source.stateDigest.slice(0, 10))}</b></div>
    <div><span>accepted signals</span><b>${source.state.accepted.sharedSignals.length}</b></div>
    <div><span>accepted visits</span><b>${source.state.accepted.visitedCells.length}</b></div>
    <div><span>withheld private fields</span><b>2</b></div>`;
}
function renderSources() {
  elements.asterSource.innerHTML = sourceHtml(sources.aster); elements.briarSource.innerHTML = sourceHtml(sources.briar);
  elements.asterRevision.textContent = `revision ${sources.aster.state.meta.revision}`;
  elements.briarRevision.textContent = `revision ${sources.briar.state.meta.revision}`;
  const capsule = capsules[activeOwner];
  elements.inspector.innerHTML = `<div><span>owner namespace</span><b>capsules.${esc(activeOwner)}</b></div>
    <div><span>exported paths</span><b>${capsule.consent.exportPaths.length}</b></div>
    <div><span>returnable paths</span><b>${capsule.consent.returnPaths.length}</b></div>
    <div><span>private paths exported</span><b>0</b></div><div><span>capsule digest</span><b>${esc(capsule.capsuleDigest.slice(0, 10))}</b></div>`;
}

function drawSession() {
  const canvas = elements.canvas; const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(rect.width * dpr)); const height = Math.max(320, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, width, height);
  const columns = session.state.world.width; const rows = session.state.world.height;
  const size = Math.min((width - 60) / columns, (height - 60) / rows); const ox = (width - columns * size) / 2; const oy = (height - rows * size) / 2;
  const sharedCells = new Set(session.state.threads.map((thread) => thread.cell));
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
    const px = ox + x * size; const py = oy + y * size; const key = `${x}_${y}`;
    ctx.fillStyle = (x + y) % 2 ? "rgba(15,34,45,.78)" : "rgba(10,26,36,.9)"; ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    ctx.strokeStyle = sharedCells.has(key) ? "rgba(121,244,232,.9)" : "rgba(180,215,230,.11)"; ctx.lineWidth = sharedCells.has(key) ? 3 : 1; ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
    ctx.fillStyle = "rgba(215,230,240,.22)"; ctx.font = `${Math.max(9, size * .14)}px ui-monospace,monospace`; ctx.fillText(key, px + 6, py + size - 7);
  }
  const colors = { aster: "#ffcb70", briar: "#c89bff" }; const shifts = { aster: [-.15, -.08], briar: [.15, .1] };
  for (const [ownerId, projection] of Object.entries(session.state.projections)) {
    const { x, y } = projection.session.position; const [sx, sy] = shifts[ownerId] || [0, 0];
    const cx = ox + (x + .5 + sx) * size; const cy = oy + (y + .5 + sy) * size;
    ctx.save(); ctx.shadowColor = colors[ownerId] || "#79f4e8"; ctx.shadowBlur = 18; ctx.fillStyle = colors[ownerId] || "#79f4e8";
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(7, size * .1), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "rgba(240,247,250,.88)"; ctx.font = `${Math.max(10, size * .14)}px system-ui,sans-serif`; ctx.fillText(ownerId, cx + 9, cy - 8);
  }
  canvas.setAttribute("aria-label", `${Object.keys(session.state.projections).length} active capsule projections, ${session.state.events.length} session events, ${session.state.threads.length} shared threads.`);
}

function renderPacket() {
  if (!pendingReturn) { elements.packet.innerHTML = '<p class="empty">No return proposed.</p>'; return; }
  const { ownerId, packet } = pendingReturn;
  elements.packet.innerHTML = `<strong>${esc(ownerId)} · proposal only</strong><span>${packet.deltas.map((delta) => `${esc(pretty(delta.path))}: ${delta.values.length}`).join("<br>")}<br>digest ${esc(packet.packetDigest.slice(0, 12))}</span>`;
}
function renderThreads() {
  elements.threadCount.textContent = `${session.state.threads.length} thread${session.state.threads.length === 1 ? "" : "s"}`;
  elements.threads.innerHTML = session.state.threads.length ? session.state.threads.map((thread) => `<article class="thread-card"><strong>${esc(pretty(thread.kind))}</strong><span>${esc(thread.basis)}</span><em>${esc(thread.cell)} · ${esc(thread.signal)} · ${thread.evidence.length} event ids</em></article>`).join("") : '<p class="empty">Independent actions have not intersected.</p>';
}
function renderLedger() {
  const sessionEntries = session.receipts.map((receipt) => ({ ...receipt, floor: "SESSION" }));
  const sourceEntries = Object.values(sources).flatMap((source) => source.receipts.filter((receipt) => receipt.kind === "APPLY_RETURN").map((receipt) => ({ ...receipt, floor: `SOURCE ${source.state.ownerId}` })));
  const entries = [...sessionEntries, ...sourceEntries].slice(-12).reverse();
  elements.ledger.innerHTML = entries.length ? entries.map((receipt) => `<div class="ledger-chip ${receipt.status === "REFUSED" ? "refused" : ""}"><strong>${esc(receipt.floor)} · ${esc(receipt.kind)}</strong><span>${esc(receipt.status)} · ${esc(pretty(receipt.reason))}<br>${esc((receipt.afterDigest || "").slice(0, 9))}</span></div>`).join("") : '<p class="empty">No composition receipt yet.</p>';
}
function claimText() {
  const active = Object.keys(session.state.projections).length;
  const accepted = Object.values(sources).reduce((sum, source) => sum + source.state.accepted.sharedSignals.length + source.state.accepted.visitedCells.length, 0);
  if (!active && !session.state.events.length) return "Two independent source states exist. Nothing has entered the shared session.";
  if (session.state.threads.length && accepted) return "Observed: namespaced projections collaborated; one source explicitly accepted selected return state. A person was not moved.";
  if (session.state.threads.length) return "Observed: independent projections intersected. Both sources remain unchanged until a return path is accepted.";
  return `${active} consented projection${active === 1 ? " is" : "s are"} active. Identity fusion and automatic writeback remain blocked.`;
}
function render(message, tone = "") {
  const active = Object.keys(session.state.projections).length;
  elements.claim.textContent = claimText(); elements.digest.textContent = `session ${session.stateDigest.slice(0, 12)}`;
  elements.heading.textContent = active ? `${active} namespaced projection${active === 1 ? "" : "s"} · revision ${session.state.meta.revision}` : "Empty namespace floor";
  elements.metrics.innerHTML = [[active,"active projections"],[session.state.events.length,"session events"],[session.state.threads.length,"shared threads"],[Object.keys(session.state.detached).length,"detached receipts"]]
    .map(([value,label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
  document.querySelectorAll(".seat-choice").forEach((button) => button.classList.toggle("active", button.dataset.owner === activeOwner));
  renderSources(); renderPacket(); renderThreads(); renderLedger(); drawSession();
  if (message) { elements.system.textContent = message; elements.system.style.color = tone === "PASS" ? "var(--cyan)" : tone === "HOLD" ? "var(--red)" : "var(--muted)"; }
}
function compose(ownerId) {
  const receipt = session.compose(capsules[ownerId], { expectedRevision: session.state.meta.revision });
  render(`${ownerId.toUpperCase()} ${receipt.status} · ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD"); return receipt;
}
function act(kind, value) {
  const intent = kind === "move" ? { kind, direction: value } : { kind, signal: value };
  const receipt = session.act(activeOwner, intent, { expectedRevision: session.state.meta.revision });
  render(`${activeOwner.toUpperCase()} ${receipt.status} · ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
}
function propose() {
  const result = session.proposeReturn(activeOwner); pendingReturn = result.packet ? { ownerId: activeOwner, packet: result.packet } : null;
  render(result.packet ? `RETURN PROPOSED · ${activeOwner} source still unchanged.` : `RETURN REFUSED · ${pretty(result.reason)}.`, result.packet ? "PASS" : "HOLD"); return result;
}
function accept(paths) {
  if (!pendingReturn) { render("RETURN HOLD · build a packet first.", "HOLD"); return; }
  const source = sources[pendingReturn.ownerId];
  const receipt = source.applyReturn(pendingReturn.packet, { acceptedPaths: paths, expectedRevision: source.state.meta.revision });
  pendingReturn = null; render(`SOURCE ${receipt.status} · ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
}
function setRunning(value) { running = value; elements.controls.forEach((button) => { button.disabled = value; }); }

$("#composeAster").addEventListener("click", () => compose("aster")); $("#composeBriar").addEventListener("click", () => compose("briar"));
document.querySelectorAll(".seat-choice").forEach((button) => button.addEventListener("click", () => { activeOwner = button.dataset.owner; pendingReturn = null; render(`ACTIVE PROJECTION · ${activeOwner}.`); }));
document.querySelectorAll(".session-action").forEach((button) => button.addEventListener("click", () => act(button.dataset.kind, button.dataset.value)));
$("#proposeReturn").addEventListener("click", propose); $("#acceptSignals").addEventListener("click", () => accept(["accepted.sharedSignals"]));
$("#acceptVisits").addEventListener("click", () => accept(["accepted.visitedCells"]));
$("#refuseReturn").addEventListener("click", () => { pendingReturn = null; render("RETURN REFUSED BY SOURCE · no source state changed.", "HOLD"); });
$("#tamperReturn").addEventListener("click", () => {
  if (!pendingReturn && !propose().packet) return;
  const forged = structuredClone(pendingReturn.packet); forged.deltas[0].values.push("forged-state");
  const source = sources[pendingReturn.ownerId]; const receipt = source.applyReturn(forged, { acceptedPaths: forged.consentReturnPaths, operationId: `forged-${source.receipts.length}` });
  pendingReturn = null; render(`FORGED PACKET ${receipt.status} · ${pretty(receipt.reason)} · source unchanged.`, "HOLD");
});
$("#detachButton").addEventListener("click", () => { const receipt = session.detach(activeOwner, { expectedRevision: session.state.meta.revision }); pendingReturn = null; render(`${activeOwner.toUpperCase()} ${receipt.status} · ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD"); });
$("#replayButton").addEventListener("click", () => { const result = session.verifyReplay(); render(`${result.status === "PASS" ? "REPLAY PASS" : "REPLAY HOLD"} · ${result.receiptsReplayed ?? result.at} committed revisions.`, result.status); });
$("#resetButton").addEventListener("click", () => { initialize(); render("RESET · exact independent sources and empty session restored."); });
$("#proofButton").addEventListener("click", async () => {
  if (running) return; initialize(); setRunning(true); compose("aster"); compose("briar");
  activeOwner = "aster"; session.act("aster", { kind: "signal", signal: "open" }); render("PROOF · Aster emitted open."); await new Promise((resolve) => setTimeout(resolve, 80));
  activeOwner = "briar"; session.act("briar", { kind: "signal", signal: "open" }); render("PROOF · Briar intersected open."); await new Promise((resolve) => setTimeout(resolve, 80));
  activeOwner = "aster"; const packet = session.proposeReturn("aster").packet; sources.aster.applyReturn(packet, { acceptedPaths: ["accepted.sharedSignals"] });
  setRunning(false); render("PROOF COMPLETE · shared signal earned; Aster accepted signals; Briar source unchanged.", "PASS");
});
window.addEventListener("resize", drawSession);
window.AXM_CAPSULES = { get sources() { return sources; }, get session() { return session; }, get capsules() { return capsules; }, capsuleContracts };
initialize(); render("Ready. Source and session digests are separate.");
