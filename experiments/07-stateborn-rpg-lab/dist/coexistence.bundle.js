(() => {
  // dist/engine.js
  var encoder = new TextEncoder();
  function deepClone(value) {
    return value === void 0 ? void 0 : JSON.parse(JSON.stringify(value));
  }
  function canonicalStringify(value) {
    if (value === void 0) return '"__AXM_UNDEFINED__"';
    if (value === null || typeof value === "boolean" || typeof value === "string") {
      return JSON.stringify(value);
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("Canonical state refuses non-finite numbers");
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
    }
    throw new TypeError(`Unsupported canonical value: ${typeof value}`);
  }
  function sha256(input) {
    const bytes = typeof input === "string" ? encoder.encode(input) : input;
    const words = [];
    const bitLength = bytes.length * 8;
    for (let index = 0; index < bytes.length; index += 1) {
      words[index >> 2] = (words[index >> 2] || 0) | bytes[index] << 24 - index % 4 * 8;
    }
    words[bitLength >> 5] = (words[bitLength >> 5] || 0) | 128 << 24 - bitLength % 32;
    words[(bitLength + 64 >> 9 << 4) + 15] = bitLength;
    const constants = [
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ];
    const rotate = (value, amount) => value >>> amount | value << 32 - amount;
    let h0 = 1779033703;
    let h1 = 3144134277;
    let h2 = 1013904242;
    let h3 = 2773480762;
    let h4 = 1359893119;
    let h5 = 2600822924;
    let h6 = 528734635;
    let h7 = 1541459225;
    for (let offset = 0; offset < words.length; offset += 16) {
      const schedule = new Array(64);
      for (let i = 0; i < 16; i += 1) schedule[i] = words[offset + i] | 0;
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotate(schedule[i - 15], 7) ^ rotate(schedule[i - 15], 18) ^ schedule[i - 15] >>> 3;
        const s1 = rotate(schedule[i - 2], 17) ^ rotate(schedule[i - 2], 19) ^ schedule[i - 2] >>> 10;
        schedule[i] = schedule[i - 16] + s0 + schedule[i - 7] + s1 | 0;
      }
      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;
      for (let i = 0; i < 64; i += 1) {
        const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
        const choice = e & f ^ ~e & g;
        const temp1 = h + s1 + choice + constants[i] + schedule[i] | 0;
        const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
        const majority = a & b ^ a & c ^ b & c;
        const temp2 = s0 + majority | 0;
        h = g;
        g = f;
        f = e;
        e = d + temp1 | 0;
        d = c;
        c = b;
        b = a;
        a = temp1 + temp2 | 0;
      }
      h0 = h0 + a | 0;
      h1 = h1 + b | 0;
      h2 = h2 + c | 0;
      h3 = h3 + d | 0;
      h4 = h4 + e | 0;
      h5 = h5 + f | 0;
      h6 = h6 + g | 0;
      h7 = h7 + h | 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
  }
  function digest(value) {
    return sha256(canonicalStringify(value));
  }

  // dist/living-world.js
  var GENERATOR_VERSION = "axm.stateborn.field/v2";
  function seedNumber(seed) {
    let value = 2166136261;
    for (const character of seed) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }
  function noise(seedValue, x, y) {
    let value = seedValue ^ Math.imul(x + 1, 2654435761) ^ Math.imul(y + 1, 2246822519);
    value ^= value >>> 16;
    value = Math.imul(value, 2146121005);
    value ^= value >>> 15;
    value = Math.imul(value, 2221713035);
    value ^= value >>> 16;
    return value >>> 0;
  }
  var keyOf = (x, y) => `${x}_${y}`;
  function setPath(root, path, value, changed) {
    const segments = path.split(".");
    const leaf = segments.pop();
    let cursor = root;
    for (const segment of segments) {
      if (!cursor[segment] || typeof cursor[segment] !== "object") cursor[segment] = {};
      cursor = cursor[segment];
    }
    const next = deepClone(value);
    if (canonicalStringify(cursor[leaf]) === canonicalStringify(next)) return false;
    cursor[leaf] = next;
    changed.push(path);
    return true;
  }
  var DeterministicField = class {
    constructor({ seed, width, height, chunkSize = 32 }) {
      this.seed = seed;
      this.width = width;
      this.height = height;
      this.chunkSize = chunkSize;
      this.seedValue = seedNumber(seed);
      this.cache = /* @__PURE__ */ new Map();
      this.baseCommitment = digest({ generator: GENERATOR_VERSION, seed, width, height, chunkSize });
    }
    contains(x, y) {
      return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
    }
    baseCell(x, y) {
      if (!this.contains(x, y)) return null;
      const key = keyOf(x, y);
      if (this.cache.has(key)) return this.cache.get(key);
      const value = noise(this.seedValue, x, y);
      const terrain = ["moss", "shale", "reed", "ash"][value % 4];
      const resources = {
        food: terrain === "moss" ? (value >>> 3) % 4 : 0,
        water: terrain === "reed" ? 1 + (value >>> 6) % 3 : 0,
        fiber: terrain === "moss" || terrain === "reed" ? (value >>> 9) % 4 : 0,
        stone: terrain === "shale" || terrain === "ash" ? (value >>> 12) % 4 : 0
      };
      const cell = Object.freeze({ id: key, kind: "cell", x, y, terrain, resources: Object.freeze(resources), shelter: 0 });
      this.cache.set(key, cell);
      return cell;
    }
    cell(state, x, y) {
      const base = this.baseCell(x, y);
      if (!base) return null;
      const override = state.world.overrides[keyOf(x, y)];
      if (!override) return deepClone(base);
      return {
        ...deepClone(base),
        ...deepClone(override),
        resources: { ...deepClone(base.resources), ...deepClone(override.resources) || {} }
      };
    }
    chunkOf(x, y) {
      return `${Math.floor(x / this.chunkSize)}_${Math.floor(y / this.chunkSize)}`;
    }
    stats(state) {
      const changedCells = Object.keys(state.world.overrides);
      return {
        logicalCells: this.width * this.height,
        materializedCells: this.cache.size,
        changedCells: changedCells.length,
        changedChunks: new Set(changedCells.map((key) => {
          const [x, y] = key.split("_").map(Number);
          return this.chunkOf(x, y);
        })).size,
        sleepingCells: this.width * this.height - this.cache.size
      };
    }
  };
  var identityLabels = {
    gather: "Forager-shaped",
    move: "Pathfinder-shaped",
    share: "Keeper-shaped",
    build: "Maker-shaped",
    request: "Signal-seeker-shaped",
    consume: "Survivor-shaped",
    wait: "Witness-shaped"
  };
  var rules = [
    {
      id: "identity.project_behavior",
      subscribes: ["evidence.behaviors"],
      run(state, changed) {
        for (const [actorId, counts] of Object.entries(state.evidence.behaviors)) {
          const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
          const [kind, strength] = ranked[0] || [null, 0];
          const pattern = strength < 1 ? { label: "Unformed", strength: 0, basis: "No repeated behavior yet" } : { label: identityLabels[kind] || "Unclassified", strength, basis: `${kind} is the strongest receipt-backed behavior` };
          setPath(state, `derived.identityPatterns.${actorId}`, pattern, changed);
        }
      }
    },
    {
      id: "situations.project_causal_patterns",
      subscribes: ["evidence.events", "signals.requests", "relations"],
      run(state, changed) {
        const situations = [];
        const shares = state.evidence.events.filter((event) => event.kind === "share");
        const actorIds = Object.keys(state.actors).sort();
        for (let leftIndex = 0; leftIndex < actorIds.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < actorIds.length; rightIndex += 1) {
            const left = actorIds[leftIndex];
            const right = actorIds[rightIndex];
            const leftToRight = shares.some((event) => event.actor === left && event.target === right);
            const rightToLeft = shares.some((event) => event.actor === right && event.target === left);
            if (leftToRight && rightToLeft) {
              situations.push({
                id: `mutual_aid_${left}_${right}`,
                kind: "mutual_aid",
                actors: [left, right],
                state: "formed",
                evidence: shares.filter((event) => [left, right].includes(event.actor) && [left, right].includes(event.target)).map((event) => event.index)
              });
            }
          }
        }
        for (const request of Object.values(state.signals.requests).filter((entry) => entry.active)) {
          situations.push({
            id: `unanswered_${request.actor}_${request.resource}`,
            kind: "unanswered_need",
            actors: [request.actor],
            resource: request.resource,
            state: "open",
            evidence: [request.openedTurn]
          });
        }
        setPath(state, "derived.situations", situations, changed);
      }
    }
  ];
  var livingFabricCatalog = {
    logicalWorld: "deterministic sparse field",
    generatorVersion: GENERATOR_VERSION,
    ruleNodes: rules.map((rule) => ({ id: rule.id, subscribes: rule.subscribes })),
    autonomyNodes: ["autonomy.perceive.rhea", "autonomy.perceive.orr"],
    actionKinds: ["move", "gather", "share", "consume", "request", "build", "rest", "wait"]
  };

  // dist/curiosity-world.js
  var CURIOSITY_SIGNALS = ["hush", "pulse", "turn", "open"];
  var BASE_VITALITY = 3;
  var FIELD_VERSION = "axm.stateborn.curiosity-field/v1";
  function numberFrom(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 16;
    return hash >>> 0;
  }
  function keyOf2(x, y) {
    return `${x}_${y}`;
  }
  function conditionOf(vitality) {
    if (vitality >= 5) return "bloom";
    if (vitality <= 1) return "scar";
    return "quiet";
  }
  var CuriosityField = class {
    constructor({ seed, width, height, chunkSize = 32 }) {
      this.seed = seed;
      this.width = width;
      this.height = height;
      this.chunkSize = chunkSize;
      this.terrainField = new DeterministicField({ seed: `${seed}:terrain`, width, height, chunkSize });
      this.baseCommitment = digest({
        schema: FIELD_VERSION,
        seed,
        width,
        height,
        chunkSize,
        terrainCommitment: this.terrainField.baseCommitment,
        baseVitality: BASE_VITALITY
      });
    }
    contains(x, y) {
      return this.terrainField.contains(x, y);
    }
    baseCell(x, y) {
      const terrain = this.terrainField.baseCell(x, y);
      if (!terrain) return null;
      const hidden = numberFrom(`${this.seed}:${x}:${y}`);
      return {
        id: keyOf2(x, y),
        x,
        y,
        terrain: terrain.terrain,
        phase: (hidden >>> 5) % CURIOSITY_SIGNALS.length,
        vitality: BASE_VITALITY,
        touches: 0,
        condition: "quiet"
      };
    }
    affinity(x, y) {
      return numberFrom(`${this.seed}:affinity:${x}:${y}`) % CURIOSITY_SIGNALS.length;
    }
    cell(state, x, y) {
      const base = this.baseCell(x, y);
      if (!base) return null;
      const override = state.world.overrides[keyOf2(x, y)] || {};
      const cell = { ...base, ...deepClone(override) };
      cell.condition = conditionOf(cell.vitality);
      return cell;
    }
    stats(state) {
      const changed = Object.keys(state.world.overrides);
      return {
        logicalCells: this.width * this.height,
        materializedCells: this.terrainField.cache.size,
        sleepingCells: this.width * this.height - this.terrainField.cache.size,
        changedCells: changed.length,
        changedChunks: new Set(changed.map((key) => {
          const [x, y] = key.split("_").map(Number);
          return `${Math.floor(x / this.chunkSize)}_${Math.floor(y / this.chunkSize)}`;
        })).size
      };
    }
  };

  // dist/coexistence-world.js
  var DIRECTIONS = [
    { id: "north", dx: 0, dy: -1 },
    { id: "east", dx: 1, dy: 0 },
    { id: "south", dx: 0, dy: 1 },
    { id: "west", dx: -1, dy: 0 }
  ];
  var ROLES = ["human", "machine", "ai"];
  var BASE_VITALITY2 = 3;
  var POLICY_VERSION = "axm.stateborn.coexistence-policy/v1";
  function numberFrom2(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 16;
    return hash >>> 0;
  }
  var keyOf3 = (x, y) => `${x}_${y}`;
  var signatureOf = (cell) => `${cell.terrain}:${cell.phase}`;
  var clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  function circularDistance(left, right, size) {
    const direct = Math.abs(left - right);
    return Math.min(direct, size - direct);
  }
  function recordCount(map, key) {
    map[key] = Number(map[key] || 0) + 1;
  }
  function actorTemplate(id, name, role, center) {
    return { id, name, role, position: deepClone(center), movesSinceTouch: 1, memory: { seen: {}, trials: {}, recent: [] } };
  }
  function createGenesis(options, field) {
    const center = { x: Math.floor(options.width / 2), y: Math.floor(options.height / 2) };
    return {
      schema: "axm.stateborn.coexistence-world/v1",
      seed: options.seed,
      meta: { revision: 0, cycle: 0, policy: POLICY_VERSION, claim: "EXPERIMENTAL", fixture: "AUTHORED_SHARED_START" },
      world: { width: options.width, height: options.height, chunkSize: options.chunkSize, baseCommitment: field.baseCommitment, overrides: {} },
      actors: {
        witness: actorTemplate("witness", "Witness", "human", center),
        mote: actorTemplate("mote", "Mote", "machine", center),
        lumen: actorTemplate("lumen", "Lumen", "ai", center)
      },
      evidence: { events: [] },
      derived: {
        observer: { growthEvents: 0, damageEvents: 0, changeEvents: 0, movementEvents: 0, waitEvents: 0, changedCells: 0, healthDelta: 0 },
        threads: []
      }
    };
  }
  function normalizeIntent(actor, raw) {
    if (!raw || typeof raw !== "object") return { error: "INTENT_REQUIRED" };
    if (!["move", "signal", "wait"].includes(raw.kind)) return { error: "UNKNOWN_INTENT_KIND" };
    if (raw.kind === "wait") return { intent: { kind: "wait" } };
    if (raw.kind === "signal") return CURIOSITY_SIGNALS.includes(raw.signal) ? { intent: { kind: "signal", signal: raw.signal } } : { error: "UNKNOWN_SIGNAL" };
    let direction = DIRECTIONS.find((candidate) => candidate.id === raw.direction);
    if (!direction && raw.to && Number.isInteger(raw.to.x) && Number.isInteger(raw.to.y)) {
      direction = DIRECTIONS.find((candidate) => actor.position.x + candidate.dx === raw.to.x && actor.position.y + candidate.dy === raw.to.y);
    }
    if (!direction) return { error: "MOVE_NOT_CARDINAL_ADJACENT" };
    return { intent: { kind: "move", direction: direction.id, to: { x: actor.position.x + direction.dx, y: actor.position.y + direction.dy } } };
  }
  function validateIntent(state, field, actorId, raw) {
    const result = normalizeIntent(state.actors[actorId], raw);
    if (result.intent?.kind === "move" && !field.contains(result.intent.to.x, result.intent.to.y)) return { error: "MOVE_OUT_OF_BOUNDS" };
    return result;
  }
  function machinePolicyView(state, field) {
    const actor = state.actors.mote;
    const here = field.cell(state, actor.position.x, actor.position.y);
    const signature = signatureOf(here);
    const neighbours = DIRECTIONS.map((direction) => {
      const x = actor.position.x + direction.dx;
      const y = actor.position.y + direction.dy;
      const cell = field.cell(state, x, y);
      if (!cell) return null;
      const nextSignature = signatureOf(cell);
      return {
        direction: direction.id,
        x,
        y,
        terrain: cell.terrain,
        phase: cell.phase,
        seenCount: Number(actor.memory.seen[nextSignature] || 0),
        triedCount: Number(actor.memory.trials[`move:${direction.id}:${nextSignature}`] || 0)
      };
    }).filter(Boolean);
    return {
      schema: "axm.stateborn.machine-curiosity-view/v1",
      actor: actor.id,
      cycle: state.meta.cycle,
      position: deepClone(actor.position),
      current: { terrain: here.terrain, phase: here.phase, signature },
      neighbours,
      signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${signature}`] || 0)])),
      currentSeenCount: Number(actor.memory.seen[signature] || 0),
      movesSinceTouch: actor.movesSinceTouch
    };
  }
  function chooseMachineIntent(view, seed) {
    const candidates = view.neighbours.map((neighbour) => ({
      intent: { kind: "move", direction: neighbour.direction, to: { x: neighbour.x, y: neighbour.y } },
      score: (neighbour.seenCount === 0 ? 100 : Math.max(4, 28 - neighbour.seenCount * 4)) + (neighbour.triedCount === 0 ? 10 : 0),
      basis: neighbour.seenCount === 0 ? "unseen_neighbour" : "least_familiar_neighbour",
      key: `move:${neighbour.direction}`
    }));
    for (const signal of CURIOSITY_SIGNALS) {
      const trials = view.signalTrials[signal];
      candidates.push({
        intent: { kind: "signal", signal },
        score: (trials === 0 ? 68 : Math.max(2, 18 - trials * 4)) + view.movesSinceTouch * 48,
        basis: trials === 0 ? "untried_signal_in_context" : "least_tried_signal_in_context",
        key: `signal:${signal}`
      });
    }
    return candidates.sort((left, right) => right.score - left.score || numberFrom2(`${seed}:${view.cycle}:machine:${left.key}`) - numberFrom2(`${seed}:${view.cycle}:machine:${right.key}`) || left.key.localeCompare(right.key))[0];
  }
  function aiProposalView(state, field) {
    const actor = state.actors.lumen;
    const here = field.cell(state, actor.position.x, actor.position.y);
    const signature = signatureOf(here);
    return {
      schema: "axm.stateborn.ai-proposal-view/v1",
      cycle: state.meta.cycle,
      seat: { id: actor.id, role: actor.role, position: deepClone(actor.position) },
      current: { terrain: here.terrain, phase: here.phase, condition: here.condition, touches: here.touches },
      otherSeats: Object.values(state.actors).filter((candidate) => candidate.id !== actor.id).map((candidate) => ({ id: candidate.id, role: candidate.role, position: deepClone(candidate.position) })),
      allowedIntentKinds: ["move", "signal", "wait"],
      allowedSignals: [...CURIOSITY_SIGNALS],
      signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${signature}`] || 0)])),
      recentEvents: state.evidence.events.slice(-6).map((event) => ({ eventId: event.eventId, role: event.role, cell: event.cell, kind: event.intent.kind, outcome: event.observerOutcome }))
    };
  }
  function standInProposal(view, seed) {
    const coLocated = view.otherSeats.some((seat) => seat.position.x === view.seat.position.x && seat.position.y === view.seat.position.y);
    if (coLocated) {
      const least = Math.min(...Object.values(view.signalTrials));
      const signal = CURIOSITY_SIGNALS.filter((candidate) => view.signalTrials[candidate] === least).sort((left, right) => numberFrom2(`${seed}:${view.cycle}:stand-in:${left}`) - numberFrom2(`${seed}:${view.cycle}:stand-in:${right}`) || left.localeCompare(right))[0];
      return { intent: { kind: "signal", signal }, basis: "least_tried_signal_while_co_located" };
    }
    const target = [...view.otherSeats].sort((left, right) => {
      const leftDistance = Math.abs(left.position.x - view.seat.position.x) + Math.abs(left.position.y - view.seat.position.y);
      const rightDistance = Math.abs(right.position.x - view.seat.position.x) + Math.abs(right.position.y - view.seat.position.y);
      return leftDistance - rightDistance || left.id.localeCompare(right.id);
    })[0];
    if (!target) return { intent: { kind: "wait" }, basis: "no_other_seat_visible" };
    const horizontal = target.position.x - view.seat.position.x;
    const vertical = target.position.y - view.seat.position.y;
    const direction = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal > 0 ? "east" : "west" : vertical > 0 ? "south" : "north";
    return { intent: { kind: "move", direction }, basis: "step_toward_nearest_visible_seat" };
  }
  function applyIntent(state, field, actorId, intent, decisionBasis) {
    const actor = state.actors[actorId];
    const beforePosition = deepClone(actor.position);
    const here = field.cell(state, actor.position.x, actor.position.y);
    const signature = signatureOf(here);
    recordCount(actor.memory.seen, signature);
    let observerOutcome = null;
    let consequence = null;
    let eventCell = here.id;
    if (intent.kind === "move") {
      const target = field.cell(state, intent.to.x, intent.to.y);
      recordCount(actor.memory.trials, `move:${intent.direction}:${signatureOf(target)}`);
      actor.position = deepClone(intent.to);
      actor.movesSinceTouch += 1;
      eventCell = target.id;
    } else if (intent.kind === "signal") {
      const signalIndex = CURIOSITY_SIGNALS.indexOf(intent.signal);
      const targetIndex = (field.affinity(here.x, here.y) + here.phase) % CURIOSITY_SIGNALS.length;
      const distance = circularDistance(signalIndex, targetIndex, CURIOSITY_SIGNALS.length);
      const proposedDelta = distance === 0 ? 2 : distance === 2 ? -2 : 0;
      const nextVitality = clamp(here.vitality + proposedDelta, 0, 6);
      const vitalityDelta = nextVitality - here.vitality;
      const nextPhase = (here.phase + signalIndex + 1) % CURIOSITY_SIGNALS.length;
      state.world.overrides[here.id] = { vitality: nextVitality, phase: nextPhase, touches: here.touches + 1 };
      recordCount(actor.memory.trials, `signal:${intent.signal}:${signature}`);
      actor.movesSinceTouch = 0;
      observerOutcome = vitalityDelta > 0 ? "growth" : vitalityDelta < 0 ? "damage" : "change";
      consequence = { cell: here.id, vitalityDelta, vitalityBefore: here.vitality, vitalityAfter: nextVitality, phaseBefore: here.phase, phaseAfter: nextPhase };
    } else {
      recordCount(actor.memory.trials, `wait:${signature}`);
      observerOutcome = "quiet";
    }
    actor.memory.recent = [...actor.memory.recent, { cycle: state.meta.cycle, at: signature, kind: intent.kind }].slice(-12);
    const event = {
      schema: "axm.stateborn.coexistence-event/v1",
      index: state.evidence.events.length,
      cycle: state.meta.cycle,
      actor: actor.id,
      role: actor.role,
      from: beforePosition,
      to: deepClone(actor.position),
      cell: eventCell,
      intent: deepClone(intent),
      decisionBasis,
      observerOutcome,
      consequence
    };
    event.eventId = digest(event);
    state.evidence.events.push(event);
    return event;
  }
  function projectThreads(state) {
    const byCell = /* @__PURE__ */ new Map();
    for (const event of state.evidence.events) {
      if (!byCell.has(event.cell)) byCell.set(event.cell, []);
      byCell.get(event.cell).push(event);
    }
    const threads = [];
    for (const [cell, events] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const touches = events.filter((event) => event.intent.kind === "signal");
      const roles = new Set(touches.map((event) => event.role));
      if (roles.size >= 2) threads.push({
        id: `shared_site:${cell}`,
        kind: "shared_site",
        cell,
        roles: [...roles].sort(),
        evidence: touches.map((event) => event.eventId),
        basis: "two or more roles committed signals at this cell"
      });
      if (ROLES.every((role) => roles.has(role))) threads.push({
        id: `three_way_mark:${cell}`,
        kind: "three_way_mark",
        cell,
        roles: [...ROLES],
        evidence: touches.map((event) => event.eventId),
        basis: "human, machine, and AI-compatible seats each committed a signal here"
      });
      for (let index = 0; index < touches.length; index += 1) {
        const damage = touches[index];
        if ((damage.consequence?.vitalityDelta || 0) >= 0) continue;
        const recovery = touches.slice(index + 1).find((event) => event.role !== damage.role && (event.consequence?.vitalityDelta || 0) > 0);
        if (recovery) {
          threads.push({
            id: `cross_role_recovery:${cell}`,
            kind: "cross_role_recovery",
            cell,
            roles: [damage.role, recovery.role],
            evidence: [damage.eventId, recovery.eventId],
            basis: "a different role produced positive vitality after recorded damage"
          });
          break;
        }
      }
    }
    const occupants = /* @__PURE__ */ new Map();
    for (const actor of Object.values(state.actors)) {
      const cell = keyOf3(actor.position.x, actor.position.y);
      if (!occupants.has(cell)) occupants.set(cell, []);
      occupants.get(cell).push(actor);
    }
    for (const [cell, actors] of occupants) {
      if (actors.length < 2) continue;
      const evidence = actors.map((actor) => [...state.evidence.events].reverse().find((event) => event.actor === actor.id && event.cell === cell)).filter(Boolean);
      if (evidence.length === actors.length) threads.push({
        id: `encounter:${cell}`,
        kind: "encounter",
        cell,
        roles: actors.map((actor) => actor.role).sort(),
        evidence: evidence.map((event) => event.eventId),
        basis: "co-located seats each have a recorded event at this cell"
      });
    }
    return threads.sort((left, right) => left.id.localeCompare(right.id));
  }
  function updateDerived(state) {
    const signals = state.evidence.events.filter((event) => event.intent.kind === "signal");
    const changed = Object.entries(state.world.overrides);
    state.derived.observer = {
      growthEvents: signals.filter((event) => event.observerOutcome === "growth").length,
      damageEvents: signals.filter((event) => event.observerOutcome === "damage").length,
      changeEvents: signals.filter((event) => event.observerOutcome === "change").length,
      movementEvents: state.evidence.events.filter((event) => event.intent.kind === "move").length,
      waitEvents: state.evidence.events.filter((event) => event.intent.kind === "wait").length,
      changedCells: changed.length,
      healthDelta: changed.reduce((sum, [, override]) => sum + Number(override.vitality - BASE_VITALITY2), 0)
    };
    state.derived.threads = projectThreads(state);
  }
  function validateState(state, field) {
    for (const actor of Object.values(state.actors)) {
      if (!ROLES.includes(actor.role)) return `actor.role:${actor.id}`;
      if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
    }
    for (const [cell, override] of Object.entries(state.world.overrides)) {
      if (override.vitality < 0 || override.vitality > 6) return `cell.vitality:${cell}`;
      if (override.phase < 0 || override.phase >= CURIOSITY_SIGNALS.length) return `cell.phase:${cell}`;
    }
    const events = new Set(state.evidence.events.map((event) => event.eventId));
    for (const thread of state.derived.threads) {
      if (!thread.evidence.length || thread.evidence.some((eventId) => !events.has(eventId))) return `thread.evidence:${thread.id}`;
    }
    return null;
  }
  var CoexistenceWorld = class _CoexistenceWorld {
    constructor({ seed = "AXM-COEXIST-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
      this.options = { seed, width, height, chunkSize };
      this.field = new CuriosityField(this.options);
      this.genesis = createGenesis(this.options, this.field);
      this.state = deepClone(this.genesis);
      this.receipts = [];
      this.operations = /* @__PURE__ */ new Map();
    }
    get stateDigest() {
      return digest({ baseCommitment: this.field.baseCommitment, mutableState: this.state });
    }
    machinePolicyInput() {
      return machinePolicyView(this.state, this.field);
    }
    aiProposalInput() {
      return aiProposalView(this.state, this.field);
    }
    previewMachineDecision() {
      const view = this.machinePolicyInput();
      return { view, ...chooseMachineIntent(view, this.options.seed) };
    }
    previewStandInProposal() {
      const view = this.aiProposalInput();
      return { view, ...standInProposal(view, this.options.seed), source: "DETERMINISTIC_STAND_IN" };
    }
    cycle(humanIntent, { aiProposal, operationId, expectedRevision } = {}) {
      const resolvedOperationId = operationId || `coexistence-${this.receipts.length}`;
      if (this.operations.has(resolvedOperationId)) return { ...deepClone(this.operations.get(resolvedOperationId)), duplicate: true };
      const beforeDigest = this.stateDigest;
      const beforeRevision = this.state.meta.revision;
      const humanValidation = validateIntent(this.state, this.field, "witness", humanIntent);
      const stale = expectedRevision !== void 0 && expectedRevision !== beforeRevision;
      if (stale || humanValidation.error) {
        const refused = {
          schema: "axm.stateborn.coexistence-receipt/v1",
          sequence: this.receipts.length,
          operationId: resolvedOperationId,
          status: "REFUSED",
          reason: stale ? "STALE_REVISION" : `HUMAN_${humanValidation.error}`,
          beforeRevision,
          afterRevision: beforeRevision,
          beforeDigest,
          afterDigest: beforeDigest,
          humanIntent: humanValidation.intent || deepClone(humanIntent),
          machineDecision: null,
          aiDecision: null,
          eventIds: [],
          threadIds: [],
          changedPaths: []
        };
        refused.receiptId = digest(refused);
        this.receipts.push(refused);
        this.operations.set(resolvedOperationId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      const events = [];
      const humanEvent = applyIntent(draft, this.field, "witness", humanValidation.intent, "DIRECT_HUMAN_CHOICE");
      events.push(humanEvent);
      const machineView = machinePolicyView(draft, this.field);
      const machineChoice = chooseMachineIntent(machineView, this.options.seed);
      const machineValidation = validateIntent(draft, this.field, "mote", machineChoice.intent);
      if (machineValidation.error) throw new Error(`machine policy produced invalid intent: ${machineValidation.error}`);
      const machineEvent = applyIntent(draft, this.field, "mote", machineValidation.intent, machineChoice.basis);
      events.push(machineEvent);
      const aiView = aiProposalView(draft, this.field);
      const aiSource = aiProposal === void 0 ? "DETERMINISTIC_STAND_IN" : "EXTERNAL_PROPOSAL";
      const proposed = aiProposal === void 0 ? standInProposal(aiView, this.options.seed) : { intent: deepClone(aiProposal), basis: "external_bounded_proposal" };
      const aiValidation = validateIntent(draft, this.field, "lumen", proposed.intent);
      let aiEvent = null;
      const aiDecision = {
        source: aiSource,
        status: aiValidation.error ? "REFUSED" : "ACCEPTED",
        reason: aiValidation.error || "VALIDATED_BY_LOCAL_REFEREE",
        view: aiView,
        viewDigest: digest(aiView),
        proposal: deepClone(proposed.intent),
        intent: aiValidation.intent || null,
        basis: proposed.basis,
        fallbackUsed: false
      };
      if (!aiValidation.error) {
        aiEvent = applyIntent(draft, this.field, "lumen", aiValidation.intent, proposed.basis);
        events.push(aiEvent);
      }
      draft.meta.revision += 1;
      draft.meta.cycle += 1;
      updateDerived(draft);
      const failure = validateState(draft, this.field);
      if (failure) throw new Error(`coexistence invariant failed: ${failure}`);
      this.state = draft;
      const receipt = {
        schema: "axm.stateborn.coexistence-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedOperationId,
        status: "APPLIED",
        reason: aiDecision.status === "REFUSED" ? `AI_PROPOSAL_REFUSED:${aiDecision.reason}` : "OK",
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        humanIntent: deepClone(humanValidation.intent),
        humanEventId: humanEvent.eventId,
        machineDecision: {
          status: "ACCEPTED",
          view: machineView,
          viewDigest: digest(machineView),
          noveltyPressure: machineChoice.score,
          basis: machineChoice.basis,
          intent: deepClone(machineValidation.intent),
          eventId: machineEvent.eventId
        },
        aiDecision,
        aiEventId: aiEvent?.eventId || null,
        externalProposal: aiSource === "EXTERNAL_PROPOSAL" ? deepClone(aiProposal) : null,
        eventIds: events.map((event) => event.eventId),
        threadIds: draft.derived.threads.map((thread) => thread.id),
        changedPaths: [...events.map((event) => `actors.${event.actor}`), "world.overrides", "evidence.events", "derived.observer", "derived.threads", "meta.revision", "meta.cycle"]
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedOperationId, receipt);
      return deepClone(receipt);
    }
    suggestedHumanIntent(cycle = this.state.meta.cycle) {
      const sequence = [
        { kind: "signal", signal: "open" },
        { kind: "move", direction: "east" },
        { kind: "signal", signal: "turn" },
        { kind: "wait" },
        { kind: "move", direction: "west" },
        { kind: "signal", signal: "pulse" },
        { kind: "move", direction: "south" },
        { kind: "signal", signal: "hush" },
        { kind: "move", direction: "north" }
      ];
      return deepClone(sequence[(cycle + numberFrom2(this.options.seed)) % sequence.length]);
    }
    run(cycles) {
      const results = [];
      for (let index = 0; index < cycles; index += 1) results.push(this.cycle(this.suggestedHumanIntent(), {
        operationId: `run-${this.receipts.length}`,
        expectedRevision: this.state.meta.revision
      }));
      return results;
    }
    visibleCells(radius = 7) {
      const actors = Object.values(this.state.actors);
      const center = {
        x: Math.round(actors.reduce((sum, actor) => sum + actor.position.x, 0) / actors.length),
        y: Math.round(actors.reduce((sum, actor) => sum + actor.position.y, 0) / actors.length)
      };
      const cells = [];
      for (let y = center.y - radius; y <= center.y + radius; y += 1) for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        const cell = this.field.cell(this.state, x, y);
        if (cell) cells.push(cell);
      }
      return cells;
    }
    stats() {
      return {
        cycles: this.state.meta.cycle,
        events: this.state.evidence.events.length,
        threads: this.state.derived.threads.length,
        sharedSites: this.state.derived.threads.filter((thread) => thread.kind === "shared_site").length,
        threeWayMarks: this.state.derived.threads.filter((thread) => thread.kind === "three_way_mark").length,
        logicalNodes: this.options.width * this.options.height + Object.keys(this.state.actors).length,
        ...this.field.stats(this.state),
        ...deepClone(this.state.derived.observer)
      };
    }
    verifyReplay() {
      const replay = new _CoexistenceWorld(this.options);
      for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
        const options = { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision };
        if (receipt.aiDecision.source === "EXTERNAL_PROPOSAL") options.aiProposal = deepClone(receipt.externalProposal);
        const result = replay.cycle(receipt.humanIntent, options);
        const decisionsMatch = canonicalStringify(result.machineDecision.intent) === canonicalStringify(receipt.machineDecision.intent) && canonicalStringify(result.aiDecision.intent) === canonicalStringify(receipt.aiDecision.intent) && result.aiDecision.status === receipt.aiDecision.status;
        if (result.afterDigest !== receipt.afterDigest || !decisionsMatch) return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
      }
      return {
        status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
        cyclesReplayed: replay.state.meta.cycle,
        expected: this.stateDigest,
        actual: replay.stateDigest
      };
    }
  };
  var coexistenceContracts = {
    authority: {
      human: "chooses one validated world intent",
      machine: "chooses one intent from an outcome-blind novelty view",
      ai: "may propose one bounded intent; a proposal is never canonical authority",
      referee: "validates all intents and alone commits consequences"
    },
    machinePolicy: {
      visible: ["terrain", "phase", "unfamiliar neighbours", "context/action trial counts", "moves since touch"],
      forbidden: ["reward", "success", "damage", "vitality", "bloom", "scar", "observer", "outcome"]
    },
    aiSeat: {
      defaultSource: "DETERMINISTIC_STAND_IN",
      externalModelConnected: false,
      invalidProposal: "refuse and idle; never replace it with a hidden fallback"
    },
    threadBoundary: "adventure names are observer projections and require event-id evidence from intersecting roles"
  };

  // dist/coexistence-app.js
  var $ = (selector) => document.querySelector(selector);
  var elements = {
    canvas: $("#coexistenceCanvas"),
    claim: $("#claimText"),
    digest: $("#digestBadge"),
    cycle: $("#cycleHeading"),
    seed: $("#seedInput"),
    metrics: $("#worldMetrics"),
    human: $("#humanDecision"),
    machine: $("#machineDecision"),
    ai: $("#aiDecision"),
    threads: $("#threads"),
    threadCount: $("#threadCount"),
    outcomes: $("#outcomes"),
    ledger: $("#ledger"),
    receiptCount: $("#receiptCount"),
    system: $("#systemMessage"),
    proposal: $("#proposalInput"),
    controls: [...document.querySelectorAll("button")]
  };
  var world = new CoexistenceWorld({ seed: elements.seed.value });
  var running = false;
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }
  var pretty = (value) => String(value).replaceAll("_", " ");
  var format = (value) => new Intl.NumberFormat("en-US").format(value);
  function intentName(intent) {
    if (!intent) return "idle";
    return intent.kind === "signal" ? `signal \xB7 ${intent.signal}` : intent.kind === "move" ? `move \xB7 ${intent.direction || (intent.to ? "coordinate proposal" : "invalid")}` : intent.kind;
  }
  function centerOfSeats() {
    const seats = Object.values(world.state.actors);
    return {
      x: Math.round(seats.reduce((sum, seat) => sum + seat.position.x, 0) / seats.length),
      y: Math.round(seats.reduce((sum, seat) => sum + seat.position.y, 0) / seats.length)
    };
  }
  function drawField() {
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
    const columns = 15;
    const rows = 13;
    const size = Math.min(width / columns, height / rows);
    const offsetX = (width - columns * size) / 2;
    const offsetY = (height - rows * size) / 2;
    const center = centerOfSeats();
    const startX = center.x - Math.floor(columns / 2);
    const startY = center.y - Math.floor(rows / 2);
    const terrain = { moss: "#112a22", reed: "#0a2730", shale: "#202630", ash: "#2b1d23" };
    const threadCells = new Set(world.state.derived.threads.map((thread) => thread.cell));
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const x = startX + column;
      const y = startY + row;
      const cell = world.field.cell(world.state, x, y);
      if (!cell) continue;
      const px = offsetX + column * size;
      const py = offsetY + row * size;
      context.fillStyle = terrain[cell.terrain];
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.strokeStyle = threadCells.has(cell.id) ? "rgba(200,155,255,.74)" : "rgba(190,220,235,.09)";
      context.lineWidth = threadCells.has(cell.id) ? 2 : 1;
      context.strokeRect(px + 2, py + 2, size - 4, size - 4);
      if (cell.touches > 0) {
        const color = cell.condition === "bloom" ? "118,247,170" : cell.condition === "scar" ? "255,111,127" : "105,170,255";
        context.fillStyle = `rgba(${color},${Math.min(0.17 + cell.touches * 0.055, 0.58)})`;
        context.fillRect(px + 4, py + 4, size - 8, size - 8);
        context.strokeStyle = `rgba(${color},.78)`;
        context.beginPath();
        context.arc(px + size / 2, py + size / 2, Math.min(size * 0.24, 7 + cell.touches), 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = "rgba(215,230,240,.25)";
      context.font = `${Math.max(9, size * 0.2)}px ui-monospace,monospace`;
      context.fillText(String(cell.phase), px + 5, py + size - 5);
    }
    const colors = { human: "#ffcb70", machine: "#79f4e8", ai: "#c89bff" };
    const offsets = { human: [-0.18, -0.12], machine: [0.18, -0.12], ai: [0, 0.2] };
    for (const seat of Object.values(world.state.actors)) {
      const column = seat.position.x - startX;
      const row = seat.position.y - startY;
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
      const [ox, oy] = offsets[seat.role];
      const cx = offsetX + (column + 0.5 + ox) * size;
      const cy = offsetY + (row + 0.5 + oy) * size;
      context.save();
      context.shadowColor = colors[seat.role];
      context.shadowBlur = 16;
      context.fillStyle = colors[seat.role];
      context.beginPath();
      context.arc(cx, cy, Math.max(5, size * 0.11), 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = "rgba(235,245,250,.82)";
      context.font = `${Math.max(9, size * 0.19)}px system-ui,sans-serif`;
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
      elements.machine.innerHTML = `<strong>Preview \xB7 ${escapeHtml(intentName(machine.intent))}</strong><span>${escapeHtml(pretty(machine.basis))} \xB7 novelty ${machine.score}</span>`;
      elements.ai.innerHTML = `<strong>Preview \xB7 ${escapeHtml(intentName(ai.intent))}</strong><span>${escapeHtml(pretty(ai.basis))} \xB7 deterministic stand-in</span>`;
      return;
    }
    const humanEvent = world.state.evidence.events.find((event) => event.eventId === receipt.humanEventId);
    const machineEvent = world.state.evidence.events.find((event) => event.eventId === receipt.machineDecision.eventId);
    elements.human.innerHTML = `<strong>${escapeHtml(intentName(receipt.humanIntent))}</strong><span>${escapeHtml(humanEvent?.observerOutcome || "movement")}; directly selected by the human seat</span>`;
    elements.machine.innerHTML = `<strong>${escapeHtml(intentName(receipt.machineDecision.intent))}</strong><span>${escapeHtml(pretty(receipt.machineDecision.basis))} \xB7 novelty ${receipt.machineDecision.noveltyPressure} \xB7 ${escapeHtml(machineEvent?.observerOutcome || "movement")}</span>`;
    const refused = receipt.aiDecision.status === "REFUSED";
    elements.ai.innerHTML = `<strong class="${refused ? "refused" : ""}">${escapeHtml(receipt.aiDecision.status)} \xB7 ${escapeHtml(intentName(receipt.aiDecision.intent || receipt.aiDecision.proposal))}</strong><span>${escapeHtml(pretty(receipt.aiDecision.source))} \xB7 ${escapeHtml(pretty(receipt.aiDecision.reason))} \xB7 local referee</span>`;
  }
  function renderThreads() {
    const threads = world.state.derived.threads;
    elements.threadCount.textContent = `${threads.length} thread${threads.length === 1 ? "" : "s"}`;
    elements.threads.innerHTML = threads.length ? threads.map((thread) => `<article class="thread-card">
    <strong>${escapeHtml(pretty(thread.kind))}</strong><span>${escapeHtml(thread.basis)}</span>
    <em>${escapeHtml(thread.cell)} \xB7 ${thread.evidence.length} event id${thread.evidence.length === 1 ? "" : "s"}</em></article>`).join("") : '<p class="empty">No role intersection has been earned.</p>';
  }
  function metric(value, label, tone = "") {
    return `<div class="outcome-card ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }
  function renderMetrics() {
    const stats = world.stats();
    elements.metrics.innerHTML = [
      [stats.cycles, "coexistence cycles"],
      [stats.events, "committed events"],
      [stats.changedCells, "changed cells"],
      [format(stats.sleepingCells), "sleeping cells"]
    ].map(([value, label]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
    elements.outcomes.innerHTML = [
      metric(stats.growthEvents, "growth events", "growth"),
      metric(stats.damageEvents, "damage events", "damage"),
      metric(stats.changeEvents, "phase changes"),
      metric(stats.movementEvents, "movements"),
      metric(stats.healthDelta > 0 ? `+${stats.healthDelta}` : stats.healthDelta, "health drift", "drift"),
      metric(stats.threeWayMarks, "three-role marks")
    ].join("");
  }
  function renderLedger() {
    const receipts = world.receipts;
    elements.receiptCount.textContent = `${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`;
    elements.ledger.innerHTML = receipts.length ? receipts.slice(-12).reverse().map((receipt) => {
      if (receipt.status === "REFUSED") return `<article class="cycle-card"><header><strong>REFUSED</strong><span>#${receipt.sequence}</span></header><p class="refused">${escapeHtml(pretty(receipt.reason))}</p><p>No seat changed canonical state.</p></article>`;
      return `<article class="cycle-card"><header><strong>Cycle ${receipt.afterRevision}</strong><span>${escapeHtml(receipt.afterDigest.slice(0, 9))}</span></header>
      <p><b>H</b> ${escapeHtml(intentName(receipt.humanIntent))}</p><p><b>M</b> ${escapeHtml(intentName(receipt.machineDecision.intent))}</p>
      <p><b>AI</b> ${escapeHtml(receipt.aiDecision.status)} \xB7 ${escapeHtml(intentName(receipt.aiDecision.intent || receipt.aiDecision.proposal))}</p>
      <p>${receipt.eventIds.length} events \xB7 ${receipt.threadIds.length} threads</p></article>`;
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
    elements.cycle.textContent = stats.cycles ? `Cycle ${stats.cycles} \xB7 ${stats.events} seat events committed` : "Genesis \xB7 authored shared start";
    elements.claim.textContent = deriveClaim();
    drawField();
    renderSeats();
    renderThreads();
    renderMetrics();
    renderLedger();
    if (message) {
      elements.system.textContent = message;
      elements.system.style.color = tone === "PASS" ? "var(--machine)" : tone === "HOLD" ? "var(--red)" : "var(--muted)";
    }
  }
  function setRunning(value) {
    running = value;
    elements.controls.forEach((control) => {
      control.disabled = value;
    });
  }
  function commit(humanIntent, aiProposal) {
    if (running) return null;
    const options = { expectedRevision: world.state.meta.revision };
    if (aiProposal !== void 0) options.aiProposal = aiProposal;
    const receipt = world.cycle(humanIntent, options);
    const aiCopy = receipt.aiDecision.status === "REFUSED" ? ` AI proposal refused: ${receipt.aiDecision.reason}; no fallback.` : ` AI seat ${receipt.aiDecision.source === "DETERMINISTIC_STAND_IN" ? "stand-in" : "proposal"} accepted.`;
    render(`CYCLE ${receipt.afterRevision} \xB7 ${receipt.eventIds.length} events.${aiCopy}`, receipt.aiDecision.status === "REFUSED" ? "HOLD" : "PASS");
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
      if (index % 3 === 2) {
        render(`Probe running \xB7 ${index + 1} / 12`);
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
    }
    setRunning(false);
    render(`PROBE COMPLETE \xB7 ${world.stats().events} events \xB7 ${world.stats().threads} evidence-backed threads.`, "PASS");
  });
  $("#proposalButton").addEventListener("click", () => {
    try {
      commit({ kind: "wait" }, JSON.parse(elements.proposal.value));
    } catch (error) {
      render(`PROPOSAL JSON REFUSED BEFORE CYCLE \xB7 ${error.message}`, "HOLD");
    }
  });
  $("#replayButton").addEventListener("click", () => {
    const result = world.verifyReplay();
    render(result.status === "PASS" ? `REPLAY PASS \xB7 ${result.cyclesReplayed} cycles reconstructed ${result.actual.slice(0, 12)}.` : `REPLAY HOLD \xB7 divergence at receipt ${result.at}.`, result.status);
  });
  $("#resetButton").addEventListener("click", () => {
    world = new CoexistenceWorld({ seed: elements.seed.value.trim() || "AXM-COEXIST-001" });
    render("RESET \xB7 exact authored genesis restored; no thread carried across.");
  });
  window.addEventListener("resize", drawField);
  window.AXM_COEXISTENCE = { get world() {
    return world;
  }, coexistenceContracts };
  render("Ready. No model is connected; the AI seat uses a deterministic stand-in.");
})();
