(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const EVENT_COPY = Object.freeze({
    SEND: (event) => `${event.logicalKey || "packet"} sent · attempt ${event.attempt ?? "?"} · ${event.faultKind || "PASS"}`,
    DROP: (event) => `${event.logicalKey || "packet"} dropped before delivery · protocol state held`,
    DELIVER_APPLIED: (event) => `${event.logicalKey || "packet"} accepted · protocol state advanced`,
    DELIVER_REFUSED: (event) => `${event.logicalKey || "packet"} refused${event.reasonCode == null ? "" : ` · reason ${event.reasonCode}`} · boundary held`,
    DUPLICATE_SUPPRESSED: (event) => `duplicate ${event.logicalKey || "packet"} blocked · no second state effect`,
    EXPIRED: (event) => `${event.logicalKey || "packet"} expired before acceptance · protocol state held`,
    REORDER: (event) => `${event.logicalKey || "packet"} arrived behind a later send · ordering retained`,
    DISCONNECT: () => "link entered the frozen offline window · checkpoint sealed",
    RECONNECT: (event) => `link reconnected · ${event.queued ?? 0} queued envelope${event.queued === 1 ? "" : "s"}`,
    RECOVERY_PASS: () => "checkpoint replay rebuilt the exact protocol state",
    RECOVERY_FAIL: (event) => `checkpoint recovery failed closed${event.reason ? ` · ${event.reason}` : ""}`,
    ATTEMPTS_EXHAUSTED: (event) => `${event.logicalKey || "packet"} exhausted its retry budget · route deadlocked`,
    LOCAL_DEADLOCK: (event) => `${event.logicalKey || "state task"} cannot produce the required packet · route deadlocked`,
    TICK_LIMIT: () => "transport tick limit reached · route deadlocked",
  });

  const EVENT_TONE = Object.freeze({
    DELIVER_APPLIED: "applied",
    RECOVERY_PASS: "recovered",
    DROP: "blocked",
    DELIVER_REFUSED: "blocked",
    DUPLICATE_SUPPRESSED: "blocked",
    EXPIRED: "blocked",
    RECOVERY_FAIL: "blocked",
    ATTEMPTS_EXHAUSTED: "blocked",
    LOCAL_DEADLOCK: "blocked",
    TICK_LIMIT: "blocked",
    DISCONNECT: "offline",
    RECONNECT: "recovered",
    REORDER: "warning",
    SEND: "moving",
  });

  const TONE_PRIORITY = Object.freeze({ blocked: 6, recovered: 5, applied: 4, offline: 3, warning: 2, moving: 1, idle: 0 });

  function describeEvent(event = {}) {
    const formatter = EVENT_COPY[event.type];
    return formatter ? formatter(event) : `${event.type || "TRANSPORT"} · evidence retained`;
  }

  function dominantTone(events = []) {
    return events.reduce((best, event) => {
      const tone = EVENT_TONE[event.type] || "idle";
      return TONE_PRIORITY[tone] > TONE_PRIORITY[best] ? tone : best;
    }, "idle");
  }

  function summarizeDelta({ action = "tick", beforeTick = 0, afterTick = 0, events = [], protocolChanged = false, closed = false } = {}) {
    const tone = dominantTone(events);
    const title = action === "run"
      ? `Route advanced ${Math.max(0, afterTick - beforeTick)} tick${afterTick - beforeTick === 1 ? "" : "s"}`
      : action === "reset"
        ? "Frozen route restored"
        : `Tick ${beforeTick} → ${afterTick}`;
    const lines = events.length ? events.map(describeEvent) : [action === "reset" ? "No transport evidence has been emitted yet." : "No transport event was emitted on this step."];
    return {
      title,
      lines,
      tone,
      effect: action === "reset" ? "RESET" : protocolChanged ? "PROTOCOL STATE CHANGED" : "PROTOCOL STATE HELD",
      effectTone: action === "reset" ? "neutral" : protocolChanged ? "changed" : "held",
      closed,
    };
  }

  function nextActionFor(trial) {
    if (!trial) return "Next: transport state is unavailable.";
    if (trial.closed) return "Next: verify exact replay or choose another frozen route.";
    if (!trial.online) return "Next: advance ticks until the frozen reconnect window ends.";
    const queued = (trial.queue || []).filter((item) => item.status === "QUEUED").length;
    if (queued) return `Next: advance time for ${queued} queued envelope${queued === 1 ? "" : "s"} to deliver or expire.`;
    return "Next: advance one tick; the simulator will plan the next required packet.";
  }

  function shortcutAction(key) {
    if (key === " " || key === "Enter") return "tick";
    if (key === "r" || key === "R") return "run";
    if (key === "v" || key === "V") return "replay";
    if (key === "Escape") return "reset";
    if (key === "[") return "previous";
    if (key === "]") return "next";
    return null;
  }

  const publicApi = Object.freeze({ describeEvent, dominantTone, summarizeDelta, nextActionFor, shortcutAction });
  root.AXM_STATE_TRANSPORT_EXPERIENCE = publicApi;

  const documentRef = root.document;
  const transport = root.AXM_STATE_TRANSPORT;
  if (!documentRef || !transport) return;

  const $ = (selector) => documentRef.querySelector(selector);
  const focus = $("#tickFocus");
  const effect = $("#stateEffectPill");
  const title = $("#tickFocusTitle");
  const copy = $("#tickFocusCopy");
  const list = $("#tickFocusEvents");
  const next = $("#nextAction");
  const rail = documentRef.querySelector(".route-rail");
  const fixtureSelect = $("#fixtureSelect");
  if (!focus || !effect || !title || !copy || !list || !next || !rail || !fixtureSelect) return;

  let snapshot = null;

  function capture(action) {
    const trial = transport.trial;
    snapshot = {
      action,
      tick: trial?.tick ?? 0,
      ledger: trial?.ledger?.length ?? 0,
      digest: trial?.engine?.stateDigest ?? null,
    };
  }

  function renderSnapshot(actionOverride = null) {
    const trial = transport.trial;
    if (!trial) return;
    const before = snapshot || { action: actionOverride || "tick", tick: trial.tick, ledger: trial.ledger.length, digest: trial.engine?.stateDigest ?? null };
    const action = actionOverride || before.action || "tick";
    const events = action === "reset" ? [] : trial.ledger.slice(before.ledger);
    const changed = before.digest != null && trial.engine?.stateDigest != null && before.digest !== trial.engine.stateDigest;
    const summary = summarizeDelta({ action, beforeTick: before.tick, afterTick: trial.tick, events, protocolChanged: changed, closed: trial.closed });
    title.textContent = summary.title;
    copy.textContent = events.length
      ? `${events.length} new transport event${events.length === 1 ? "" : "s"} · presentation is derived from the receipt ledger.`
      : summary.lines[0];
    list.innerHTML = summary.lines.map((line) => `<li>${String(line).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character])}</li>`).join("");
    effect.textContent = summary.effect;
    effect.className = `state-effect ${summary.effectTone}`;
    focus.dataset.tone = summary.tone;
    rail.dataset.tone = summary.tone;
    next.textContent = nextActionFor(trial);
    snapshot = { action: "tick", tick: trial.tick, ledger: trial.ledger.length, digest: trial.engine?.stateDigest ?? null };
  }

  function bindAction(selector, action) {
    const element = $(selector);
    if (!element) return;
    element.addEventListener("click", () => capture(action), { capture: true });
    element.addEventListener("click", () => queueMicrotask(() => renderSnapshot(action)));
  }

  bindAction("#tickButton", "tick");
  bindAction("#runButton", "run");
  bindAction("#resetButton", "reset");
  bindAction("#replayButton", "replay");

  fixtureSelect.addEventListener("change", () => capture("reset"), { capture: true });
  fixtureSelect.addEventListener("change", () => queueMicrotask(() => renderSnapshot("reset")));

  function changeFixture(delta) {
    const options = [...fixtureSelect.options];
    if (!options.length) return;
    const index = options.findIndex((option) => option.value === fixtureSelect.value);
    const nextIndex = (index + delta + options.length) % options.length;
    fixtureSelect.value = options[nextIndex].value;
    fixtureSelect.dispatchEvent(new Event("change", { bubbles: true }));
    fixtureSelect.focus();
  }

  documentRef.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const action = shortcutAction(event.key);
    if (!action) return;
    event.preventDefault();
    if (action === "tick") $("#tickButton")?.click();
    else if (action === "run") $("#runButton")?.click();
    else if (action === "replay") $("#replayButton")?.click();
    else if (action === "reset") $("#resetButton")?.click();
    else if (action === "previous") changeFixture(-1);
    else if (action === "next") changeFixture(1);
  });

  snapshot = { action: "tick", tick: transport.trial.tick, ledger: transport.trial.ledger.length, digest: transport.trial.engine?.stateDigest ?? null };
  renderSnapshot("reset");
})();
