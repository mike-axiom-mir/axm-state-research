const encoder = new TextEncoder();

export function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function canonicalStringify(value) {
  if (value === undefined) return "\"__AXM_UNDEFINED__\"";
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

// Small synchronous SHA-256 implementation so browser and Node use identical bytes.
export function sha256(input) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  const words = [];
  const bitLength = bytes.length * 8;
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >> 2] = (words[index >> 2] || 0) | (bytes[index] << (24 - (index % 4) * 8));
  }
  words[bitLength >> 5] = (words[bitLength >> 5] || 0) | (0x80 << (24 - bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule = new Array(64);
    for (let i = 0; i < 16; i += 1) schedule[i] = words[offset + i] | 0;
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotate(schedule[i - 15], 7) ^ rotate(schedule[i - 15], 18) ^ (schedule[i - 15] >>> 3);
      const s1 = rotate(schedule[i - 2], 17) ^ rotate(schedule[i - 2], 19) ^ (schedule[i - 2] >>> 10);
      schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) | 0;
    }
    let a = h0; let b = h1; let c = h2; let d = h3;
    let e = h4; let f = h5; let g = h6; let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[i] + schedule[i]) | 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}

export function digest(value) {
  return sha256(canonicalStringify(value));
}

export function getPath(root, path) {
  if (!path) return root;
  return path.split(".").reduce((value, key) => value?.[key], root);
}

function ensureParent(root, segments) {
  let cursor = root;
  for (const segment of segments) {
    if (!cursor[segment] || typeof cursor[segment] !== "object") cursor[segment] = {};
    cursor = cursor[segment];
  }
  return cursor;
}

class Mutator {
  constructor(state) {
    this.state = state;
    this.changed = [];
  }

  set(path, value) {
    const segments = path.split(".");
    const key = segments.pop();
    const parent = ensureParent(this.state, segments);
    const next = deepClone(value);
    if (canonicalStringify(parent[key]) === canonicalStringify(next)) return false;
    parent[key] = next;
    this.changed.push(path);
    return true;
  }

  increment(path, amount = 1) {
    const current = Number(getPath(this.state, path) || 0);
    return this.set(path, current + amount);
  }

  push(path, value) {
    const current = getPath(this.state, path) || [];
    return this.set(path, [...current, deepClone(value)]);
  }

  pushUnique(path, value) {
    const current = getPath(this.state, path) || [];
    const signature = canonicalStringify(value);
    if (current.some((item) => canonicalStringify(item) === signature)) return false;
    return this.set(path, [...current, deepClone(value)]);
  }
}

function pathMatches(subscription, changedPath) {
  return subscription === "*"
    || changedPath === "*"
    || subscription === changedPath
    || changedPath.startsWith(`${subscription}.`)
    || subscription.startsWith(`${changedPath}.`);
}

function normalizedValidation(result) {
  if (result === true || result === undefined) return null;
  if (result === false) return "PRECONDITION_REFUSED";
  return String(result);
}

export class StateFabric {
  constructor({ seed, initialState, actions, rules, invariants = [] }) {
    this.seed = seed;
    this.actions = [...actions].sort((a, b) => a.id.localeCompare(b.id));
    this.rules = [...rules].sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.id.localeCompare(b.id));
    this.invariants = [...invariants];
    this.config = { seed, initialState: deepClone(initialState), actions: this.actions, rules: this.rules, invariants: this.invariants };
    const stabilized = deepClone(initialState);
    const initialRun = this.#runRules(stabilized, ["*"]);
    const failed = this.#checkInvariants(stabilized);
    if (failed) throw new Error(`Invalid genesis state: ${failed}`);
    this.genesis = deepClone(stabilized);
    this.state = deepClone(stabilized);
    this.receipts = [];
    this.operations = new Map();
    this.lastTrace = { woken: initialRun.woken, fired: initialRun.fired, changed: initialRun.changed };
  }

  get stateDigest() {
    return digest(this.state);
  }

  #context(mutator, params = {}, action = null) {
    return {
      state: mutator.state,
      params,
      action,
      get: (path) => getPath(mutator.state, path),
      set: (path, value) => mutator.set(path, value),
      increment: (path, amount) => mutator.increment(path, amount),
      push: (path, value) => mutator.push(path, value),
      pushUnique: (path, value) => mutator.pushUnique(path, value),
    };
  }

  #runRules(state, initialPaths, params = {}, action = null) {
    const mutator = new Mutator(state);
    let wave = [...initialPaths];
    const woken = [];
    const fired = [];
    const signatures = new Set();
    let rounds = 0;
    while (wave.length) {
      rounds += 1;
      if (rounds > 128) throw new Error("RULE_FIXPOINT_LIMIT");
      const changeStart = mutator.changed.length;
      for (const rule of this.rules) {
        if (!rule.subscribes.some((subscription) => wave.some((path) => pathMatches(subscription, path)))) continue;
        const subscribedState = Object.fromEntries(rule.subscribes.map((path) => [path, path === "*" ? state : getPath(state, path)]));
        const signature = `${rule.id}:${digest(subscribedState)}`;
        if (signatures.has(signature)) continue;
        signatures.add(signature);
        woken.push(rule.id);
        const ctx = this.#context(mutator, params, action);
        if (normalizedValidation(rule.when?.(ctx)) !== null) continue;
        const before = mutator.changed.length;
        rule.run(ctx);
        if (mutator.changed.length > before) fired.push(rule.id);
      }
      wave = [...new Set(mutator.changed.slice(changeStart))];
    }
    return { woken, fired, changed: [...new Set(mutator.changed)] };
  }

  #checkInvariants(state) {
    for (const invariant of this.invariants) {
      const failure = normalizedValidation(invariant.check(state));
      if (failure) return `${invariant.id}:${failure}`;
    }
    return null;
  }

  #receipt({ status, reason, actionId, params, operationId, previousDigest, nextDigest, previousRevision, nextRevision, trace }) {
    const body = {
      schema: "axm.stateborn.receipt/v1",
      sequence: this.receipts.length,
      operationId,
      actionId,
      params: deepClone(params),
      status,
      reason,
      previousRevision,
      nextRevision,
      previousDigest,
      nextDigest,
      wokenNodes: trace.woken,
      firedNodes: trace.fired,
      changedPaths: trace.changed,
    };
    return { ...body, eventId: digest(body) };
  }

  #refuse({ reason, actionId, params, operationId, previousDigest, previousRevision, trace = { woken: [], fired: [], changed: [] } }) {
    const receipt = this.#receipt({
      status: "REFUSED",
      reason,
      actionId,
      params,
      operationId,
      previousDigest,
      nextDigest: previousDigest,
      previousRevision,
      nextRevision: previousRevision,
      trace,
    });
    this.receipts.push(receipt);
    this.operations.set(operationId, receipt);
    this.lastTrace = trace;
    return deepClone(receipt);
  }

  perform(actionId, params = {}, options = {}) {
    const operationId = options.operationId || `op-${this.receipts.length}-${actionId}`;
    if (this.operations.has(operationId)) {
      return { ...deepClone(this.operations.get(operationId)), duplicate: true };
    }
    const previousDigest = this.stateDigest;
    const previousRevision = this.state.meta.revision;
    if (options.expectedRevision !== undefined && options.expectedRevision !== previousRevision) {
      return this.#refuse({ reason: "STALE_REVISION", actionId, params, operationId, previousDigest, previousRevision });
    }
    const action = this.actions.find((candidate) => candidate.id === actionId);
    if (!action) return this.#refuse({ reason: "UNKNOWN_ACTION", actionId, params, operationId, previousDigest, previousRevision });

    const precondition = normalizedValidation(action.validate?.({ state: deepClone(this.state), params: deepClone(params), get: (path) => getPath(this.state, path) }));
    if (precondition) return this.#refuse({ reason: precondition, actionId, params, operationId, previousDigest, previousRevision });

    const draft = deepClone(this.state);
    const mutator = new Mutator(draft);
    try {
      action.run(this.#context(mutator, params, action));
      const directChanges = [...new Set(mutator.changed)];
      const ruleTrace = this.#runRules(draft, directChanges, params, action);
      const trace = {
        woken: ruleTrace.woken,
        fired: ruleTrace.fired,
        changed: [...new Set([...directChanges, ...ruleTrace.changed])],
      };
      const invariantFailure = this.#checkInvariants(draft);
      if (invariantFailure) {
        return this.#refuse({ reason: `ATOMIC_ROLLBACK:${invariantFailure}`, actionId, params, operationId, previousDigest, previousRevision, trace });
      }
      draft.meta.revision = previousRevision + 1;
      draft.meta.turn = (draft.meta.turn || 0) + 1;
      trace.changed.push("meta.revision", "meta.turn");
      const nextDigest = digest(draft);
      const receipt = this.#receipt({
        status: "APPLIED",
        reason: "OK",
        actionId,
        params,
        operationId,
        previousDigest,
        nextDigest,
        previousRevision,
        nextRevision: draft.meta.revision,
        trace,
      });
      this.state = draft;
      this.receipts.push(receipt);
      this.operations.set(operationId, receipt);
      this.lastTrace = trace;
      return deepClone(receipt);
    } catch (error) {
      return this.#refuse({ reason: `RULE_ERROR:${error.message}`, actionId, params, operationId, previousDigest, previousRevision });
    }
  }

  availableActions() {
    return this.actions.map((action) => {
      const reason = normalizedValidation(action.validate?.({ state: deepClone(this.state), params: {}, get: (path) => getPath(this.state, path) }));
      return { id: action.id, label: action.label, available: reason === null, reason };
    });
  }

  verifyReplay() {
    const replay = new StateFabric(this.config);
    for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
      const result = replay.perform(receipt.actionId, receipt.params, {
        operationId: receipt.operationId,
        expectedRevision: receipt.previousRevision,
      });
      if (result.status !== "APPLIED" || result.nextDigest !== receipt.nextDigest) {
        return { status: "FAIL", at: receipt.sequence, expected: receipt.nextDigest, actual: result.nextDigest };
      }
    }
    return {
      status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
      eventsReplayed: this.receipts.filter((entry) => entry.status === "APPLIED").length,
      expected: this.stateDigest,
      actual: replay.stateDigest,
    };
  }

  exportSave() {
    const payload = {
      schema: "axm.stateborn.save/v1",
      seed: this.seed,
      state: deepClone(this.state),
      receipts: deepClone(this.receipts),
    };
    return { ...payload, seal: digest(payload) };
  }

  importSave(save) {
    const { seal, ...payload } = deepClone(save);
    if (seal !== digest(payload)) return { status: "REFUSED", reason: "SAVE_SEAL_MISMATCH" };
    if (payload.seed !== this.seed) return { status: "REFUSED", reason: "SEED_MISMATCH" };
    const replay = new StateFabric(this.config);
    for (const receipt of payload.receipts.filter((entry) => entry.status === "APPLIED")) {
      const result = replay.perform(receipt.actionId, receipt.params, {
        operationId: receipt.operationId,
        expectedRevision: receipt.previousRevision,
      });
      if (result.status !== "APPLIED" || result.nextDigest !== receipt.nextDigest) {
        return { status: "REFUSED", reason: "REPLAY_CHAIN_MISMATCH", at: receipt.sequence };
      }
    }
    if (canonicalStringify(replay.state) !== canonicalStringify(payload.state)) {
      return { status: "REFUSED", reason: "STATE_REPLAY_MISMATCH" };
    }
    this.state = deepClone(payload.state);
    this.receipts = deepClone(payload.receipts);
    this.operations = new Map(this.receipts.map((receipt) => [receipt.operationId, receipt]));
    this.lastTrace = { woken: [], fired: [], changed: [] };
    return { status: "IMPORTED", revision: this.state.meta.revision, digest: this.stateDigest };
  }
}
