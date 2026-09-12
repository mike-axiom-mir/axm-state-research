import { CoexistenceWorld, coexistenceContracts } from "./coexistence-world.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  canvas: $("#coexistenceCanvas"), claim: $("#claimText"), digest: $("#digestBadge"), cycle: $("#cycleHeading"), seed: $("#seedInput"),
  metrics: $("#worldMetrics"), human: $("#humanDecision"), machine: $("#machineDecision"), ai: $("#aiDecision"),
  threads: $("#threads"), threadCount: $("#threadCount"), outcomes: $("#outcomes"), ledger: $("#ledger"),
  receiptCount: $("#receiptCount"), system: $("#systemMessage"), proposal: $("#proposalInput"),
  controls: [...document.querySelectorAll("button")],
};
let world = new CoexistenceWorld({ seed: elements.seed.value });
let running = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
const pretty = (value) => String(value).replaceAll("_", " ");
const format = (value) => new Intl.NumberFormat("en-US").format(value);
function intentName(intent) {
  if (!intent) return "idle";
  return intent.kind === "signal" ? `signal · ${intent.signal}`
    : intent.kind === "move" ? `move · ${intent.direction || (intent.to ? "coordinate proposal" : "invalid")}` : intent.kind;
}
function centerOfSeats() {
  const seats = Object.values(world.state.actors);
  return { x: Math.round(seats.reduce((sum, seat) => sum + seat.position.x, 0) / seats.length),
    y: Math.round(seats.reduce((sum, seat) => sum + seat.position.y, 0) / seats.length) };
}

function drawField() {
  const canvas = elements.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(rect.width * dpr));
  const height = Math.max(320, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  const columns = 15; const rows = 13;
  const size = Math.min(width / columns, height / rows);
  const offsetX = (width - columns * size) / 2;
  const offsetY = (height - rows * size) / 2;
  const center = centerOfSeats();
  const startX = center.x - Math.floor(columns / 2);
  const startY = center.y - Math.floor(rows / 2);
  const terrain = { moss: "#112a22", reed: "#0a2730", shale: "#202630", ash: "#2b1d23" };
  const threadCells = new Set(world.state.derived.threads.map((thread) => thread.cell));
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const x = startX + column; const y = startY + row;
    const cell = world.field.cell(world.state, x, y);
    if (!cell) continue;
    const px = offsetX + column * size; const py = offsetY + row * size;
    context.fillStyle = terrain[cell.terrain];
    context.fillRect(px + 1, py + 1, size - 2, size - 2);
    context.strokeStyle = threadCells.has(cell.id) ? "rgba(200,155,255,.74)" : "rgba(190,220,235,.09)";
    context.lineWidth = threadCells.has(cell.id) ? 2 : 1;
    context.strokeRect(px + 2, py + 2, size - 4, size - 4);
    if (cell.touches > 0) {
      const color = cell.condition === "bloom" ? "118,247,170" : cell.condition === "scar" ? "255,111,127" : "105,170,255";
      context.fillStyle = `rgba(${color},${Math.min(.17 + cell.touches * .055, .58)})`;
      context.fillRect(px + 4, py + 4, size - 8, size - 8);
      context.strokeStyle = `rgba(${color},.78)`;
      context.beginPath(); context.arc(px + size / 2, py + size / 2, Math.min(size * .24, 7 + cell.touches), 0, Math.PI * 2); context.stroke();
    }
    context.fillStyle = "rgba(215,230,240,.25)";
    context.font = `${Math.max(9, size * .2)}px ui-monospace,monospace`;
    context.fillText(String(cell.phase), px + 5, py + size - 5);
  }
  const colors = { human: "#ffcb70", machine: "#79f4e8", ai: "#c89bff" };
  const offsets = { human: [-.18, -.12], machine: [.18, -.12], ai: [0, .2] };
  for (const seat of Object.values(world.state.actors)) {
    const column = seat.position.x - startX; const row = seat.position.y - startY;
    if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
    const [ox, oy] = offsets[seat.role];
    const cx = offsetX + (column + .5 + ox) * size; const cy = offsetY + (row + .5 + oy) * size;
    context.save(); context.shadowColor = colors[seat.role]; context.shadowBlur = 16; context.fillStyle = colors[seat.role];
    context.beginPath(); context.arc(cx, cy, Math.max(5, size * .11), 0, Math.PI * 2); context.fill(); context.restore();
    context.fillStyle = "rgba(235,245,250,.82)"; context.font = `${Math.max(9, size * .19)}px system-ui,sans-serif`;
    context.fillText(seat.name, cx + 7, cy - 6);
  }
  const stats = world.stats();
  canvas.setAttribute("aria-label", `Cycle ${stats.cycles}; ${stats.events} committed events; ${stats.threads} receipt-backed adventure threads.`);
}

function renderSeats() {
  const receipt = world.receipts.filter((entry) => entry.status === "APPLIED").at(-1);
  if (!receipt) {
    const machine = world.previewMachineDecision();
    const ai = world.previewStandInProposal();
    elements.human.innerHTML = '<p class="empty">No choice committed.</p>';
    elements.machine.innerHTML = `<strong>Preview · ${escapeHtml(intentName(machine.intent))}</strong><span>${escapeHtml(pretty(machine.basis))} · novelty ${machine.score}</span>`;
    elements.ai.innerHTML = `<strong>Preview · ${escapeHtml(intentName(ai.intent))}</strong><span>${escapeHtml(pretty(ai.basis))} · deterministic stand-in</span>`;
    return;
  }
  const humanEvent = world.state.evidence.events.find((event) => event.eventId === receipt.humanEventId);
  const machineEvent = world.state.evidence.events.find((event) => event.eventId === receipt.machineDecision.eventId);
  elements.human.innerHTML = `<strong>${escapeHtml(intentName(receipt.humanIntent))}</strong><span>${escapeHtml(humanEvent?.observerOutcome || "movement")}; directly selected by the human seat</span>`;
  elements.machine.innerHTML = `<strong>${escapeHtml(intentName(receipt.machineDecision.intent))}</strong><span>${escapeHtml(pretty(receipt.machineDecision.basis))} · novelty ${receipt.machineDecision.noveltyPressure} · ${escapeHtml(machineEvent?.observerOutcome || "movement")}</span>`;
  const refused = receipt.aiDecision.status === "REFUSED";
  elements.ai.innerHTML = `<strong class="${refused ? "refused" : ""}">${escapeHtml(receipt.aiDecision.status)} · ${escapeHtml(intentName(receipt.aiDecision.intent || receipt.aiDecision.proposal))}</strong><span>${escapeHtml(pretty(receipt.aiDecision.source))} · ${escapeHtml(pretty(receipt.aiDecision.reason))} · local referee</span>`;
}

function renderThreads() {
  const threads = world.state.derived.threads;
  elements.threadCount.textContent = `${threads.length} thread${threads.length === 1 ? "" : "s"}`;
  elements.threads.innerHTML = threads.length ? threads.map((thread) => `<article class="thread-card">
    <strong>${escapeHtml(pretty(thread.kind))}</strong><span>${escapeHtml(thread.basis)}</span>
    <em>${escapeHtml(thread.cell)} · ${thread.evidence.length} event id${thread.evidence.length === 1 ? "" : "s"}</em></article>`).join("")
    : '<p class="empty">No role intersection has been earned.</p>';
}

function metric(value, label, tone = "") { return `<div class="outcome-card ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }
function renderMetrics() {
  const stats = world.stats();
  elements.metrics.innerHTML = [
    [stats.cycles, "coexistence cycles"], [stats.events, "committed events"], [stats.changedCells, "changed cells"], [format(stats.sleepingCells), "sleeping cells"],
  ].map(([value, label]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
  elements.outcomes.innerHTML = [metric(stats.growthEvents, "growth events", "growth"), metric(stats.damageEvents, "damage events", "damage"),
    metric(stats.changeEvents, "phase changes"), metric(stats.movementEvents, "movements"),
    metric(stats.healthDelta > 0 ? `+${stats.healthDelta}` : stats.healthDelta, "health drift", "drift"), metric(stats.threeWayMarks, "three-role marks")].join("");
}

function renderLedger() {
  const receipts = world.receipts;
  elements.receiptCount.textContent = `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`;
  elements.ledger.innerHTML = receipts.length ? receipts.slice(-12).reverse().map((receipt) => {
    if (receipt.status === "REFUSED") return `<article class="cycle-card"><header><strong>REFUSED</strong><span>#${receipt.sequence}</span></header><p class="refused">${escapeHtml(pretty(receipt.reason))}</p><p>No seat changed canonical state.</p></article>`;
    return `<article class="cycle-card"><header><strong>Cycle ${receipt.afterRevision}</strong><span>${escapeHtml(receipt.afterDigest.slice(0, 9))}</span></header>
      <p><b>H</b> ${escapeHtml(intentName(receipt.humanIntent))}</p><p><b>M</b> ${escapeHtml(intentName(receipt.machineDecision.intent))}</p>
      <p><b>AI</b> ${escapeHtml(receipt.aiDecision.status)} · ${escapeHtml(intentName(receipt.aiDecision.intent || receipt.aiDecision.proposal))}</p>
      <p>${receipt.eventIds.length} events · ${receipt.threadIds.length} threads</p></article>`;
  }).join("") : '<p class="empty">The ledger is empty. Co-location alone is not an adventure.</p>';
}

function deriveClaim() {
  const stats = world.stats();
  if (!stats.cycles) return "Three seats begin together by authored fixture. Genesis earns no adventure thread.";
  if (stats.threeWayMarks > 0) return `Observed: human, machine, and AI-compatible proposals intersected in ${stats.threeWayMarks} receipt-backed site${stats.threeWayMarks === 1 ? "" : "s"}. Adventure quality remains unproven.`;
  if (stats.threads > 0) return `Observed: ${stats.threads} cross-role projection${stats.threads === 1 ? "" : "s"} earned evidence. Three-way coexistence has not formed.`;
  return "Cycles are changing state, but no cross-role adventure thread has been earned.";
}

function render(message, tone = "") {
  const stats = world.stats();
  elements.digest.textContent = `digest ${world.stateDigest.slice(0, 12)}`;
  elements.cycle.textContent = stats.cycles ? `Cycle ${stats.cycles} · ${stats.events} seat events committed` : "Genesis · authored shared start";
  elements.claim.textContent = deriveClaim();
  drawField(); renderSeats(); renderThreads(); renderMetrics(); renderLedger();
  if (message) { elements.system.textContent = message; elements.system.style.color = tone === "PASS" ? "var(--machine)" : tone === "HOLD" ? "var(--red)" : "var(--muted)"; }
}
function setRunning(value) { running = value; elements.controls.forEach((control) => { control.disabled = value; }); }
function commit(humanIntent, aiProposal) {
  if (running) return null;
  const options = { expectedRevision: world.state.meta.revision };
  if (aiProposal !== undefined) options.aiProposal = aiProposal;
  const receipt = world.cycle(humanIntent, options);
  const aiCopy = receipt.aiDecision.status === "REFUSED" ? ` AI proposal refused: ${receipt.aiDecision.reason}; no fallback.` : ` AI seat ${receipt.aiDecision.source === "DETERMINISTIC_STAND_IN" ? "stand-in" : "proposal"} accepted.`;
  render(`CYCLE ${receipt.afterRevision} · ${receipt.eventIds.length} events.${aiCopy}`, receipt.aiDecision.status === "REFUSED" ? "HOLD" : "PASS");
  return receipt;
}

for (const button of document.querySelectorAll(".intent")) button.addEventListener("click", () => {
  const kind = button.dataset.kind;
  const intent = kind === "signal" ? { kind, signal: button.dataset.value } : kind === "move" ? { kind, direction: button.dataset.value } : { kind: "wait" };
  commit(intent);
});
$("#run12Button").addEventListener("click", async () => {
  if (running) return;
  setRunning(true);
  for (let index = 0; index < 12; index += 1) {
    world.cycle(world.suggestedHumanIntent(), { expectedRevision: world.state.meta.revision });
    if (index % 3 === 2) { render(`Probe running · ${index + 1} / 12`); await new Promise((resolve) => setTimeout(resolve, 35)); }
  }
  setRunning(false);
  render(`PROBE COMPLETE · ${world.stats().events} events · ${world.stats().threads} evidence-backed threads.`, "PASS");
});
$("#proposalButton").addEventListener("click", () => {
  try { commit({ kind: "wait" }, JSON.parse(elements.proposal.value)); }
  catch (error) { render(`PROPOSAL JSON REFUSED BEFORE CYCLE · ${error.message}`, "HOLD"); }
});
$("#replayButton").addEventListener("click", () => {
  const result = world.verifyReplay();
  render(result.status === "PASS" ? `REPLAY PASS · ${result.cyclesReplayed} cycles reconstructed ${result.actual.slice(0, 12)}.` : `REPLAY HOLD · divergence at receipt ${result.at}.`, result.status);
});
$("#resetButton").addEventListener("click", () => {
  world = new CoexistenceWorld({ seed: elements.seed.value.trim() || "AXM-COEXIST-001" });
  render("RESET · exact authored genesis restored; no thread carried across.");
});
window.addEventListener("resize", drawField);
window.AXM_COEXISTENCE = { get world() { return world; }, coexistenceContracts };
render("Ready. No model is connected; the AI seat uses a deterministic stand-in.");
