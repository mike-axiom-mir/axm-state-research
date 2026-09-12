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
  var DIRECTIONS = [
    { id: "north", dx: 0, dy: -1 },
    { id: "east", dx: 1, dy: 0 },
    { id: "south", dx: 0, dy: 1 },
    { id: "west", dx: -1, dy: 0 }
  ];
  var BASE_VITALITY = 3;
  var FIELD_VERSION = "axm.stateborn.curiosity-field/v1";
  var POLICY_VERSION = "axm.stateborn.curiosity-policy/v1";
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
  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }
  function circularDistance(left, right, size) {
    const direct = Math.abs(left - right);
    return Math.min(direct, size - direct);
  }
  function observationSignature(cell) {
    return `${cell.terrain}:${cell.phase}`;
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
  function actorTemplate(id, name, x, y, index) {
    return {
      id,
      name,
      position: { x, y },
      movesSinceTouch: index % 2,
      memory: {
        seen: {},
        trials: {},
        recent: []
      }
    };
  }
  function createGenesis(options, field) {
    const center = { x: Math.floor(options.width / 2), y: Math.floor(options.height / 2) };
    const offsets = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]];
    const names = ["Mote", "Rill", "Vey", "Luma", "Kite", "Nim"];
    const actors = {};
    for (let index = 0; index < offsets.length; index += 1) {
      const [dx, dy] = offsets[index];
      const id = `curious_${String(index + 1).padStart(2, "0")}`;
      actors[id] = actorTemplate(id, names[index], center.x + dx, center.y + dy, index);
    }
    return {
      schema: "axm.stateborn.curiosity-world/v1",
      seed: options.seed,
      meta: { revision: 0, step: 0, policy: POLICY_VERSION, claim: "EXPERIMENTAL" },
      world: {
        width: options.width,
        height: options.height,
        chunkSize: options.chunkSize,
        baseCommitment: field.baseCommitment,
        overrides: {}
      },
      actors,
      evidence: { events: [] },
      derived: {
        observer: {
          touchedCells: 0,
          healthDelta: 0,
          growthEvents: 0,
          damageEvents: 0,
          neutralEvents: 0,
          bloomCells: 0,
          scarCells: 0,
          echoCells: 0,
          uniqueActorObservations: 0
        },
        patterns: []
      }
    };
  }
  function recordCount(map, key, amount = 1) {
    map[key] = Number(map[key] || 0) + amount;
  }
  function policyView(state, field, actorId) {
    const actor = state.actors[actorId];
    const here = field.cell(state, actor.position.x, actor.position.y);
    const neighbours = DIRECTIONS.map((direction) => {
      const x = actor.position.x + direction.dx;
      const y = actor.position.y + direction.dy;
      const cell = field.cell(state, x, y);
      if (!cell) return null;
      const signature = observationSignature(cell);
      return {
        direction: direction.id,
        x,
        y,
        terrain: cell.terrain,
        phase: cell.phase,
        seenCount: Number(actor.memory.seen[signature] || 0),
        triedCount: Number(actor.memory.trials[`move:${direction.id}:${signature}`] || 0)
      };
    }).filter(Boolean);
    const currentSignature = observationSignature(here);
    return {
      schema: "axm.stateborn.curiosity-view/v1",
      actor: actor.id,
      step: state.meta.step,
      position: deepClone(actor.position),
      current: { terrain: here.terrain, phase: here.phase, signature: currentSignature },
      neighbours,
      signalTrials: Object.fromEntries(CURIOSITY_SIGNALS.map((signal) => [signal, Number(actor.memory.trials[`signal:${signal}:${currentSignature}`] || 0)])),
      currentSeenCount: Number(actor.memory.seen[currentSignature] || 0),
      movesSinceTouch: actor.movesSinceTouch
    };
  }
  function chooseFromView(view, seed) {
    const candidates = [];
    for (const neighbour of view.neighbours) {
      const novelty = neighbour.seenCount === 0 ? 100 : Math.max(4, 28 - neighbour.seenCount * 4);
      const untried = neighbour.triedCount === 0 ? 10 : 0;
      candidates.push({
        intent: { kind: "move", to: { x: neighbour.x, y: neighbour.y }, direction: neighbour.direction },
        score: novelty + untried,
        basis: neighbour.seenCount === 0 ? "unseen_neighbour" : "least_familiar_neighbour",
        key: `move:${neighbour.direction}`
      });
    }
    for (const signal of CURIOSITY_SIGNALS) {
      const trials = view.signalTrials[signal];
      const novelty = trials === 0 ? 68 : Math.max(2, 18 - trials * 4);
      const questionPressure = view.movesSinceTouch * 48;
      candidates.push({
        intent: { kind: "signal", signal },
        score: novelty + questionPressure,
        basis: trials === 0 ? "untried_signal_in_context" : "least_tried_signal_in_context",
        key: `signal:${signal}`
      });
    }
    return candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const leftTie = numberFrom(`${seed}:${view.step}:${view.actor}:${left.key}`);
      const rightTie = numberFrom(`${seed}:${view.step}:${view.actor}:${right.key}`);
      return leftTie - rightTie || left.key.localeCompare(right.key);
    })[0];
  }
  function updateObserver(state) {
    const changedCells = Object.entries(state.world.overrides);
    const observer = {
      touchedCells: changedCells.length,
      healthDelta: changedCells.reduce((sum, [, cell]) => sum + Number(cell.vitality - BASE_VITALITY), 0),
      growthEvents: state.evidence.events.filter((event) => event.observerOutcome === "growth").length,
      damageEvents: state.evidence.events.filter((event) => event.observerOutcome === "damage").length,
      neutralEvents: state.evidence.events.filter((event) => event.observerOutcome === "change").length,
      bloomCells: changedCells.filter(([, cell]) => conditionOf(cell.vitality) === "bloom").length,
      scarCells: changedCells.filter(([, cell]) => conditionOf(cell.vitality) === "scar").length,
      echoCells: 0,
      uniqueActorObservations: Object.values(state.actors).reduce((sum, actor) => sum + Object.keys(actor.memory.seen).length, 0)
    };
    const touchedBy = /* @__PURE__ */ new Map();
    for (const event of state.evidence.events.filter((event2) => event2.intent.kind === "signal")) {
      if (!touchedBy.has(event.cell)) touchedBy.set(event.cell, /* @__PURE__ */ new Set());
      touchedBy.get(event.cell).add(event.actor);
    }
    observer.echoCells = [...touchedBy.values()].filter((actors) => actors.size > 1).length;
    const patterns = [];
    if (observer.echoCells > 0) patterns.push({ id: "shared_echo", kind: "shared_echo", strength: observer.echoCells, basis: "multiple actors changed the same cell" });
    if (observer.bloomCells >= 3) patterns.push({ id: "bloom_scatter", kind: "bloom_scatter", strength: observer.bloomCells, basis: "three or more changed cells crossed the bloom threshold" });
    if (observer.scarCells >= 3) patterns.push({ id: "scar_scatter", kind: "scar_scatter", strength: observer.scarCells, basis: "three or more changed cells crossed the scar threshold" });
    if (observer.touchedCells >= 12) patterns.push({ id: "curiosity_trail", kind: "curiosity_trail", strength: observer.touchedCells, basis: "questions changed twelve or more sparse cells" });
    state.derived.observer = observer;
    state.derived.patterns = patterns;
  }
  function validateState(state, field) {
    for (const actor of Object.values(state.actors)) {
      if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
      if (actor.movesSinceTouch < 0) return `actor.movesSinceTouch:${actor.id}`;
    }
    for (const [cellId, override] of Object.entries(state.world.overrides)) {
      if (override.vitality < 0 || override.vitality > 6) return `cell.vitality:${cellId}`;
      if (override.phase < 0 || override.phase >= CURIOSITY_SIGNALS.length) return `cell.phase:${cellId}`;
    }
    return null;
  }
  var CuriosityWorld = class _CuriosityWorld {
    constructor({ seed = "AXM-CURIOSITY-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
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
    get actorIds() {
      return Object.keys(this.state.actors).sort();
    }
    policyInput(actorId = this.actorIds[this.state.meta.step % this.actorIds.length]) {
      return policyView(this.state, this.field, actorId);
    }
    previewDecision(actorId = this.actorIds[this.state.meta.step % this.actorIds.length]) {
      const view = this.policyInput(actorId);
      return { actor: actorId, view, ...chooseFromView(view, this.options.seed) };
    }
    step({ operationId, expectedRevision } = {}) {
      const actorId = this.actorIds[this.state.meta.step % this.actorIds.length];
      const resolvedOperationId = operationId || `curiosity-${this.receipts.length}`;
      if (this.operations.has(resolvedOperationId)) return { ...deepClone(this.operations.get(resolvedOperationId)), duplicate: true };
      const beforeDigest = this.stateDigest;
      const beforeRevision = this.state.meta.revision;
      if (expectedRevision !== void 0 && expectedRevision !== beforeRevision) {
        const refused = {
          schema: "axm.stateborn.curiosity-receipt/v1",
          sequence: this.receipts.length,
          operationId: resolvedOperationId,
          status: "REFUSED",
          reason: "STALE_REVISION",
          actor: actorId,
          beforeRevision,
          afterRevision: beforeRevision,
          beforeDigest,
          afterDigest: beforeDigest,
          policyView: null,
          intent: null,
          observerOutcome: null,
          changedPaths: []
        };
        refused.eventId = digest(refused);
        this.receipts.push(refused);
        this.operations.set(resolvedOperationId, refused);
        return deepClone(refused);
      }
      const decision = this.previewDecision(actorId);
      const draft = deepClone(this.state);
      const actor = draft.actors[actorId];
      const changedPaths = [];
      const hereBefore = this.field.cell(draft, actor.position.x, actor.position.y);
      recordCount(actor.memory.seen, observationSignature(hereBefore));
      changedPaths.push(`actors.${actorId}.memory.seen`);
      let observerOutcome = null;
      let consequence = null;
      if (decision.intent.kind === "move") {
        const trialKey = `move:${decision.intent.direction}:${observationSignature(this.field.cell(draft, decision.intent.to.x, decision.intent.to.y))}`;
        recordCount(actor.memory.trials, trialKey);
        actor.position = deepClone(decision.intent.to);
        actor.movesSinceTouch += 1;
        changedPaths.push(`actors.${actorId}.position`, `actors.${actorId}.movesSinceTouch`, `actors.${actorId}.memory.trials`);
      } else {
        const signalIndex = CURIOSITY_SIGNALS.indexOf(decision.intent.signal);
        const targetIndex = (this.field.affinity(hereBefore.x, hereBefore.y) + hereBefore.phase) % CURIOSITY_SIGNALS.length;
        const distance = circularDistance(signalIndex, targetIndex, CURIOSITY_SIGNALS.length);
        const vitalityDelta = distance === 0 ? 2 : distance === 2 ? -2 : 0;
        const nextVitality = clamp(hereBefore.vitality + vitalityDelta, 0, 6);
        const nextPhase = (hereBefore.phase + signalIndex + 1) % CURIOSITY_SIGNALS.length;
        const nextOverride = { vitality: nextVitality, phase: nextPhase, touches: hereBefore.touches + 1 };
        draft.world.overrides[hereBefore.id] = nextOverride;
        const trialKey = `signal:${decision.intent.signal}:${observationSignature(hereBefore)}`;
        recordCount(actor.memory.trials, trialKey);
        actor.movesSinceTouch = 0;
        observerOutcome = vitalityDelta > 0 ? "growth" : vitalityDelta < 0 ? "damage" : "change";
        consequence = { cell: hereBefore.id, vitalityDelta, phaseBefore: hereBefore.phase, phaseAfter: nextPhase };
        changedPaths.push(`world.overrides.${hereBefore.id}`, `actors.${actorId}.movesSinceTouch`, `actors.${actorId}.memory.trials`);
      }
      actor.memory.recent = [...actor.memory.recent, { step: draft.meta.step, signature: observationSignature(hereBefore), intent: decision.intent.kind }].slice(-12);
      const event = {
        index: draft.evidence.events.length,
        actor: actorId,
        cell: hereBefore.id,
        intent: deepClone(decision.intent),
        curiosityBasis: decision.basis,
        observerOutcome
      };
      draft.evidence.events.push(event);
      changedPaths.push(`actors.${actorId}.memory.recent`, "evidence.events");
      draft.meta.revision += 1;
      draft.meta.step += 1;
      changedPaths.push("meta.revision", "meta.step");
      updateObserver(draft);
      changedPaths.push("derived.observer", "derived.patterns");
      const invariantFailure = validateState(draft, this.field);
      if (invariantFailure) throw new Error(`curiosity invariant failed: ${invariantFailure}`);
      this.state = draft;
      const afterDigest = this.stateDigest;
      const receipt = {
        schema: "axm.stateborn.curiosity-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedOperationId,
        status: "APPLIED",
        reason: "OK",
        actor: actorId,
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest,
        policyView: decision.view,
        noveltyPressure: decision.score,
        curiosityBasis: decision.basis,
        intent: deepClone(decision.intent),
        observerOutcome,
        consequence,
        changedPaths: [...new Set(changedPaths)]
      };
      receipt.eventId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedOperationId, receipt);
      return deepClone(receipt);
    }
    run(steps) {
      const results = [];
      for (let index = 0; index < steps; index += 1) {
        results.push(this.step({ operationId: `run-${this.receipts.length}`, expectedRevision: this.state.meta.revision }));
      }
      return results;
    }
    visibleCells(radius = 8) {
      const center = { x: Math.floor(this.options.width / 2), y: Math.floor(this.options.height / 2) };
      const cells = [];
      for (let y = center.y - radius; y <= center.y + radius; y += 1) {
        for (let x = center.x - radius; x <= center.x + radius; x += 1) {
          const cell = this.field.cell(this.state, x, y);
          if (cell) cells.push(cell);
        }
      }
      return cells;
    }
    verifyReplay() {
      const replay = new _CuriosityWorld(this.options);
      for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
        const result = replay.step({ operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
        if (result.afterDigest !== receipt.afterDigest || canonicalStringify(result.intent) !== canonicalStringify(receipt.intent)) {
          return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
        }
      }
      return {
        status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
        stepsReplayed: replay.state.meta.step,
        expected: this.stateDigest,
        actual: replay.stateDigest
      };
    }
    stats() {
      return {
        logicalNodes: this.options.width * this.options.height + this.actorIds.length,
        actors: this.actorIds.length,
        ...this.field.stats(this.state),
        ...deepClone(this.state.derived.observer)
      };
    }
  };
  var curiosityPolicyContract = {
    version: POLICY_VERSION,
    visible: ["terrain", "phase", "unexplored-neighbour count", "context/action trial counts", "recent observation signatures"],
    forbidden: ["reward", "score of success", "damage", "vitality", "bloom", "scar", "observer summary"],
    selection: "highest deterministic novelty pressure; no outcome reward"
  };

  // dist/curiosity-app.js
  var $ = (selector) => document.querySelector(selector);
  var elements = {
    canvas: $("#gardenCanvas"),
    claim: $("#claimText"),
    digest: $("#digestBadge"),
    stepHeading: $("#stepHeading"),
    seed: $("#seedInput"),
    worldMetrics: $("#worldMetrics"),
    outcomeMetrics: $("#outcomeMetrics"),
    patterns: $("#patterns"),
    machineView: $("#machineView"),
    ledger: $("#ledger"),
    receiptCount: $("#receiptCount"),
    system: $("#systemMessage"),
    controls: [...document.querySelectorAll(".control")]
  };
  var world = new CuriosityWorld({ seed: elements.seed.value });
  var running = false;
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
      y: Math.round(actors.reduce((sum, actor) => sum + actor.position.y, 0) / actors.length)
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
          context.fillStyle = `rgba(${conditionColor},${Math.min(0.2 + cell.touches * 0.08, 0.62)})`;
          context.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
          context.strokeStyle = `rgba(${conditionColor},.82)`;
          context.beginPath();
          context.arc(px + cellSize / 2, py + cellSize / 2, Math.min(cellSize * 0.24, 8 + cell.touches), 0, Math.PI * 2);
          context.stroke();
        }
        context.fillStyle = "rgba(210,230,240,.28)";
        context.font = `${Math.max(9, cellSize * 0.22)}px ui-monospace, monospace`;
        context.fillText(String(cell.phase), px + 5, py + cellSize - 5);
      }
    }
    const actorColors = ["#79f4e8", "#bb8cff", "#69aaff", "#ffc66d", "#76f7aa", "#ff8bd7"];
    Object.values(world.state.actors).forEach((actor, index) => {
      const column = actor.position.x - startX;
      const row = actor.position.y - startY;
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      const cx = offsetX + (column + 0.5) * cellSize;
      const cy = offsetY + (row + 0.5) * cellSize;
      context.save();
      context.shadowColor = actorColors[index];
      context.shadowBlur = 14;
      context.fillStyle = actorColors[index];
      context.beginPath();
      context.arc(cx, cy, Math.max(4, cellSize * 0.13), 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = "rgba(235,248,255,.8)";
      context.font = `${Math.max(10, cellSize * 0.24)}px system-ui, sans-serif`;
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
      [number(stats.sleepingCells), "sleeping"]
    ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
    elements.outcomeMetrics.innerHTML = [
      metric(stats.growthEvents, "growth events", "growth"),
      metric(stats.damageEvents, "damage events", "damage"),
      metric(stats.bloomCells, "bloom cells", "growth"),
      metric(stats.scarCells, "scar cells", "damage"),
      metric(stats.echoCells, "shared echoes"),
      metric(stats.healthDelta > 0 ? `+${stats.healthDelta}` : stats.healthDelta, "world health drift", "drift")
    ].join("");
    elements.patterns.innerHTML = world.state.derived.patterns.length ? world.state.derived.patterns.map((pattern) => `<div class="pattern"><strong>${escapeHtml(pattern.kind.replaceAll("_", " "))} \xB7 ${pattern.strength}</strong><span>${escapeHtml(pattern.basis)}</span></div>`).join("") : '<p class="empty">No observer pattern has crossed a threshold. Failure or quiet is a valid result.</p>';
  }
  function renderMachineView() {
    const last = world.receipts.filter((receipt) => receipt.status === "APPLIED").at(-1);
    if (!last) {
      const next = world.previewDecision();
      elements.machineView.innerHTML = `<div class="decision"><strong>Next curiosity: ${escapeHtml(next.intent.kind)}</strong><span>${escapeHtml(next.basis.replaceAll("_", " "))} \xB7 novelty pressure ${next.score}</span></div><p class="empty">No consequence has been produced. The preview contains no observer outcome.</p>`;
      return;
    }
    const view = last.policyView;
    const intent = last.intent.kind === "signal" ? `${last.intent.kind} \xB7 ${last.intent.signal}` : `${last.intent.kind} \xB7 ${last.intent.direction}`;
    elements.machineView.innerHTML = `
    <div class="decision"><strong>${escapeHtml(world.state.actors[last.actor].name)} chose ${escapeHtml(intent)}</strong><span>${escapeHtml(last.curiosityBasis.replaceAll("_", " "))} \xB7 novelty pressure ${last.noveltyPressure}</span></div>
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
    elements.ledger.innerHTML = receipts.length ? receipts.slice(-12).reverse().map((receipt) => {
      const actor = world.state.actors[receipt.actor].name;
      const action = receipt.intent.kind === "signal" ? `${receipt.intent.kind} ${receipt.intent.signal}` : `${receipt.intent.kind} ${receipt.intent.direction}`;
      const outcome = receipt.observerOutcome || "movement";
      const outcomeCopy = receipt.observerOutcome ? `game saw ${outcome}` : "no outcome label produced";
      return `<article class="receipt"><div class="receipt-head"><strong>${escapeHtml(actor)} \xB7 ${escapeHtml(action)}</strong><em>#${receipt.sequence}</em></div><p>${escapeHtml(receipt.curiosityBasis.replaceAll("_", " "))}<br><span class="${escapeHtml(receipt.observerOutcome || "change")}">${escapeHtml(outcomeCopy)}</span></p></article>`;
    }).join("") : '<p class="empty">The ledger is empty. Genesis contains no invented result.</p>';
  }
  function deriveClaim() {
    const stats = world.stats();
    if (stats.growthEvents > 0 && stats.damageEvents > 0 && stats.echoCells > 0) return `Observed: curiosity produced growth, damage, and ${stats.echoCells} shared echo${stats.echoCells === 1 ? "" : "es"} without an outcome reward.`;
    if (stats.changedCells > 0) return "Observed: curiosity is leaving sparse world changes. A stable emergent ecology is not yet proven.";
    return "Six actors choose unfamiliar states and untried signals. Growth and damage exist only in the observer layer.";
  }
  function render(message, tone = "") {
    elements.digest.textContent = `digest ${world.stateDigest.slice(0, 12)}`;
    elements.stepHeading.textContent = world.state.meta.step ? `Step ${world.state.meta.step} \xB7 ${world.state.derived.patterns.length} patterns visible` : "Genesis \xB7 no questions asked";
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
    elements.controls.forEach((control) => {
      control.disabled = value;
    });
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
        render(`Curiosity loop running \xB7 ${index + 1} / ${count}`);
        await new Promise((resolve) => setTimeout(resolve, 28));
      }
    }
    setRunning(false);
    const stats = world.stats();
    render(`LOOP COMPLETE \xB7 ${count} questions \xB7 ${stats.changedCells} cells changed \xB7 ${stats.growthEvents} growth / ${stats.damageEvents} damage.`, "PASS");
  }
  $("#stepButton").addEventListener("click", stepOnce);
  $("#run16Button").addEventListener("click", () => loop(16));
  $("#run64Button").addEventListener("click", () => loop(64));
  $("#replayButton").addEventListener("click", () => {
    const result = world.verifyReplay();
    render(result.status === "PASS" ? `REPLAY PASS \xB7 ${result.stepsReplayed} choices reconstructed ${result.actual.slice(0, 12)}.` : `REPLAY HOLD \xB7 divergence at receipt ${result.at}.`, result.status);
  });
  $("#resetButton").addEventListener("click", () => {
    world = new CuriosityWorld({ seed: elements.seed.value.trim() || "AXM-CURIOSITY-001" });
    render("RESET \xB7 exact genesis restored; no result carried across.");
  });
  window.addEventListener("resize", drawGarden);
  window.AXM_CURIOSITY = { get world() {
    return world;
  }, curiosityPolicyContract, CURIOSITY_SIGNALS };
  render("Ready. The actors have no success target.");
})();
