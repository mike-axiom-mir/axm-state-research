import { LivingWorld, MATERIALS, livingFabricCatalog, livingProbe } from "./living-world.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  revision: $("#revisionBadge"), digest: $("#digestBadge"), scale: $("#scaleBadge"), claim: $("#claimText"),
  identity: $("#identityLabel"), identityBasis: $("#identityBasis"), energy: $("#energyLabel"), energyMeter: $("#energyMeter"),
  inventory: $("#inventory"), capacity: $("#capacityLabel"), competence: $("#competence"), threads: $("#threads"), threadCount: $("#threadCount"),
  location: $("#locationLabel"), map: $("#worldMap"), terrain: $("#terrainLabel"), cellResources: $("#cellResources"), present: $("#presentLabel"), actions: $("#actions"),
  worldStats: $("#worldStats"), traceStatus: $("#traceStatus"), wokenCount: $("#wokenCount"), firedCount: $("#firedCount"), pathCount: $("#pathCount"),
  wokenNodes: $("#wokenNodes"), firedNodes: $("#firedNodes"), discoveries: $("#discoveries"), receipts: $("#receipts"), state: $("#stateJson"),
  system: $("#systemMessage"), seed: $("#seedInput"), method: $("#methodDialog"),
};

let world = new LivingWorld({ seed: elements.seed.value });
let operationCounter = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function resourceTotal(inventory) {
  return MATERIALS.reduce((sum, material) => sum + (inventory[material] || 0), 0);
}

function humanNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function actorName(id) {
  return world.state.actors[id]?.name || id;
}

function button(label, note, intent, tone = "") {
  const encoded = encodeURIComponent(JSON.stringify(intent));
  return `<button class="action-button ${tone}" data-intent="${encoded}" type="button"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(note)}</span></button>`;
}

function execute(intent, operationId) {
  const receipt = world.advance(intent, {
    operationId: operationId || `ui-${operationCounter += 1}-${intent.kind}`,
    expectedRevision: world.state.meta.revision,
  });
  const autonomousEvents = receipt.actorEvents.filter((event) => event.actor !== "player").length;
  const message = receipt.status === "APPLIED"
    ? `APPLIED · ${receipt.playerIntent.kind} · ${autonomousEvents} autonomous act${autonomousEvents === 1 ? "" : "s"} followed · ${receipt.wokenNodes.length} nodes woke.`
    : `REFUSED · ${receipt.reason} · canonical state unchanged.`;
  render(message, receipt.status);
  return receipt;
}

function renderMap() {
  const state = world.state;
  const player = state.actors.player;
  const cells = world.visibleCells(3);
  const actorLocations = new Map();
  for (const actor of Object.values(state.actors).filter((candidate) => candidate.id !== "player")) {
    const key = `${actor.position.x}_${actor.position.y}`;
    if (!actorLocations.has(key)) actorLocations.set(key, []);
    actorLocations.get(key).push(actor);
  }

  elements.map.innerHTML = cells.map((cell) => {
    const others = actorLocations.get(cell.id) || [];
    const isCurrent = cell.x === player.position.x && cell.y === player.position.y;
    const reachable = Math.abs(cell.x - player.position.x) + Math.abs(cell.y - player.position.y) === 1;
    const need = others.some((actor) => Object.values(actor.needs).some((value) => value >= 7));
    const pips = Math.min(5, Object.values(cell.resources).reduce((sum, value) => sum + value, 0));
    const classes = ["cell", `terrain-${cell.terrain}`, isCurrent ? "current" : "", reachable ? "reachable" : "", need ? "has-need" : ""].filter(Boolean).join(" ");
    const marker = isCurrent
      ? '<span class="cell-marker"><i class="player-marker"></i></span>'
      : others.length ? '<span class="cell-marker"><i class="agent-marker"></i></span>' : "";
    const resourceText = MATERIALS.filter((material) => cell.resources[material] > 0).map((material) => `${material} ${cell.resources[material]}`).join(", ") || "no material signal";
    const actorText = others.map((actor) => actor.name).join(", ");
    const target = encodeURIComponent(JSON.stringify({ actor: "player", kind: "move", to: { x: cell.x, y: cell.y } }));
    return `<button type="button" role="gridcell" class="${classes}" data-move="${target}" ${reachable ? "" : "disabled"} aria-label="${escapeHtml(`Cell ${cell.x}, ${cell.y}; ${cell.terrain}; ${resourceText}${actorText ? `; ${actorText}` : ""}`)}">${marker}<span class="resource-pips">${"<i></i>".repeat(pips)}</span><span class="cell-name">${cell.x}:${cell.y}</span></button>`;
  }).join("");
}

function actionLabel(intent) {
  if (intent.kind === "share") return [`Share ${intent.resource} with ${actorName(intent.target)}`, "one state may change what another chooses next", "relation"];
  if (intent.kind === "gather") return [`Gather ${intent.resource}`, "local cell delta · 1 energy", ""];
  if (intent.kind === "consume") return [`Consume ${intent.resource}`, "reduce matching pressure", ""];
  if (intent.kind === "request") return [`Request ${intent.resource}`, "publish need to nearby states", "relation"];
  if (intent.kind === "build") return ["Raise shelter", "3 fiber · persistent sparse delta", "world"];
  if (intent.kind === "rest") return ["Rest", "shelter converts a turn into energy", "world"];
  return ["Wait", "counterfactual: let other states decide first", "world"];
}

function renderActions() {
  const options = world.actionOptions();
  elements.actions.innerHTML = options.map((intent) => {
    const [label, note, tone] = actionLabel(intent);
    return button(label, note, intent, tone);
  }).join("") || '<p class="empty-copy">No valid local transform exists. A refusal would leave canonical state unchanged.</p>';
}

function renderActor() {
  const state = world.state;
  const player = state.actors.player;
  const identity = state.derived.identityPatterns.player;
  elements.identity.textContent = identity.label;
  elements.identityBasis.textContent = identity.basis;
  elements.energy.textContent = `${player.energy} / ${player.maxEnergy}`;
  elements.energyMeter.style.width = `${(player.energy / player.maxEnergy) * 100}%`;
  elements.capacity.textContent = `${resourceTotal(player.inventory)} / ${player.capacity}`;
  elements.inventory.innerHTML = MATERIALS.map((material) => `<div class="inventory-item"><span>${material}</span><strong>${player.inventory[material]}</strong></div>`).join("");
  elements.competence.innerHTML = Object.entries(player.needs).map(([name, value]) => `<div class="competence-item"><span>${escapeHtml(name)}</span><span>${value} / 10</span></div>`).join("");
  elements.threadCount.textContent = `${state.derived.situations.length} formed`;
  elements.threads.innerHTML = state.derived.situations.length
    ? state.derived.situations.map((situation) => {
      const names = situation.actors.map(actorName).join(" ↔ ");
      const detail = situation.kind === "mutual_aid" ? `${names} · events ${situation.evidence.join(", ")}` : `${names} · ${situation.resource} · ${situation.state}`;
      return `<div class="thread-card"><strong>${escapeHtml(situation.kind.replaceAll("_", " "))}</strong><span>${escapeHtml(detail)}</span></div>`;
    }).join("")
    : '<p class="empty-copy">No situation projection yet. Pressure exists, but it has not become a causal pattern.</p>';
}

function renderWorldReadout() {
  const state = world.state;
  const player = state.actors.player;
  const cell = world.field.cell(state, player.position.x, player.position.y);
  const present = Object.values(state.actors).filter((actor) => actor.id !== "player" && actor.position.x === player.position.x && actor.position.y === player.position.y);
  elements.location.textContent = `Cell ${player.position.x} · ${player.position.y}`;
  elements.terrain.textContent = `${cell.terrain}${cell.shelter ? " · shelter raised" : ""}`;
  elements.cellResources.innerHTML = MATERIALS.map((material) => `<span class="resource-pill">${material} <b>${cell.resources[material]}</b></span>`).join("");
  elements.present.textContent = present.length ? present.map((actor) => actor.name).join(", ") : "only you";
  const stats = world.stats();
  elements.scale.textContent = `${humanNumber(stats.logicalNodes)} logical nodes`;
  elements.worldStats.innerHTML = [
    ["sleeping", humanNumber(stats.sleepingCells)],
    ["materialized", humanNumber(stats.materializedCells)],
    ["changed", humanNumber(stats.changedCells)],
    ["chunks changed", humanNumber(stats.changedChunks)],
  ].map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join("");
}

function chips(items, empty) {
  return items.length ? items.map((item) => `<span class="node-chip">${escapeHtml(item)}</span>`).join("") : `<span class="empty-copy">${escapeHtml(empty)}</span>`;
}

function describeEvent(event) {
  const target = event.target ? ` → ${actorName(event.target)}` : "";
  const resource = event.resource ? ` · ${event.resource}` : "";
  return `${actorName(event.actor)}: ${event.kind}${target}${resource}`;
}

function renderFabric() {
  const state = world.state;
  const last = world.receipts.at(-1);
  const trace = last ? { woken: last.wokenNodes, fired: last.firedNodes, changed: last.changedPaths } : world.lastTrace;
  elements.traceStatus.textContent = last ? last.status : "GENESIS";
  elements.traceStatus.className = `trace-status ${last ? last.status.toLowerCase() : "idle"}`;
  elements.wokenCount.textContent = trace.woken.length;
  elements.firedCount.textContent = trace.fired.length;
  elements.pathCount.textContent = trace.changed.length;
  elements.wokenNodes.innerHTML = chips(trace.woken, "No turn has woken a node yet.");
  elements.firedNodes.innerHTML = chips(trace.fired, "No node produced a canonical delta.");

  const eventCards = last?.actorEvents.map((event) => {
    const autonomous = event.actor !== "player";
    const cause = autonomous ? last.autonomy.find((decision) => decision.actor === event.actor)?.intent?.cause : "player_intent";
    return `<div class="discovery ${autonomous ? "autonomous" : ""}"><strong>${autonomous ? "AUTONOMOUS · " : "PLAYER · "}${escapeHtml(describeEvent(event))}</strong><span>cause: ${escapeHtml(cause || "unresolved")}</span><code>evidence.events[${event.index}]</code></div>`;
  }) || [];
  const situationCards = state.derived.situations.map((situation) => `<div class="discovery situation"><strong>SITUATION · ${escapeHtml(situation.kind.replaceAll("_", " "))}</strong><span>${escapeHtml(situation.actors.map(actorName).join(" ↔ "))} · ${escapeHtml(situation.state)}</span><code>causal evidence: ${escapeHtml(situation.evidence.join(", "))}</code></div>`);
  elements.discoveries.innerHTML = [...eventCards, ...situationCards].join("") || '<p class="empty-copy">No actor event or projected situation yet.</p>';

  elements.receipts.innerHTML = world.receipts.length
    ? [...world.receipts].reverse().map((receipt) => `<div class="receipt ${receipt.status.toLowerCase()}"><span class="receipt-index">#${String(receipt.sequence).padStart(2, "0")}</span><div><strong>${escapeHtml(receipt.playerIntent.kind)}</strong><span>${escapeHtml(receipt.reason)} · ${receipt.actorEvents.length} actor events · ${receipt.eventId.slice(0, 10)}</span></div><span class="receipt-status">${receipt.status}</span></div>`).join("")
    : '<p class="empty-copy">The receipt chain is empty.</p>';
  elements.state.textContent = JSON.stringify(state, null, 2);
}

function deriveClaim() {
  const situations = world.state.derived.situations;
  if (situations.some((item) => item.kind === "mutual_aid")) return "Observed: one player state change caused an autonomous reciprocal action and a replayable mutual-aid situation. A satisfying RPG is still unproven.";
  if (situations.some((item) => item.kind === "unanswered_need")) return "Observed counterfactual: waiting let another state open an unanswered need. The branch differs causally; RPG coherence is still unproven.";
  if (world.state.evidence.events.length) return "Observed: actor transitions can produce different downstream state. No RPG-like situation has formed yet.";
  return "A sparse deterministic field is awake only where observed. RPG emergence has not been proven.";
}

function render(message, tone = "") {
  const state = world.state;
  elements.revision.textContent = `revision ${state.meta.revision}`;
  elements.digest.textContent = `digest ${world.stateDigest.slice(0, 12)}`;
  elements.claim.textContent = deriveClaim();
  renderActor();
  renderMap();
  renderWorldReadout();
  renderActions();
  renderFabric();
  if (message) {
    elements.system.textContent = message;
    elements.system.style.color = tone === "REFUSED" ? "var(--red)" : tone === "APPLIED" || tone === "PASS" ? "var(--cyan)" : "var(--muted)";
  }
}

elements.map.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-move]");
  if (cell && !cell.disabled) execute(JSON.parse(decodeURIComponent(cell.dataset.move)));
});

elements.actions.addEventListener("click", (event) => {
  const control = event.target.closest("[data-intent]");
  if (control) execute(JSON.parse(decodeURIComponent(control.dataset.intent)));
});

$("#resetButton").addEventListener("click", () => {
  world = new LivingWorld({ seed: elements.seed.value.trim() || "AXM-STATEBORN-LIVING-001" });
  operationCounter = 0;
  render("RESET · sparse genesis derived from the seed; no authored quest was loaded.");
});

$("#probeButton").addEventListener("click", () => {
  world = new LivingWorld({ seed: elements.seed.value.trim() || "AXM-STATEBORN-LIVING-001" });
  const receipts = livingProbe.map((intent, index) => world.advance(intent, {
    operationId: `living-probe-${index}`,
    expectedRevision: world.state.meta.revision,
  }));
  const failures = receipts.filter((receipt) => receipt.status !== "APPLIED");
  const mutualAid = world.state.derived.situations.some((item) => item.kind === "mutual_aid");
  render(failures.length
    ? `PROBE HOLD · ${failures.length} transition(s) were refused.`
    : `PROBE OBSERVED · one player act yielded ${receipts[0].actorEvents.length} actor events${mutualAid ? " and a causal mutual-aid situation" : ""}.`, failures.length ? "REFUSED" : "PASS");
});

$("#replayButton").addEventListener("click", () => {
  const result = world.verifyReplay();
  render(result.status === "PASS"
    ? `REPLAY PASS · ${result.eventsReplayed} applied turns reconstructed ${result.actual.slice(0, 12)}.`
    : `REPLAY FAIL · divergence detected at receipt ${result.at}.`, result.status);
});

$("#saveButton").addEventListener("click", () => {
  localStorage.setItem("axm-stateborn-save-v2", JSON.stringify(world.exportSave()));
  render("LOCAL SAVE SEALED · sparse state and receipt chain stored on this device only.", "PASS");
});

$("#loadButton").addEventListener("click", () => {
  const raw = localStorage.getItem("axm-stateborn-save-v2");
  if (!raw) return render("LOAD REFUSED · no v0.2 local save exists.", "REFUSED");
  const result = world.importSave(JSON.parse(raw));
  render(result.status === "IMPORTED" ? `LOAD PASS · revision ${result.revision} restored and replay-checked.` : `LOAD REFUSED · ${result.reason}.`, result.status === "IMPORTED" ? "PASS" : "REFUSED");
});

$("#methodButton").addEventListener("click", () => elements.method.showModal());

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((candidate) => {
    const active = candidate === tab;
    candidate.classList.toggle("active", active);
    candidate.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tab-page").forEach((page) => page.classList.remove("active"));
  $(`#${tab.dataset.tab}Page`).classList.add("active");
}));

// Inspectable runtime handle; field cache remains noncanonical and is excluded from state digests.
window.AXM_STATEBORN = { get world() { return world; }, livingFabricCatalog };

render("Ready. Change one state—or wait—and inspect what wakes underneath.");
