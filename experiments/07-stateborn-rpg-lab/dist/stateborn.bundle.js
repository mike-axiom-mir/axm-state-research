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
  function getPath(root, path) {
    if (!path) return root;
    return path.split(".").reduce((value, key) => value?.[key], root);
  }

  // dist/living-world.js
  var MATERIALS = ["food", "water", "fiber", "stone"];
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
  var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  var manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  function inventoryMass(inventory) {
    return MATERIALS.reduce((sum, material) => sum + (inventory[material] || 0), 0);
  }
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
  function incrementPath(root, path, amount, changed) {
    return setPath(root, path, Number(getPath(root, path) || 0) + amount, changed);
  }
  function normalizeIntent(intent) {
    return { actor: "player", ...deepClone(intent) };
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
  function actorTemplate(id, name, x, y, overrides = {}) {
    return {
      id,
      kind: "actor",
      name,
      position: { x, y },
      energy: 12,
      maxEnergy: 12,
      inventory: { food: 0, water: 0, fiber: 0, stone: 0 },
      capacity: 8,
      needs: { food: 0, water: 0, safety: 0 },
      disposition: { cooperation: 1, curiosity: 1 },
      memory: [],
      ...deepClone(overrides)
    };
  }
  function initialState(seed, width, height, field) {
    const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    const base = field.baseCell(center.x, center.y);
    return {
      schema: "axm.stateborn.living-world/v2",
      seed,
      meta: { revision: 0, turn: 0, claim: "EXPERIMENTAL" },
      world: {
        generator: GENERATOR_VERSION,
        width,
        height,
        chunkSize: field.chunkSize,
        baseCommitment: field.baseCommitment,
        overrides: {
          [keyOf(center.x, center.y)]: {
            resources: { ...deepClone(base.resources), food: Math.max(2, base.resources.food), fiber: Math.max(3, base.resources.fiber) }
          }
        }
      },
      actors: {
        player: actorTemplate("player", "The witness", center.x, center.y, {
          inventory: { food: 2, water: 0, fiber: 0, stone: 0 },
          needs: { food: 1, water: 5, safety: 1 },
          disposition: { cooperation: 0, curiosity: 0 }
        }),
        rhea: actorTemplate("rhea", "Rhea", center.x + 1, center.y, {
          inventory: { food: 0, water: 2, fiber: 0, stone: 0 },
          needs: { food: 8, water: 1, safety: 2 },
          disposition: { cooperation: 2, curiosity: 1 }
        }),
        orr: actorTemplate("orr", "Orr", center.x - 3, center.y + 2, {
          needs: { food: 2, water: 2, safety: 3 },
          disposition: { cooperation: 1, curiosity: 2 }
        })
      },
      relations: {},
      signals: { requests: {} },
      evidence: {
        behaviors: {
          player: {},
          rhea: {},
          orr: {}
        },
        events: []
      },
      derived: {
        identityPatterns: {
          player: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
          rhea: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" },
          orr: { label: "Unformed", strength: 0, basis: "No repeated behavior yet" }
        },
        situations: []
      }
    };
  }
  var identityLabels = {
    gather: "Forager-shaped",
    move: "Pathfinder-shaped",
    share: "Keeper-shaped",
    build: "Maker-shaped",
    request: "Signal-seeker-shaped",
    consume: "Survivor-shaped",
    wait: "Witness-shaped"
  };
  function relationStrength(state, from, to) {
    return state.relations[`bond_${from}_${to}`]?.strength || 0;
  }
  function validateIntent(state, field, rawIntent) {
    const intent = normalizeIntent(rawIntent);
    const actor = state.actors[intent.actor];
    if (!actor) return "UNKNOWN_ACTOR";
    if (!["move", "gather", "share", "consume", "request", "build", "rest", "wait", "test_breach"].includes(intent.kind)) return "UNKNOWN_INTENT";
    if (intent.kind === "move") {
      if (!field.contains(intent.to?.x, intent.to?.y)) return "TARGET_OUT_OF_WORLD";
      if (manhattan(actor.position, intent.to) !== 1) return "TARGET_NOT_ADJACENT";
      if (actor.energy < 1) return "INSUFFICIENT_ENERGY";
    }
    if (intent.kind === "gather") {
      if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
      if ((field.cell(state, actor.position.x, actor.position.y).resources[intent.resource] || 0) < 1) return "MATERIAL_ABSENT";
      if (inventoryMass(actor.inventory) >= actor.capacity) return "INVENTORY_FULL";
      if (actor.energy < 1) return "INSUFFICIENT_ENERGY";
    }
    if (intent.kind === "share") {
      const target = state.actors[intent.target];
      if (!target || target.id === actor.id) return "TARGET_ACTOR_REQUIRED";
      if (manhattan(actor.position, target.position) > 1) return "TARGET_TOO_FAR";
      if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
      if ((actor.inventory[intent.resource] || 0) < 1) return "MATERIAL_NOT_HELD";
      if ((target.needs[intent.resource] || 0) < 1) return "TARGET_HAS_NO_MATCHING_NEED";
    }
    if (intent.kind === "consume") {
      if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
      if ((actor.inventory[intent.resource] || 0) < 1) return "MATERIAL_NOT_HELD";
      if ((actor.needs[intent.resource] || 0) < 1) return "NO_MATCHING_NEED";
    }
    if (intent.kind === "request") {
      if (!MATERIALS.includes(intent.resource)) return "MATERIAL_REQUIRED";
      if ((actor.needs[intent.resource] || 0) < 3) return "PRESSURE_TOO_LOW";
    }
    if (intent.kind === "build") {
      if (intent.structure !== "shelter") return "UNKNOWN_STRUCTURE";
      if (actor.inventory.fiber < 3) return "THREE_FIBER_REQUIRED";
      if (actor.energy < 2) return "INSUFFICIENT_ENERGY";
      if (field.cell(state, actor.position.x, actor.position.y).shelter > 0) return "SHELTER_ALREADY_PRESENT";
    }
    if (intent.kind === "rest") {
      if (field.cell(state, actor.position.x, actor.position.y).shelter < 1) return "NO_SHELTER_HERE";
      if (actor.energy >= actor.maxEnergy) return "ENERGY_ALREADY_FULL";
    }
    return null;
  }
  function appendEvent(state, event, changed) {
    const index = state.evidence.events.length;
    const stored = { index, ...deepClone(event) };
    setPath(state, "evidence.events", [...state.evidence.events, stored], changed);
    incrementPath(state, `evidence.behaviors.${event.actor}.${event.kind}`, 1, changed);
    return stored;
  }
  function applyIntent(state, field, rawIntent, changed) {
    const intent = normalizeIntent(rawIntent);
    const actor = state.actors[intent.actor];
    const event = { actor: intent.actor, kind: intent.kind };
    if (intent.kind === "move") {
      setPath(state, `actors.${actor.id}.position`, intent.to, changed);
      incrementPath(state, `actors.${actor.id}.energy`, -1, changed);
      Object.assign(event, { to: deepClone(intent.to) });
    } else if (intent.kind === "gather") {
      const cell = field.cell(state, actor.position.x, actor.position.y);
      setPath(state, `world.overrides.${keyOf(actor.position.x, actor.position.y)}.resources.${intent.resource}`, cell.resources[intent.resource] - 1, changed);
      incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, 1, changed);
      incrementPath(state, `actors.${actor.id}.energy`, -1, changed);
      Object.assign(event, { resource: intent.resource, at: deepClone(actor.position) });
    } else if (intent.kind === "share") {
      const target = state.actors[intent.target];
      incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, -1, changed);
      setPath(state, `actors.${target.id}.needs.${intent.resource}`, Math.max(0, target.needs[intent.resource] - 3), changed);
      const relationId = `bond_${target.id}_${actor.id}`;
      const strength = relationStrength(state, target.id, actor.id) + 1;
      setPath(state, `relations.${relationId}`, { id: relationId, kind: "trust", from: target.id, to: actor.id, strength }, changed);
      setPath(state, `actors.${target.id}.memory`, [...target.memory, { kind: "received", from: actor.id, resource: intent.resource, turn: state.meta.turn + 1 }], changed);
      if (state.signals.requests[target.id]?.resource === intent.resource) {
        setPath(state, `signals.requests.${target.id}.active`, false, changed);
      }
      Object.assign(event, { target: target.id, resource: intent.resource });
    } else if (intent.kind === "consume") {
      incrementPath(state, `actors.${actor.id}.inventory.${intent.resource}`, -1, changed);
      setPath(state, `actors.${actor.id}.needs.${intent.resource}`, Math.max(0, actor.needs[intent.resource] - 4), changed);
      Object.assign(event, { resource: intent.resource });
    } else if (intent.kind === "request") {
      setPath(state, `signals.requests.${actor.id}`, { actor: actor.id, resource: intent.resource, active: true, openedTurn: state.meta.turn + 1 }, changed);
      Object.assign(event, { resource: intent.resource });
    } else if (intent.kind === "build") {
      const cell = field.cell(state, actor.position.x, actor.position.y);
      incrementPath(state, `actors.${actor.id}.inventory.fiber`, -3, changed);
      incrementPath(state, `actors.${actor.id}.energy`, -2, changed);
      setPath(state, `world.overrides.${keyOf(actor.position.x, actor.position.y)}.shelter`, cell.shelter + 1, changed);
      Object.assign(event, { structure: "shelter", at: deepClone(actor.position) });
    } else if (intent.kind === "rest") {
      setPath(state, `actors.${actor.id}.energy`, Math.min(actor.maxEnergy, actor.energy + 5), changed);
    } else if (intent.kind === "test_breach") {
      setPath(state, `actors.${actor.id}.energy`, -999, changed);
    }
    return appendEvent(state, event, changed);
  }
  function nearestMaterialStep(state, field, actor, resource, radius = 4) {
    let best = null;
    for (let dy2 = -radius; dy2 <= radius; dy2 += 1) {
      for (let dx2 = -radius; dx2 <= radius; dx2 += 1) {
        const x = actor.position.x + dx2;
        const y = actor.position.y + dy2;
        const distance = Math.abs(dx2) + Math.abs(dy2);
        if (distance === 0 || distance > radius || !field.contains(x, y)) continue;
        const amount = field.cell(state, x, y).resources[resource] || 0;
        if (amount < 1) continue;
        const candidate = { x, y, distance, amount };
        if (!best || candidate.distance < best.distance || candidate.distance === best.distance && candidate.amount > best.amount || candidate.distance === best.distance && candidate.amount === best.amount && `${x}_${y}` < `${best.x}_${best.y}`) best = candidate;
      }
    }
    if (!best) return null;
    const dx = best.x - actor.position.x;
    const dy = best.y - actor.position.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return { x: actor.position.x + Math.sign(dx), y: actor.position.y };
    return { x: actor.position.x, y: actor.position.y + Math.sign(dy) };
  }
  function decideActor(state, field, actorId) {
    const actor = state.actors[actorId];
    const others = Object.values(state.actors).filter((other) => other.id !== actor.id).sort((a, b) => a.id.localeCompare(b.id));
    const visibleRequests = Object.values(state.signals.requests).filter((request) => request.active && request.actor !== actor.id).map((request) => ({ request, requester: state.actors[request.actor] })).filter(({ requester }) => requester && manhattan(actor.position, requester.position) <= 1).sort((a, b) => a.request.actor.localeCompare(b.request.actor));
    for (const { request, requester } of visibleRequests) {
      const connected = relationStrength(state, actor.id, requester.id) >= 1 || actor.disposition.cooperation >= 3;
      if (connected && actor.inventory[request.resource] > 0 && requester.needs[request.resource] > 0) {
        return { actor: actor.id, kind: "share", target: requester.id, resource: request.resource, cause: "visible_request" };
      }
    }
    const materialNeed = MATERIALS.map((resource) => ({ resource, pressure: actor.needs[resource] || 0 })).sort((a, b) => b.pressure - a.pressure || a.resource.localeCompare(b.resource))[0];
    if (materialNeed.pressure >= 7) {
      if (actor.inventory[materialNeed.resource] > 0) return { actor: actor.id, kind: "consume", resource: materialNeed.resource, cause: "critical_need" };
      const holder = others.find((other) => manhattan(actor.position, other.position) <= 2 && other.inventory[materialNeed.resource] > 0);
      if (holder) return { actor: actor.id, kind: "request", resource: materialNeed.resource, cause: `observed_holder:${holder.id}` };
      const here2 = field.cell(state, actor.position.x, actor.position.y);
      if (here2.resources[materialNeed.resource] > 0) return { actor: actor.id, kind: "gather", resource: materialNeed.resource, cause: "local_material" };
      const step = nearestMaterialStep(state, field, actor, materialNeed.resource);
      if (step && actor.energy > 0) return { actor: actor.id, kind: "move", to: step, cause: `seek:${materialNeed.resource}` };
    }
    for (const other of others) {
      if (manhattan(actor.position, other.position) > 1) continue;
      for (const resource of MATERIALS) {
        const connected = relationStrength(state, actor.id, other.id) >= 1 || actor.disposition.cooperation >= 3;
        if (connected && actor.inventory[resource] > 0 && other.needs[resource] >= 5) {
          return { actor: actor.id, kind: "share", target: other.id, resource, cause: "remembered_relation" };
        }
      }
    }
    const here = field.cell(state, actor.position.x, actor.position.y);
    if (actor.energy <= 4 && here.shelter > 0) return { actor: actor.id, kind: "rest", cause: "low_energy" };
    return null;
  }
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
  function topSegment(path) {
    return path.split(".")[0];
  }
  function buildRuleIndex(ruleNodes) {
    const index = /* @__PURE__ */ new Map();
    for (const rule of ruleNodes) {
      for (const subscription of rule.subscribes) {
        const key = topSegment(subscription);
        if (!index.has(key)) index.set(key, /* @__PURE__ */ new Set());
        index.get(key).add(rule);
      }
    }
    return index;
  }
  function runIndexedRules(state, initialChanges, ruleIndex) {
    const candidates = /* @__PURE__ */ new Set();
    for (const path of initialChanges) {
      for (const rule of ruleIndex.get(topSegment(path)) || []) candidates.add(rule);
    }
    const woken = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
    const fired = [];
    const changed = [];
    for (const rule of woken) {
      const before = changed.length;
      rule.run(state, changed);
      if (changed.length > before) fired.push(rule.id);
    }
    return { woken: woken.map((rule) => rule.id), fired, changed };
  }
  function checkInvariants(state, field) {
    for (const actor of Object.values(state.actors)) {
      if (actor.energy < 0 || actor.energy > actor.maxEnergy) return `actor.energy:${actor.id}`;
      if (!field.contains(actor.position.x, actor.position.y)) return `actor.position:${actor.id}`;
      if (inventoryMass(actor.inventory) > actor.capacity) return `actor.capacity:${actor.id}`;
      if (MATERIALS.some((material) => actor.inventory[material] < 0)) return `actor.inventory:${actor.id}`;
      if (Object.values(actor.needs).some((pressure) => pressure < 0 || pressure > 10)) return `actor.needs:${actor.id}`;
    }
    for (const [key, override] of Object.entries(state.world.overrides)) {
      if (override.resources && Object.values(override.resources).some((amount) => amount < 0)) return `world.resource:${key}`;
    }
    return null;
  }
  var LivingWorld = class _LivingWorld {
    constructor({ seed = "AXM-STATEBORN-LIVING-001", width = 1024, height = 1024, chunkSize = 32 } = {}) {
      this.options = { seed, width, height, chunkSize };
      this.field = new DeterministicField(this.options);
      this.ruleIndex = buildRuleIndex(rules);
      this.genesis = initialState(seed, width, height, this.field);
      this.state = deepClone(this.genesis);
      this.receipts = [];
      this.operations = /* @__PURE__ */ new Map();
      this.lastTrace = { woken: [], fired: [], changed: [] };
    }
    get logicalNodeCount() {
      return this.options.width * this.options.height + Object.keys(this.state.actors).length;
    }
    get stateDigest() {
      return digest({ baseCommitment: this.field.baseCommitment, mutableState: this.state });
    }
    #receipt({ status, reason, playerIntent, operationId, beforeDigest, afterDigest, beforeRevision, afterRevision, actorEvents = [], trace = { woken: [], fired: [], changed: [] }, autonomy = [] }) {
      const body = {
        schema: "axm.stateborn.living-receipt/v2",
        sequence: this.receipts.length,
        operationId,
        status,
        reason,
        playerIntent: deepClone(playerIntent),
        beforeDigest,
        afterDigest,
        beforeRevision,
        afterRevision,
        actorEvents: deepClone(actorEvents),
        autonomy: deepClone(autonomy),
        wokenNodes: trace.woken,
        firedNodes: trace.fired,
        changedPaths: [...new Set(trace.changed)],
        logicalNodeCount: this.logicalNodeCount
      };
      return { ...body, eventId: digest(body) };
    }
    #storeReceipt(receipt) {
      this.receipts.push(receipt);
      this.operations.set(receipt.operationId, receipt);
      return deepClone(receipt);
    }
    advance(rawPlayerIntent, options = {}) {
      const playerIntent = normalizeIntent(rawPlayerIntent);
      const operationId = options.operationId || `turn-${this.receipts.length}-${playerIntent.kind}`;
      if (this.operations.has(operationId)) return { ...deepClone(this.operations.get(operationId)), duplicate: true };
      const beforeDigest = this.stateDigest;
      const beforeRevision = this.state.meta.revision;
      const refusal = (reason) => this.#storeReceipt(this.#receipt({
        status: "REFUSED",
        reason,
        playerIntent,
        operationId,
        beforeDigest,
        afterDigest: beforeDigest,
        beforeRevision,
        afterRevision: beforeRevision
      }));
      if (options.expectedRevision !== void 0 && options.expectedRevision !== beforeRevision) return refusal("STALE_REVISION");
      const invalid = validateIntent(this.state, this.field, playerIntent);
      if (invalid) return refusal(invalid);
      const draft = deepClone(this.state);
      const changed = [];
      const actorEvents = [];
      actorEvents.push(applyIntent(draft, this.field, playerIntent, changed));
      const autonomy = [];
      const autonomyWoken = [];
      const autonomyFired = [];
      for (const actorId of Object.keys(draft.actors).filter((id) => id !== "player").sort()) {
        autonomyWoken.push(`autonomy.perceive.${actorId}`);
        const intent = decideActor(draft, this.field, actorId);
        autonomy.push({ actor: actorId, intent: intent ? deepClone(intent) : null });
        if (!intent) continue;
        const actorInvalid = validateIntent(draft, this.field, intent);
        if (actorInvalid) {
          autonomy[autonomy.length - 1].refused = actorInvalid;
          continue;
        }
        actorEvents.push(applyIntent(draft, this.field, intent, changed));
        autonomyFired.push(`autonomy.perceive.${actorId}`);
      }
      const nextTurn = draft.meta.turn + 1;
      if (nextTurn % 2 === 0) {
        for (const actor of Object.values(draft.actors)) setPath(draft, `actors.${actor.id}.needs.food`, clamp(actor.needs.food + 1, 0, 10), changed);
      }
      if (nextTurn % 3 === 0) {
        for (const actor of Object.values(draft.actors)) setPath(draft, `actors.${actor.id}.needs.water`, clamp(actor.needs.water + 1, 0, 10), changed);
      }
      const ruleTrace = runIndexedRules(draft, changed, this.ruleIndex);
      const trace = {
        woken: [...autonomyWoken, ...ruleTrace.woken],
        fired: [...autonomyFired, ...ruleTrace.fired],
        changed: [...changed, ...ruleTrace.changed, "meta.revision", "meta.turn"]
      };
      const invariantFailure = checkInvariants(draft, this.field);
      if (invariantFailure) {
        return this.#storeReceipt(this.#receipt({
          status: "REFUSED",
          reason: `ATOMIC_ROLLBACK:${invariantFailure}`,
          playerIntent,
          operationId,
          beforeDigest,
          afterDigest: beforeDigest,
          beforeRevision,
          afterRevision: beforeRevision,
          actorEvents,
          trace,
          autonomy
        }));
      }
      draft.meta.revision += 1;
      draft.meta.turn += 1;
      this.state = draft;
      const afterDigest = this.stateDigest;
      const receipt = this.#receipt({
        status: "APPLIED",
        reason: "OK",
        playerIntent,
        operationId,
        beforeDigest,
        afterDigest,
        beforeRevision,
        afterRevision: this.state.meta.revision,
        actorEvents,
        trace,
        autonomy
      });
      this.lastTrace = trace;
      return this.#storeReceipt(receipt);
    }
    visibleCells(radius = 3, actorId = "player") {
      const actor = this.state.actors[actorId];
      const cells = [];
      for (let y = actor.position.y - radius; y <= actor.position.y + radius; y += 1) {
        for (let x = actor.position.x - radius; x <= actor.position.x + radius; x += 1) {
          const cell = this.field.cell(this.state, x, y);
          if (cell) cells.push(cell);
        }
      }
      return cells;
    }
    actionOptions(actorId = "player") {
      const actor = this.state.actors[actorId];
      const cell = this.field.cell(this.state, actor.position.x, actor.position.y);
      const options = [];
      for (const material of MATERIALS) {
        if (cell.resources[material] > 0) options.push({ actor: actorId, kind: "gather", resource: material });
        if (actor.inventory[material] > 0 && actor.needs[material] > 0) options.push({ actor: actorId, kind: "consume", resource: material });
        if (actor.needs[material] >= 3) options.push({ actor: actorId, kind: "request", resource: material });
      }
      for (const other of Object.values(this.state.actors).filter((candidate) => candidate.id !== actorId && manhattan(candidate.position, actor.position) <= 1)) {
        for (const material of MATERIALS) {
          if (actor.inventory[material] > 0 && other.needs[material] > 0) options.push({ actor: actorId, kind: "share", target: other.id, resource: material });
        }
      }
      if (actor.inventory.fiber >= 3 && cell.shelter < 1) options.push({ actor: actorId, kind: "build", structure: "shelter" });
      if (cell.shelter > 0 && actor.energy < actor.maxEnergy) options.push({ actor: actorId, kind: "rest" });
      options.push({ actor: actorId, kind: "wait" });
      return options.filter((intent) => validateIntent(this.state, this.field, intent) === null);
    }
    verifyReplay() {
      const replay = new _LivingWorld(this.options);
      for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
        const result = replay.advance(receipt.playerIntent, { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
        if (result.status !== "APPLIED" || result.afterDigest !== receipt.afterDigest) {
          return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
        }
      }
      return { status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL", eventsReplayed: replay.receipts.length, expected: this.stateDigest, actual: replay.stateDigest };
    }
    exportSave() {
      const payload = { schema: "axm.stateborn.living-save/v2", options: deepClone(this.options), state: deepClone(this.state), receipts: deepClone(this.receipts) };
      return { ...payload, seal: digest(payload) };
    }
    importSave(save) {
      const { seal, ...payload } = deepClone(save);
      if (seal !== digest(payload)) return { status: "REFUSED", reason: "SAVE_SEAL_MISMATCH" };
      if (canonicalStringify(payload.options) !== canonicalStringify(this.options)) return { status: "REFUSED", reason: "WORLD_OPTIONS_MISMATCH" };
      const replay = new _LivingWorld(this.options);
      for (const receipt of payload.receipts.filter((entry) => entry.status === "APPLIED")) {
        const result = replay.advance(receipt.playerIntent, { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision });
        if (result.status !== "APPLIED" || result.afterDigest !== receipt.afterDigest) return { status: "REFUSED", reason: "REPLAY_CHAIN_MISMATCH", at: receipt.sequence };
      }
      if (canonicalStringify(replay.state) !== canonicalStringify(payload.state)) return { status: "REFUSED", reason: "STATE_REPLAY_MISMATCH" };
      this.state = deepClone(payload.state);
      this.receipts = deepClone(payload.receipts);
      this.operations = new Map(this.receipts.map((receipt) => [receipt.operationId, receipt]));
      return { status: "IMPORTED", revision: this.state.meta.revision, digest: this.stateDigest };
    }
    stats() {
      return { logicalNodes: this.logicalNodeCount, ...this.field.stats(this.state) };
    }
  };
  var livingProbe = [
    { actor: "player", kind: "share", target: "rhea", resource: "food" }
  ];
  var livingFabricCatalog = {
    logicalWorld: "deterministic sparse field",
    generatorVersion: GENERATOR_VERSION,
    ruleNodes: rules.map((rule) => ({ id: rule.id, subscribes: rule.subscribes })),
    autonomyNodes: ["autonomy.perceive.rhea", "autonomy.perceive.orr"],
    actionKinds: ["move", "gather", "share", "consume", "request", "build", "rest", "wait"]
  };

  // dist/app.js
  var $ = (selector) => document.querySelector(selector);
  var elements = {
    revision: $("#revisionBadge"),
    digest: $("#digestBadge"),
    scale: $("#scaleBadge"),
    claim: $("#claimText"),
    identity: $("#identityLabel"),
    identityBasis: $("#identityBasis"),
    energy: $("#energyLabel"),
    energyMeter: $("#energyMeter"),
    inventory: $("#inventory"),
    capacity: $("#capacityLabel"),
    competence: $("#competence"),
    threads: $("#threads"),
    threadCount: $("#threadCount"),
    location: $("#locationLabel"),
    map: $("#worldMap"),
    terrain: $("#terrainLabel"),
    cellResources: $("#cellResources"),
    present: $("#presentLabel"),
    actions: $("#actions"),
    worldStats: $("#worldStats"),
    traceStatus: $("#traceStatus"),
    wokenCount: $("#wokenCount"),
    firedCount: $("#firedCount"),
    pathCount: $("#pathCount"),
    wokenNodes: $("#wokenNodes"),
    firedNodes: $("#firedNodes"),
    discoveries: $("#discoveries"),
    receipts: $("#receipts"),
    state: $("#stateJson"),
    system: $("#systemMessage"),
    seed: $("#seedInput"),
    method: $("#methodDialog")
  };
  var world = new LivingWorld({ seed: elements.seed.value });
  var operationCounter = 0;
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
      expectedRevision: world.state.meta.revision
    });
    const autonomousEvents = receipt.actorEvents.filter((event) => event.actor !== "player").length;
    const message = receipt.status === "APPLIED" ? `APPLIED \xB7 ${receipt.playerIntent.kind} \xB7 ${autonomousEvents} autonomous act${autonomousEvents === 1 ? "" : "s"} followed \xB7 ${receipt.wokenNodes.length} nodes woke.` : `REFUSED \xB7 ${receipt.reason} \xB7 canonical state unchanged.`;
    render(message, receipt.status);
    return receipt;
  }
  function renderMap() {
    const state = world.state;
    const player = state.actors.player;
    const cells = world.visibleCells(3);
    const actorLocations = /* @__PURE__ */ new Map();
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
      const marker = isCurrent ? '<span class="cell-marker"><i class="player-marker"></i></span>' : others.length ? '<span class="cell-marker"><i class="agent-marker"></i></span>' : "";
      const resourceText = MATERIALS.filter((material) => cell.resources[material] > 0).map((material) => `${material} ${cell.resources[material]}`).join(", ") || "no material signal";
      const actorText = others.map((actor) => actor.name).join(", ");
      const target = encodeURIComponent(JSON.stringify({ actor: "player", kind: "move", to: { x: cell.x, y: cell.y } }));
      return `<button type="button" role="gridcell" class="${classes}" data-move="${target}" ${reachable ? "" : "disabled"} aria-label="${escapeHtml(`Cell ${cell.x}, ${cell.y}; ${cell.terrain}; ${resourceText}${actorText ? `; ${actorText}` : ""}`)}">${marker}<span class="resource-pips">${"<i></i>".repeat(pips)}</span><span class="cell-name">${cell.x}:${cell.y}</span></button>`;
    }).join("");
  }
  function actionLabel(intent) {
    if (intent.kind === "share") return [`Share ${intent.resource} with ${actorName(intent.target)}`, "one state may change what another chooses next", "relation"];
    if (intent.kind === "gather") return [`Gather ${intent.resource}`, "local cell delta \xB7 1 energy", ""];
    if (intent.kind === "consume") return [`Consume ${intent.resource}`, "reduce matching pressure", ""];
    if (intent.kind === "request") return [`Request ${intent.resource}`, "publish need to nearby states", "relation"];
    if (intent.kind === "build") return ["Raise shelter", "3 fiber \xB7 persistent sparse delta", "world"];
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
    elements.energyMeter.style.width = `${player.energy / player.maxEnergy * 100}%`;
    elements.capacity.textContent = `${resourceTotal(player.inventory)} / ${player.capacity}`;
    elements.inventory.innerHTML = MATERIALS.map((material) => `<div class="inventory-item"><span>${material}</span><strong>${player.inventory[material]}</strong></div>`).join("");
    elements.competence.innerHTML = Object.entries(player.needs).map(([name, value]) => `<div class="competence-item"><span>${escapeHtml(name)}</span><span>${value} / 10</span></div>`).join("");
    elements.threadCount.textContent = `${state.derived.situations.length} formed`;
    elements.threads.innerHTML = state.derived.situations.length ? state.derived.situations.map((situation) => {
      const names = situation.actors.map(actorName).join(" \u2194 ");
      const detail = situation.kind === "mutual_aid" ? `${names} \xB7 events ${situation.evidence.join(", ")}` : `${names} \xB7 ${situation.resource} \xB7 ${situation.state}`;
      return `<div class="thread-card"><strong>${escapeHtml(situation.kind.replaceAll("_", " "))}</strong><span>${escapeHtml(detail)}</span></div>`;
    }).join("") : '<p class="empty-copy">No situation projection yet. Pressure exists, but it has not become a causal pattern.</p>';
  }
  function renderWorldReadout() {
    const state = world.state;
    const player = state.actors.player;
    const cell = world.field.cell(state, player.position.x, player.position.y);
    const present = Object.values(state.actors).filter((actor) => actor.id !== "player" && actor.position.x === player.position.x && actor.position.y === player.position.y);
    elements.location.textContent = `Cell ${player.position.x} \xB7 ${player.position.y}`;
    elements.terrain.textContent = `${cell.terrain}${cell.shelter ? " \xB7 shelter raised" : ""}`;
    elements.cellResources.innerHTML = MATERIALS.map((material) => `<span class="resource-pill">${material} <b>${cell.resources[material]}</b></span>`).join("");
    elements.present.textContent = present.length ? present.map((actor) => actor.name).join(", ") : "only you";
    const stats = world.stats();
    elements.scale.textContent = `${humanNumber(stats.logicalNodes)} logical nodes`;
    elements.worldStats.innerHTML = [
      ["sleeping", humanNumber(stats.sleepingCells)],
      ["materialized", humanNumber(stats.materializedCells)],
      ["changed", humanNumber(stats.changedCells)],
      ["chunks changed", humanNumber(stats.changedChunks)]
    ].map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join("");
  }
  function chips(items, empty) {
    return items.length ? items.map((item) => `<span class="node-chip">${escapeHtml(item)}</span>`).join("") : `<span class="empty-copy">${escapeHtml(empty)}</span>`;
  }
  function describeEvent(event) {
    const target = event.target ? ` \u2192 ${actorName(event.target)}` : "";
    const resource = event.resource ? ` \xB7 ${event.resource}` : "";
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
      return `<div class="discovery ${autonomous ? "autonomous" : ""}"><strong>${autonomous ? "AUTONOMOUS \xB7 " : "PLAYER \xB7 "}${escapeHtml(describeEvent(event))}</strong><span>cause: ${escapeHtml(cause || "unresolved")}</span><code>evidence.events[${event.index}]</code></div>`;
    }) || [];
    const situationCards = state.derived.situations.map((situation) => `<div class="discovery situation"><strong>SITUATION \xB7 ${escapeHtml(situation.kind.replaceAll("_", " "))}</strong><span>${escapeHtml(situation.actors.map(actorName).join(" \u2194 "))} \xB7 ${escapeHtml(situation.state)}</span><code>causal evidence: ${escapeHtml(situation.evidence.join(", "))}</code></div>`);
    elements.discoveries.innerHTML = [...eventCards, ...situationCards].join("") || '<p class="empty-copy">No actor event or projected situation yet.</p>';
    elements.receipts.innerHTML = world.receipts.length ? [...world.receipts].reverse().map((receipt) => `<div class="receipt ${receipt.status.toLowerCase()}"><span class="receipt-index">#${String(receipt.sequence).padStart(2, "0")}</span><div><strong>${escapeHtml(receipt.playerIntent.kind)}</strong><span>${escapeHtml(receipt.reason)} \xB7 ${receipt.actorEvents.length} actor events \xB7 ${receipt.eventId.slice(0, 10)}</span></div><span class="receipt-status">${receipt.status}</span></div>`).join("") : '<p class="empty-copy">The receipt chain is empty.</p>';
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
    render("RESET \xB7 sparse genesis derived from the seed; no authored quest was loaded.");
  });
  $("#probeButton").addEventListener("click", () => {
    world = new LivingWorld({ seed: elements.seed.value.trim() || "AXM-STATEBORN-LIVING-001" });
    const receipts = livingProbe.map((intent, index) => world.advance(intent, {
      operationId: `living-probe-${index}`,
      expectedRevision: world.state.meta.revision
    }));
    const failures = receipts.filter((receipt) => receipt.status !== "APPLIED");
    const mutualAid = world.state.derived.situations.some((item) => item.kind === "mutual_aid");
    render(failures.length ? `PROBE HOLD \xB7 ${failures.length} transition(s) were refused.` : `PROBE OBSERVED \xB7 one player act yielded ${receipts[0].actorEvents.length} actor events${mutualAid ? " and a causal mutual-aid situation" : ""}.`, failures.length ? "REFUSED" : "PASS");
  });
  $("#replayButton").addEventListener("click", () => {
    const result = world.verifyReplay();
    render(result.status === "PASS" ? `REPLAY PASS \xB7 ${result.eventsReplayed} applied turns reconstructed ${result.actual.slice(0, 12)}.` : `REPLAY FAIL \xB7 divergence detected at receipt ${result.at}.`, result.status);
  });
  $("#saveButton").addEventListener("click", () => {
    localStorage.setItem("axm-stateborn-save-v2", JSON.stringify(world.exportSave()));
    render("LOCAL SAVE SEALED \xB7 sparse state and receipt chain stored on this device only.", "PASS");
  });
  $("#loadButton").addEventListener("click", () => {
    const raw = localStorage.getItem("axm-stateborn-save-v2");
    if (!raw) return render("LOAD REFUSED \xB7 no v0.2 local save exists.", "REFUSED");
    const result = world.importSave(JSON.parse(raw));
    render(result.status === "IMPORTED" ? `LOAD PASS \xB7 revision ${result.revision} restored and replay-checked.` : `LOAD REFUSED \xB7 ${result.reason}.`, result.status === "IMPORTED" ? "PASS" : "REFUSED");
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
  window.AXM_STATEBORN = { get world() {
    return world;
  }, livingFabricCatalog };
  render("Ready. Change one state\u2014or wait\u2014and inspect what wakes underneath.");
})();
