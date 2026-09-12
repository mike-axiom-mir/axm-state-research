import { CuriosityWorld, CURIOSITY_SIGNALS, curiosityPolicyContract } from "./curiosity-world.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  canvas: $("#gardenCanvas"), claim: $("#claimText"), digest: $("#digestBadge"), stepHeading: $("#stepHeading"), seed: $("#seedInput"),
  worldMetrics: $("#worldMetrics"), outcomeMetrics: $("#outcomeMetrics"), patterns: $("#patterns"), machineView: $("#machineView"),
  ledger: $("#ledger"), receiptCount: $("#receiptCount"), system: $("#systemMessage"), controls: [...document.querySelectorAll(".control")],
};

let world = new CuriosityWorld({ seed: elements.seed.value });
let running = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function averagePosition() {
  const actors = Object.values(world.state.actors);
  return {
    x: Math.round(actors.reduce((sum, actor) => sum + actor.position.x, 0) / actors.length),
    y: Math.round(actors.reduce((sum, actor) => sum + actor.position.y, 0) / actors.length),
  };
}

function drawGarden() {
  const canvas = elements.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(rect.width * dpr));
  const height = Math.max(320, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  const columns = 17;
  const rows = 13;
  const cellSize = Math.min(width / columns, height / rows);
  const offsetX = (width - columns * cellSize) / 2;
  const offsetY = (height - rows * cellSize) / 2;
  const center = averagePosition();
  const startX = center.x - Math.floor(columns / 2);
  const startY = center.y - Math.floor(rows / 2);
  const terrainColors = { moss: "#102a23", reed: "#0b2630", shale: "#20252e", ash: "#2a1d22" };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = startX + column;
      const y = startY + row;
      const cell = world.field.cell(world.state, x, y);
      if (!cell) continue;
      const px = offsetX + column * cellSize;
      const py = offsetY + row * cellSize;
      context.fillStyle = terrainColors[cell.terrain];
      context.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      context.strokeStyle = "rgba(170,210,230,.10)";
      context.lineWidth = 1;
      context.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      if (cell.touches > 0) {
        const conditionColor = cell.condition === "bloom" ? "118,247,170" : cell.condition === "scar" ? "255,111,127" : "187,140,255";
        context.fillStyle = `rgba(${conditionColor},${Math.min(.2 + cell.touches * .08, .62)})`;
        context.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
        context.strokeStyle = `rgba(${conditionColor},.82)`;
        context.beginPath();
        context.arc(px + cellSize / 2, py + cellSize / 2, Math.min(cellSize * .24, 8 + cell.touches), 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = "rgba(210,230,240,.28)";
      context.font = `${Math.max(9, cellSize * .22)}px ui-monospace, monospace`;
      context.fillText(String(cell.phase), px + 5, py + cellSize - 5);
    }
  }

  const actorColors = ["#79f4e8", "#bb8cff", "#69aaff", "#ffc66d", "#76f7aa", "#ff8bd7"];
  Object.values(world.state.actors).forEach((actor, index) => {
    const column = actor.position.x - startX;
    const row = actor.position.y - startY;
    if (column < 0 || column >= columns || row < 0 || row >= rows) return;
    const cx = offsetX + (column + .5) * cellSize;
    const cy = offsetY + (row + .5) * cellSize;
    context.save();
    context.shadowColor = actorColors[index];
    context.shadowBlur = 14;
    context.fillStyle = actorColors[index];
    context.beginPath();
    context.arc(cx, cy, Math.max(4, cellSize * .13), 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = "rgba(235,248,255,.8)";
    context.font = `${Math.max(10, cellSize * .24)}px system-ui, sans-serif`;
    context.fillText(actor.name, cx + 7, cy - 7);
  });

  const stats = world.stats();
  canvas.setAttribute("aria-label", `Curiosity garden at step ${world.state.meta.step}; ${stats.bloomCells} growth cells, ${stats.scarCells} damaged cells, ${stats.changedCells} changed cells.`);
}

function metric(value, label, tone = "") {
  return `<div class="outcome-card ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderMetrics() {
  const stats = world.stats();
  elements.worldMetrics.innerHTML = [
    [number(world.state.meta.step), "loop steps"],
    [number(stats.changedCells), "changed cells"],
    [number(stats.materializedCells), "materialized"],
    [number(stats.sleepingCells), "sleeping"],
  ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
  elements.outcomeMetrics.innerHTML = [
    metric(stats.growthEvents, "growth events", "growth"),
    metric(stats.damageEvents, "damage events", "damage"),
    metric(stats.bloomCells, "bloom cells", "growth"),
    metric(stats.scarCells, "scar cells", "damage"),
    metric(stats.echoCells, "shared echoes"),
    metric(stats.healthDelta > 0 ? `+${stats.healthDelta}` : stats.healthDelta, "world health drift", "drift"),
  ].join("");
  elements.patterns.innerHTML = world.state.derived.patterns.length
    ? world.state.derived.patterns.map((pattern) => `<div class="pattern"><strong>${escapeHtml(pattern.kind.replaceAll("_", " "))} · ${pattern.strength}</strong><span>${escapeHtml(pattern.basis)}</span></div>`).join("")
    : '<p class="empty">No observer pattern has crossed a threshold. Failure or quiet is a valid result.</p>';
}

function renderMachineView() {
  const last = world.receipts.filter((receipt) => receipt.status === "APPLIED").at(-1);
  if (!last) {
    const next = world.previewDecision();
    elements.machineView.innerHTML = `<div class="decision"><strong>Next curiosity: ${escapeHtml(next.intent.kind)}</strong><span>${escapeHtml(next.basis.replaceAll("_", " "))} · novelty pressure ${next.score}</span></div><p class="empty">No consequence has been produced. The preview contains no observer outcome.</p>`;
    return;
  }
  const view = last.policyView;
  const intent = last.intent.kind === "signal" ? `${last.intent.kind} · ${last.intent.signal}` : `${last.intent.kind} · ${last.intent.direction}`;
  elements.machineView.innerHTML = `
    <div class="decision"><strong>${escapeHtml(world.state.actors[last.actor].name)} chose ${escapeHtml(intent)}</strong><span>${escapeHtml(last.curiosityBasis.replaceAll("_", " "))} · novelty pressure ${last.noveltyPressure}</span></div>
    <div class="view-grid">
      <div><b>${escapeHtml(view.current.terrain)}</b><span>terrain</span></div>
      <div><b>${view.current.phase}</b><span>phase</span></div>
      <div><b>${view.neighbours.filter((item) => item.seenCount === 0).length}</b><span>unseen neighbours</span></div>
      <div><b>${Math.min(...Object.values(view.signalTrials))}</b><span>least signal trials</span></div>
    </div>`;
}

function renderLedger() {
  const receipts = world.receipts.filter((receipt) => receipt.status === "APPLIED");
  elements.receiptCount.textContent = `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`;
  elements.ledger.innerHTML = receipts.length
    ? receipts.slice(-12).reverse().map((receipt) => {
      const actor = world.state.actors[receipt.actor].name;
      const action = receipt.intent.kind === "signal" ? `${receipt.intent.kind} ${receipt.intent.signal}` : `${receipt.intent.kind} ${receipt.intent.direction}`;
      const outcome = receipt.observerOutcome || "movement";
      const outcomeCopy = receipt.observerOutcome ? `game saw ${outcome}` : "no outcome label produced";
      return `<article class="receipt"><div class="receipt-head"><strong>${escapeHtml(actor)} · ${escapeHtml(action)}</strong><em>#${receipt.sequence}</em></div><p>${escapeHtml(receipt.curiosityBasis.replaceAll("_", " "))}<br><span class="${escapeHtml(receipt.observerOutcome || "change")}">${escapeHtml(outcomeCopy)}</span></p></article>`;
    }).join("")
    : '<p class="empty">The ledger is empty. Genesis contains no invented result.</p>';
}

function deriveClaim() {
  const stats = world.stats();
  if (stats.growthEvents > 0 && stats.damageEvents > 0 && stats.echoCells > 0) return `Observed: curiosity produced growth, damage, and ${stats.echoCells} shared echo${stats.echoCells === 1 ? "" : "es"} without an outcome reward.`;
  if (stats.changedCells > 0) return "Observed: curiosity is leaving sparse world changes. A stable emergent ecology is not yet proven.";
  return "Six actors choose unfamiliar states and untried signals. Growth and damage exist only in the observer layer.";
}

function render(message, tone = "") {
  elements.digest.textContent = `digest ${world.stateDigest.slice(0, 12)}`;
  elements.stepHeading.textContent = world.state.meta.step ? `Step ${world.state.meta.step} · ${world.state.derived.patterns.length} patterns visible` : "Genesis · no questions asked";
  elements.claim.textContent = deriveClaim();
  drawGarden();
  renderMetrics();
  renderMachineView();
  renderLedger();
  if (message) {
    elements.system.textContent = message;
    elements.system.style.color = tone === "PASS" ? "var(--cyan)" : tone === "HOLD" ? "var(--red)" : "var(--muted)";
  }
}

function setRunning(value) {
  running = value;
  elements.controls.forEach((control) => { control.disabled = value; });
}

function stepOnce() {
  const receipt = world.step({ expectedRevision: world.state.meta.revision });
  const actor = world.state.actors[receipt.actor].name;
  const outcome = receipt.observerOutcome ? ` The game saw ${receipt.observerOutcome}.` : " No outcome label was returned.";
  render(`${actor} chose ${receipt.intent.kind} from novelty only.${outcome}`);
}

async function loop(count) {
  if (running) return;
  setRunning(true);
  for (let index = 0; index < count; index += 1) {
    world.step({ expectedRevision: world.state.meta.revision });
    if (index % 2 === 1 || index === count - 1) {
      render(`Curiosity loop running · ${index + 1} / ${count}`);
      await new Promise((resolve) => setTimeout(resolve, 28));
    }
  }
  setRunning(false);
  const stats = world.stats();
  render(`LOOP COMPLETE · ${count} questions · ${stats.changedCells} cells changed · ${stats.growthEvents} growth / ${stats.damageEvents} damage.`, "PASS");
}

$("#stepButton").addEventListener("click", stepOnce);
$("#run16Button").addEventListener("click", () => loop(16));
$("#run64Button").addEventListener("click", () => loop(64));
$("#replayButton").addEventListener("click", () => {
  const result = world.verifyReplay();
  render(result.status === "PASS" ? `REPLAY PASS · ${result.stepsReplayed} choices reconstructed ${result.actual.slice(0, 12)}.` : `REPLAY HOLD · divergence at receipt ${result.at}.`, result.status);
});
$("#resetButton").addEventListener("click", () => {
  world = new CuriosityWorld({ seed: elements.seed.value.trim() || "AXM-CURIOSITY-001" });
  render("RESET · exact genesis restored; no result carried across.");
});
window.addEventListener("resize", drawGarden);

window.AXM_CURIOSITY = { get world() { return world; }, curiosityPolicyContract, CURIOSITY_SIGNALS };

render("Ready. The actors have no success target.");
