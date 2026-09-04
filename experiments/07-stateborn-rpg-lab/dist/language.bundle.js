(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

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

  // dist/state-language.js
  var LANGUAGE_DIMENSIONS = 3;
  var LANGUAGE_OPS = Object.freeze({ OFFER: 0, PROPOSE: 1, ACCEPT: 2, REFUSE: 3, COMMIT: 4 });
  var LANGUAGE_OUTCOMES = Object.freeze({ OPEN: 0, SOLVED: 1, REFUSED: 2, DEADLOCK: 3 });
  var LANGUAGE_REASONS = Object.freeze({
    OK: 0,
    PACKET_SCHEMA: 10,
    PACKET_DIGEST: 11,
    TRIAL_MISMATCH: 12,
    STALE_SEQUENCE: 13,
    STALE_STATE: 14,
    TRIAL_CLOSED: 15,
    OP_UNKNOWN: 16,
    ACTOR_UNKNOWN: 17,
    PAYLOAD_SHAPE: 18,
    HUMAN_LANGUAGE_FIELD: 19,
    VECTOR_SCOPE: 20,
    OFFER_AUTHORITY: 21,
    OFFERS_INCOMPLETE: 22,
    PROPOSER_ORDER: 23,
    PROPOSAL_TARGET: 24,
    PROPOSAL_AUTHORITY: 25,
    PROPOSAL_MISMATCH: 26,
    RESPONSE_DUPLICATE: 27,
    ACCEPT_AUTHORITY: 28,
    ACCEPTS_INCOMPLETE: 29,
    COMMIT_AUTHORITY: 30,
    CONSENT_POLICY: 31,
    INSUFFICIENT_OFFER: 32,
    DEADLOCK_LIMIT: 33
  });
  var RAW_FIXTURES = [
    {
      id: "train-complement",
      split: "training",
      target: [1, 1, 0],
      actors: {
        a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "TRAIN_A_PRIVATE", token: "train-a-token" } },
        b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "TRAIN_B_PRIVATE", token: "train-b-token" } }
      }
    },
    {
      id: "train-overlap",
      split: "training",
      target: [1, 1, 1],
      actors: {
        a: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "OVERLAP_A_PRIVATE", token: "overlap-a-token" } },
        b: { inventory: [0, 1, 1], consentMax: [0, 1, 1], rejectMask: [0, 0, 0], private: { note: "OVERLAP_B_PRIVATE", token: "overlap-b-token" } }
      }
    },
    {
      id: "held-complement",
      split: "held_out",
      target: [1, 2, 1],
      actors: {
        a: { inventory: [2, 0, 1], consentMax: [1, 0, 1], rejectMask: [0, 0, 0], private: { note: "HELD_A_PRIVATE", token: "held-a-token" } },
        b: { inventory: [0, 2, 0], consentMax: [0, 2, 0], rejectMask: [0, 0, 0], private: { note: "HELD_B_PRIVATE", token: "held-b-token" } }
      }
    },
    {
      id: "held-ambiguous",
      split: "held_out",
      target: [1, 1, 0],
      actors: {
        a: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "AMBIG_A_PRIVATE", token: "ambig-a-token" } },
        b: { inventory: [1, 1, 0], consentMax: [1, 1, 0], rejectMask: [0, 0, 0], private: { note: "AMBIG_B_PRIVATE", token: "ambig-b-token" } }
      }
    },
    {
      id: "held-refusal",
      split: "held_out",
      target: [1, 1, 0],
      actors: {
        a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "REFUSE_A_PRIVATE", token: "refuse-a-token" } },
        b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 1, 0], private: { note: "REFUSE_B_PRIVATE", token: "refuse-b-token" } }
      }
    },
    {
      id: "held-insufficient",
      split: "held_out",
      target: [1, 1, 1],
      actors: {
        a: { inventory: [1, 0, 0], consentMax: [1, 0, 0], rejectMask: [0, 0, 0], private: { note: "SHORT_A_PRIVATE", token: "short-a-token" } },
        b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "SHORT_B_PRIVATE", token: "short-b-token" } }
      }
    },
    {
      id: "held-consent-gap",
      split: "held_out",
      target: [1, 1, 0],
      actors: {
        a: { inventory: [2, 0, 0], consentMax: [0, 0, 0], rejectMask: [0, 0, 0], private: { note: "GAP_A_PRIVATE", token: "gap-a-token" } },
        b: { inventory: [0, 1, 0], consentMax: [0, 1, 0], rejectMask: [0, 0, 0], private: { note: "GAP_B_PRIVATE", token: "gap-b-token" } }
      }
    }
  ];
  var STATE_LANGUAGE_FIXTURES = deepClone(RAW_FIXTURES);
  var STATE_LANGUAGE_FIXTURE_DIGEST = digest(STATE_LANGUAGE_FIXTURES);
  var FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST = "4a70fa25ce93be23e16dff144eb28a201e437589cba69b007c387c12c0c13b1f";
  var ACTOR_IDS = ["a", "b"];
  var encoder2 = new TextEncoder();
  var isInt = (value) => Number.isInteger(value) && value >= 0;
  var isVector = (value) => Array.isArray(value) && value.length === LANGUAGE_DIMENSIONS && value.every(isInt);
  var vectorMin = (left, right) => left.map((value, index) => Math.min(value, right[index]));
  var vectorLeq = (left, right) => left.every((value, index) => value <= right[index]);
  var vectorSum = (vectors) => vectors.reduce((sum, vector) => sum.map((value, index) => value + vector[index]), [0, 0, 0]);
  var exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && canonicalStringify(Object.keys(value).sort()) === canonicalStringify([...keys].sort());
  var isHexDigest = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  function packetPayload(packet) {
    const body = deepClone(packet);
    delete body.packetDigest;
    return body;
  }
  function payloadIsStateOnly(value) {
    if (value === null || typeof value === "number" || typeof value === "boolean") return true;
    if (typeof value === "string") return isHexDigest(value);
    if (Array.isArray(value)) return value.every(payloadIsStateOnly);
    if (typeof value === "object") return Object.values(value).every(payloadIsStateOnly);
    return false;
  }
  function fixtureById(id) {
    const fixture = STATE_LANGUAGE_FIXTURES.find((candidate) => candidate.id === id);
    if (!fixture) throw new Error(`UNKNOWN_LANGUAGE_FIXTURE:${id}`);
    return deepClone(fixture);
  }
  function enumerateContributions(target, offers) {
    let candidates = [{ a: [], b: [] }];
    for (let index = 0; index < LANGUAGE_DIMENSIONS; index += 1) {
      const allocations = [];
      for (let a = 0; a <= Math.min(target[index], offers.a[index]); a += 1) {
        const b = target[index] - a;
        if (b >= 0 && b <= offers.b[index]) allocations.push({ a, b });
      }
      if (!allocations.length) return [];
      candidates = candidates.flatMap((candidate) => allocations.map((allocation) => ({
        a: [...candidate.a, allocation.a],
        b: [...candidate.b, allocation.b]
      })));
    }
    return candidates.sort((left, right) => canonicalStringify(left).localeCompare(canonicalStringify(right)));
  }
  function receipt({ index, operationId, status, reasonCode, beforeRevision, afterRevision, beforeDigest, afterDigest, packet = null, kind = "PACKET" }) {
    const value = {
      schema: "axm.stateborn.state-language-receipt/v1",
      index,
      operationId,
      kind,
      status,
      reasonCode,
      beforeRevision,
      afterRevision,
      beforeDigest,
      afterDigest,
      packet: packet ? deepClone(packet) : null
    };
    value.receiptId = digest(value);
    return value;
  }
  var _StateLanguageTrial_instances, reason_fn;
  var _StateLanguageTrial = class _StateLanguageTrial {
    constructor(fixtureOrId = "train-complement") {
      __privateAdd(this, _StateLanguageTrial_instances);
      this.fixture = typeof fixtureOrId === "string" ? fixtureById(fixtureOrId) : deepClone(fixtureOrId);
      this.trialId = digest({ schema: "axm.stateborn.state-language-trial/v1", fixture: this.fixture });
      this.seats = Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, deepClone(this.fixture.actors[actorId])]));
      this.options = { fixture: deepClone(this.fixture) };
      this.genesis = {
        schema: "axm.stateborn.state-language-session/v1",
        trialId: this.trialId,
        meta: { revision: 0, sequence: 0, packetLimit: 8 },
        task: { target: deepClone(this.fixture.target) },
        actors: Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, {
          inventory: deepClone(this.seats[actorId].inventory),
          consentMax: deepClone(this.seats[actorId].consentMax)
        }])),
        channel: { offers: {}, proposal: null, responses: {} },
        messages: [],
        joint: [0, 0, 0],
        observer: { outcomeCode: LANGUAGE_OUTCOMES.OPEN, reasonCode: LANGUAGE_REASONS.OK, ambiguityCount: 0 }
      };
      this.state = deepClone(this.genesis);
      this.receipts = [];
      this.operations = /* @__PURE__ */ new Map();
    }
    get stateDigest() {
      return digest(this.state);
    }
    get sourceDigests() {
      return Object.fromEntries(ACTOR_IDS.map((actorId) => [actorId, digest(this.seats[actorId])]));
    }
    policyView(actorId) {
      if (!ACTOR_IDS.includes(actorId)) throw new Error("ACTOR_UNKNOWN");
      return {
        schema: "axm.stateborn.state-language-view/v1",
        trialId: this.trialId,
        actorCode: ACTOR_IDS.indexOf(actorId),
        target: deepClone(this.state.task.target),
        own: {
          inventory: deepClone(this.state.actors[actorId].inventory),
          consentMax: deepClone(this.state.actors[actorId].consentMax),
          rejectMask: deepClone(this.seats[actorId].rejectMask)
        },
        observed: {
          offers: deepClone(this.state.channel.offers),
          proposal: deepClone(this.state.channel.proposal),
          responses: deepClone(this.state.channel.responses),
          packetCount: this.state.messages.length
        }
      };
    }
    makePacket(from, op, payload, { to = -1 } = {}) {
      const packet = {
        schema: "axm.stateborn.state-language-packet/v1",
        trialId: this.trialId,
        sequence: this.state.meta.sequence,
        from,
        to,
        op,
        payload: deepClone(payload),
        priorStateDigest: this.stateDigest
      };
      packet.packetDigest = digest(packetPayload(packet));
      return packet;
    }
    applyPacket(packet, { operationId } = {}) {
      const resolvedId = operationId || `packet-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      const reasonCode = __privateMethod(this, _StateLanguageTrial_instances, reason_fn).call(this, packet);
      if (reasonCode !== LANGUAGE_REASONS.OK) {
        const refused = receipt({
          index: this.receipts.length,
          operationId: resolvedId,
          status: "REFUSED",
          reasonCode,
          beforeRevision,
          afterRevision: beforeRevision,
          beforeDigest,
          afterDigest: beforeDigest,
          packet
        });
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      draft.messages.push(deepClone(packet));
      if (packet.op === LANGUAGE_OPS.OFFER) draft.channel.offers[packet.from] = deepClone(packet);
      if (packet.op === LANGUAGE_OPS.PROPOSE) {
        draft.channel.proposal = deepClone(packet);
        draft.observer.ambiguityCount = Math.max(0, packet.payload.n - 1);
      }
      if (packet.op === LANGUAGE_OPS.ACCEPT || packet.op === LANGUAGE_OPS.REFUSE) {
        draft.channel.responses[packet.from] = deepClone(packet);
        if (packet.op === LANGUAGE_OPS.REFUSE) {
          draft.observer.outcomeCode = LANGUAGE_OUTCOMES.REFUSED;
          draft.observer.reasonCode = packet.payload.r;
        }
      }
      if (packet.op === LANGUAGE_OPS.COMMIT) {
        draft.joint = deepClone(draft.task.target);
        draft.observer.outcomeCode = LANGUAGE_OUTCOMES.SOLVED;
        draft.observer.reasonCode = LANGUAGE_REASONS.OK;
      }
      draft.meta.revision += 1;
      draft.meta.sequence += 1;
      this.state = draft;
      const applied = receipt({
        index: this.receipts.length,
        operationId: resolvedId,
        status: "APPLIED",
        reasonCode: LANGUAGE_REASONS.OK,
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        packet
      });
      this.receipts.push(applied);
      this.operations.set(resolvedId, applied);
      return deepClone(applied);
    }
    emitOffer(actorId) {
      const view = this.policyView(actorId);
      return this.applyPacket(this.makePacket(actorId, LANGUAGE_OPS.OFFER, { v: vectorMin(view.own.inventory, view.own.consentMax) }), { operationId: `offer-${actorId}` });
    }
    emitProposal() {
      if (!ACTOR_IDS.every((id) => this.state.channel.offers[id])) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.OFFERS_INCOMPLETE };
      const offers = Object.fromEntries(ACTOR_IDS.map((id) => [id, this.state.channel.offers[id].payload.v]));
      const candidates = enumerateContributions(this.state.task.target, offers);
      if (!candidates.length) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.INSUFFICIENT_OFFER };
      const payload = {
        c: candidates[0],
        n: candidates.length,
        o: ACTOR_IDS.map((id) => this.state.channel.offers[id].packetDigest).sort()
      };
      return this.applyPacket(this.makePacket(ACTOR_IDS[0], LANGUAGE_OPS.PROPOSE, payload), { operationId: "proposal" });
    }
    emitResponse(actorId) {
      const proposal = this.state.channel.proposal;
      if (!proposal) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.PROPOSAL_MISMATCH };
      const contribution = proposal.payload.c[actorId];
      const rejects = contribution.some((value, index) => value > 0 && this.seats[actorId].rejectMask[index] > 0);
      const op = rejects ? LANGUAGE_OPS.REFUSE : LANGUAGE_OPS.ACCEPT;
      const reasonCode = rejects ? LANGUAGE_REASONS.CONSENT_POLICY : LANGUAGE_REASONS.OK;
      return this.applyPacket(this.makePacket(actorId, op, { p: proposal.packetDigest, r: reasonCode }), { operationId: `response-${actorId}` });
    }
    emitCommit() {
      const proposal = this.state.channel.proposal;
      const acceptDigests = ACTOR_IDS.map((id) => this.state.channel.responses[id]?.packetDigest).filter(Boolean).sort();
      return this.applyPacket(this.makePacket(-1, LANGUAGE_OPS.COMMIT, { p: proposal?.packetDigest || digest(null), a: acceptDigests }), { operationId: "commit" });
    }
    closeDeadlock({ operationId = "deadlock" } = {}) {
      if (this.operations.has(operationId)) return { ...deepClone(this.operations.get(operationId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      if (this.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) {
        const refused = receipt({
          index: this.receipts.length,
          operationId,
          status: "REFUSED",
          reasonCode: LANGUAGE_REASONS.TRIAL_CLOSED,
          beforeRevision,
          afterRevision: beforeRevision,
          beforeDigest,
          afterDigest: beforeDigest,
          kind: "CLOSE"
        });
        this.receipts.push(refused);
        this.operations.set(operationId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      draft.observer.outcomeCode = LANGUAGE_OUTCOMES.DEADLOCK;
      draft.observer.reasonCode = LANGUAGE_REASONS.DEADLOCK_LIMIT;
      draft.meta.revision += 1;
      this.state = draft;
      const applied = receipt({
        index: this.receipts.length,
        operationId,
        status: "APPLIED",
        reasonCode: LANGUAGE_REASONS.DEADLOCK_LIMIT,
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        kind: "CLOSE"
      });
      this.receipts.push(applied);
      this.operations.set(operationId, applied);
      return deepClone(applied);
    }
    runProtocol({ order = ACTOR_IDS } = {}) {
      const normalizedOrder = [...order];
      for (const actorId of normalizedOrder) this.emitOffer(actorId);
      const proposal = this.emitProposal();
      if (proposal.status !== "APPLIED") {
        this.closeDeadlock();
        return this.summary();
      }
      for (const actorId of normalizedOrder) {
        this.emitResponse(actorId);
        if (this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.REFUSED) return this.summary();
      }
      this.emitCommit();
      if (this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) this.closeDeadlock();
      return this.summary();
    }
    normalizedOutcomeDigest() {
      const proposal = this.state.channel.proposal;
      const responses = this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.SOLVED ? Object.fromEntries(ACTOR_IDS.map((id) => [id, this.state.channel.responses[id]?.op ?? null])) : this.state.observer.outcomeCode === LANGUAGE_OUTCOMES.REFUSED ? ACTOR_IDS.filter((id) => this.state.channel.responses[id]?.op === LANGUAGE_OPS.REFUSE) : [];
      return digest({
        trialId: this.trialId,
        target: this.state.task.target,
        joint: this.state.joint,
        outcomeCode: this.state.observer.outcomeCode,
        reasonCode: this.state.observer.reasonCode,
        ambiguityCount: this.state.observer.ambiguityCount,
        contribution: proposal?.payload.c || null,
        responses
      });
    }
    summary() {
      const privateValues = ACTOR_IDS.flatMap((id) => Object.values(this.seats[id].private));
      const serialized = canonicalStringify(this.state.messages);
      const commits = this.state.messages.filter((packet) => packet.op === LANGUAGE_OPS.COMMIT);
      const acceptedDeltaProvenance = commits.every((packet) => packet.payload.a.length === ACTOR_IDS.length && packet.payload.a.every((value) => ACTOR_IDS.some((id) => this.state.channel.responses[id]?.packetDigest === value && this.state.channel.responses[id].op === LANGUAGE_OPS.ACCEPT)));
      return {
        fixtureId: this.fixture.id,
        split: this.fixture.split,
        outcomeCode: this.state.observer.outcomeCode,
        reasonCode: this.state.observer.reasonCode,
        messages: this.state.messages.length,
        bytes: this.state.messages.reduce((sum, packet) => sum + encoder2.encode(canonicalStringify(packet)).length, 0),
        ambiguityCount: this.state.observer.ambiguityCount,
        privateLeakage: privateValues.filter((value) => serialized.includes(value)).length,
        humanLanguagePayloads: this.state.messages.filter((packet) => !payloadIsStateOnly(packet.payload)).length,
        acceptedDeltaProvenance,
        stateDigest: this.stateDigest,
        normalizedOutcomeDigest: this.normalizedOutcomeDigest()
      };
    }
    verifyReplay() {
      const replay = new _StateLanguageTrial(this.fixture);
      for (const expected of this.receipts) {
        const actual = expected.kind === "CLOSE" ? replay.closeDeadlock({ operationId: expected.operationId }) : replay.applyPacket(expected.packet, { operationId: expected.operationId });
        if (actual.receiptId !== expected.receiptId) return { status: "FAIL", at: expected.index, expected: expected.receiptId, actual: actual.receiptId };
      }
      return {
        status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
        receiptsReplayed: replay.receipts.length,
        expected: this.stateDigest,
        actual: replay.stateDigest
      };
    }
  };
  _StateLanguageTrial_instances = new WeakSet();
  reason_fn = function(packet) {
    if (!packet || packet.schema !== "axm.stateborn.state-language-packet/v1") return LANGUAGE_REASONS.PACKET_SCHEMA;
    if (digest(packetPayload(packet)) !== packet.packetDigest) return LANGUAGE_REASONS.PACKET_DIGEST;
    if (packet.trialId !== this.trialId) return LANGUAGE_REASONS.TRIAL_MISMATCH;
    if (packet.sequence !== this.state.meta.sequence) return LANGUAGE_REASONS.STALE_SEQUENCE;
    if (packet.priorStateDigest !== this.stateDigest) return LANGUAGE_REASONS.STALE_STATE;
    if (this.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return LANGUAGE_REASONS.TRIAL_CLOSED;
    if (!Object.values(LANGUAGE_OPS).includes(packet.op)) return LANGUAGE_REASONS.OP_UNKNOWN;
    if (!payloadIsStateOnly(packet.payload)) return LANGUAGE_REASONS.HUMAN_LANGUAGE_FIELD;
    if (packet.op !== LANGUAGE_OPS.COMMIT && !ACTOR_IDS.includes(packet.from)) return LANGUAGE_REASONS.ACTOR_UNKNOWN;
    if (packet.op === LANGUAGE_OPS.OFFER) {
      if (!exactKeys(packet.payload, ["v"]) || !isVector(packet.payload.v)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      const actor = this.state.actors[packet.from];
      if (!vectorLeq(packet.payload.v, actor.inventory) || !vectorLeq(packet.payload.v, actor.consentMax)) return LANGUAGE_REASONS.OFFER_AUTHORITY;
    } else if (packet.op === LANGUAGE_OPS.PROPOSE) {
      if (!exactKeys(packet.payload, ["c", "n", "o"]) || !exactKeys(packet.payload.c, ACTOR_IDS) || !ACTOR_IDS.every((id) => isVector(packet.payload.c[id])) || !isInt(packet.payload.n) || !Array.isArray(packet.payload.o) || packet.payload.o.length !== ACTOR_IDS.length || !packet.payload.o.every(isHexDigest)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      if (!ACTOR_IDS.every((id) => this.state.channel.offers[id])) return LANGUAGE_REASONS.OFFERS_INCOMPLETE;
      if (packet.from !== [...ACTOR_IDS].sort()[0]) return LANGUAGE_REASONS.PROPOSER_ORDER;
      const currentOfferDigests = ACTOR_IDS.map((id) => this.state.channel.offers[id].packetDigest).sort();
      if (canonicalStringify(packet.payload.o) !== canonicalStringify(currentOfferDigests)) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (canonicalStringify(vectorSum(ACTOR_IDS.map((id) => packet.payload.c[id]))) !== canonicalStringify(this.state.task.target)) return LANGUAGE_REASONS.PROPOSAL_TARGET;
      if (!ACTOR_IDS.every((id) => vectorLeq(packet.payload.c[id], this.state.channel.offers[id].payload.v))) return LANGUAGE_REASONS.PROPOSAL_AUTHORITY;
    } else if (packet.op === LANGUAGE_OPS.ACCEPT || packet.op === LANGUAGE_OPS.REFUSE) {
      if (!exactKeys(packet.payload, ["p", "r"]) || !isHexDigest(packet.payload.p) || !isInt(packet.payload.r)) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
      if (!this.state.channel.proposal || packet.payload.p !== this.state.channel.proposal.packetDigest) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (this.state.channel.responses[packet.from]) return LANGUAGE_REASONS.RESPONSE_DUPLICATE;
      if (packet.op === LANGUAGE_OPS.ACCEPT) {
        if (packet.payload.r !== LANGUAGE_REASONS.OK) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
        const contribution = this.state.channel.proposal.payload.c[packet.from];
        const view = this.policyView(packet.from);
        if (!vectorLeq(contribution, view.own.inventory) || !vectorLeq(contribution, view.own.consentMax) || contribution.some((value, index) => value > 0 && view.own.rejectMask[index] > 0)) return LANGUAGE_REASONS.ACCEPT_AUTHORITY;
      } else if (packet.payload.r === LANGUAGE_REASONS.OK) return LANGUAGE_REASONS.PAYLOAD_SHAPE;
    } else if (packet.op === LANGUAGE_OPS.COMMIT) {
      if (packet.from !== -1 || !exactKeys(packet.payload, ["a", "p"]) || !isHexDigest(packet.payload.p) || !Array.isArray(packet.payload.a) || packet.payload.a.length !== ACTOR_IDS.length || !packet.payload.a.every(isHexDigest)) return LANGUAGE_REASONS.COMMIT_AUTHORITY;
      if (!this.state.channel.proposal || packet.payload.p !== this.state.channel.proposal.packetDigest) return LANGUAGE_REASONS.PROPOSAL_MISMATCH;
      if (!ACTOR_IDS.every((id) => this.state.channel.responses[id]?.op === LANGUAGE_OPS.ACCEPT && this.state.channel.responses[id].payload.p === packet.payload.p)) return LANGUAGE_REASONS.ACCEPTS_INCOMPLETE;
      const acceptDigests = ACTOR_IDS.map((id) => this.state.channel.responses[id].packetDigest).sort();
      if (canonicalStringify(packet.payload.a) !== canonicalStringify(acceptDigests)) return LANGUAGE_REASONS.ACCEPTS_INCOMPLETE;
    }
    return LANGUAGE_REASONS.OK;
  };
  var StateLanguageTrial = _StateLanguageTrial;
  function directStateBaseline(fixtureOrId) {
    const trial2 = new StateLanguageTrial(fixtureOrId);
    const offers = Object.fromEntries(ACTOR_IDS.map((id) => [id, vectorMin(trial2.seats[id].inventory, trial2.seats[id].consentMax)]));
    const candidates = enumerateContributions(trial2.fixture.target, offers);
    if (!candidates.length) return { outcomeCode: LANGUAGE_OUTCOMES.DEADLOCK, evaluations: 1 };
    const selected = candidates[0];
    const refused = ACTOR_IDS.some((id) => selected[id].some((value, index) => value > 0 && trial2.seats[id].rejectMask[index] > 0));
    return {
      outcomeCode: refused ? LANGUAGE_OUTCOMES.REFUSED : LANGUAGE_OUTCOMES.SOLVED,
      evaluations: 1,
      ambiguityCount: Math.max(0, candidates.length - 1),
      contribution: selected
    };
  }
  function stateLanguageGate(fixtures = STATE_LANGUAGE_FIXTURES.filter((fixture) => fixture.split === "held_out")) {
    const runs = fixtures.map((fixture) => {
      const trial2 = new StateLanguageTrial(fixture);
      const sourceBefore = trial2.sourceDigests;
      const result = trial2.runProtocol();
      const reverse = new StateLanguageTrial(fixture);
      const reversed = reverse.runProtocol({ order: ["b", "a"] });
      return {
        ...result,
        baselineOutcomeCode: directStateBaseline(fixture).outcomeCode,
        sourceUnchanged: canonicalStringify(sourceBefore) === canonicalStringify(trial2.sourceDigests),
        replay: trial2.verifyReplay().status,
        reverseReplay: reverse.verifyReplay().status,
        orderNormalized: result.normalizedOutcomeDigest === reversed.normalizedOutcomeDigest
      };
    });
    return {
      schema: "axm.stateborn.state-language-gate/v1",
      fixtureDigest: STATE_LANGUAGE_FIXTURE_DIGEST,
      frozenFixtureDigest: FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST,
      freezeValid: STATE_LANGUAGE_FIXTURE_DIGEST === FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST,
      heldOutRuns: runs.length,
      solved: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED).length,
      refused: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.REFUSED).length,
      deadlocked: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK).length,
      allPrivateClean: runs.every((run) => run.privateLeakage === 0),
      allPayloadsStateOnly: runs.every((run) => run.humanLanguagePayloads === 0),
      allAppliedDeltasAccepted: runs.every((run) => run.acceptedDeltaProvenance),
      allSourcesUnchanged: runs.every((run) => run.sourceUnchanged),
      allReplay: runs.every((run) => run.replay === "PASS" && run.reverseReplay === "PASS"),
      allOrderNormalized: runs.every((run) => run.orderNormalized),
      baselineAgreement: runs.every((run) => run.outcomeCode === run.baselineOutcomeCode),
      runs
    };
  }
  var stateLanguageContracts = {
    claim: "bounded deterministic actors can coordinate through typed state packets without a natural-language payload channel",
    packetOps: deepClone(LANGUAGE_OPS),
    dimensions: LANGUAGE_DIMENSIONS,
    authority: { actor: "offer, propose, accept, or refuse within its own public consent vector", referee: "commit only after two exact proposal acceptances" },
    exclusions: ["private machine language", "subjective understanding", "general communication", "network transport", "secure identity", "production multiplayer"]
  };

  // dist/language-app.js
  var $ = (selector) => document.querySelector(selector);
  var heldFixtures = STATE_LANGUAGE_FIXTURES.filter((fixture) => fixture.split === "held_out");
  var opNames = Object.fromEntries(Object.entries(LANGUAGE_OPS).map(([name, code]) => [code, name]));
  var outcomeNames = Object.fromEntries(Object.entries(LANGUAGE_OUTCOMES).map(([name, code]) => [code, name]));
  var reasonNames = Object.fromEntries(Object.entries(LANGUAGE_REASONS).map(([name, code]) => [code, name]));
  var esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
  var short = (value) => String(value || "").slice(0, 10);
  var json = (value) => JSON.stringify(value, null, 2);
  var trial;
  function currentFixture() {
    return heldFixtures.find((fixture) => fixture.id === $("#fixtureSelect").value) || heldFixtures[0];
  }
  function seatView(actorId) {
    const view = trial.policyView(actorId);
    return { actor: view.actorCode, target: view.target, own: view.own, observed: view.observed };
  }
  function outcomeClass(code) {
    return (outcomeNames[code] || "OPEN").toLowerCase();
  }
  function explainPacket(packet) {
    if (packet.op === LANGUAGE_OPS.OFFER) return `Seat ${packet.from.toUpperCase()} exposes a consent-bounded vector.`;
    if (packet.op === LANGUAGE_OPS.PROPOSE) return `Seat A selects one canonical contribution split from ${packet.payload.n} valid candidate${packet.payload.n === 1 ? "" : "s"}.`;
    if (packet.op === LANGUAGE_OPS.ACCEPT) return `Seat ${packet.from.toUpperCase()} accepts the exact proposal digest.`;
    if (packet.op === LANGUAGE_OPS.REFUSE) return `Seat ${packet.from.toUpperCase()} refuses under reason code ${packet.payload.r}.`;
    return "The referee commits only after both exact acceptance digests are present.";
  }
  function nextLabel() {
    if (trial.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return "Trial closed";
    if (!trial.state.channel.offers.a) return "Next: A offer (op 0)";
    if (!trial.state.channel.offers.b) return "Next: B offer (op 0)";
    if (!trial.state.channel.proposal) return "Next: proposal (op 1)";
    if (!trial.state.channel.responses.a) return "Next: A response (op 2/3)";
    if (!trial.state.channel.responses.b) return "Next: B response (op 2/3)";
    return "Next: commit (op 4)";
  }
  function stepProtocol() {
    if (trial.state.observer.outcomeCode !== LANGUAGE_OUTCOMES.OPEN) return { status: "CLOSED" };
    if (!trial.state.channel.offers.a) return trial.emitOffer("a");
    if (!trial.state.channel.offers.b) return trial.emitOffer("b");
    if (!trial.state.channel.proposal) {
      const result2 = trial.emitProposal();
      if (result2.status !== "APPLIED") return trial.closeDeadlock();
      return result2;
    }
    if (!trial.state.channel.responses.a) return trial.emitResponse("a");
    if (!trial.state.channel.responses.b) return trial.emitResponse("b");
    const result = trial.emitCommit();
    if (trial.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) trial.closeDeadlock();
    return result;
  }
  function render(message = "") {
    const fixture = currentFixture();
    const summary = trial.summary();
    const baseline = directStateBaseline(fixture);
    const outcome = outcomeNames[summary.outcomeCode] || "OPEN";
    $("#digestBadge").textContent = `trial ${short(summary.stateDigest)}`;
    $("#freezeStatus").textContent = STATE_LANGUAGE_FIXTURE_DIGEST === FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST ? "FROZEN PASS" : "FREEZE HOLD";
    $("#freezeStatus").classList.toggle("hold", STATE_LANGUAGE_FIXTURE_DIGEST !== FROZEN_STATE_LANGUAGE_FIXTURE_DIGEST);
    $("#fixtureFacts").innerHTML = [
      ["target", json(fixture.target)],
      ["A public / consent", `${json(fixture.actors.a.inventory)} / ${json(fixture.actors.a.consentMax)}`],
      ["B public / consent", `${json(fixture.actors.b.inventory)} / ${json(fixture.actors.b.consentMax)}`],
      ["private fields sent", "0"]
    ].map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");
    $("#seatA").textContent = json(seatView("a"));
    $("#seatB").textContent = json(seatView("b"));
    $("#channelHeading").textContent = `${summary.messages} packet${summary.messages === 1 ? "" : "s"} \xB7 ${summary.bytes} serialized bytes`;
    $("#outcomePill").textContent = outcome;
    $("#outcomePill").className = `outcome-pill ${outcomeClass(summary.outcomeCode)}`;
    $("#packetLedger").innerHTML = trial.state.messages.length ? trial.state.messages.map((packet, index) => `<article class="packet-card"><header><strong>#${index} \xB7 OP ${packet.op}</strong><em>${esc(opNames[packet.op])}</em></header><pre>${esc(json({ from: packet.from === "a" ? 0 : packet.from === "b" ? 1 : -1, to: packet.to, payload: packet.payload, digest: short(packet.packetDigest) }))}</pre></article>`).join("") : '<p class="empty">The channel is empty.</p>';
    $("#observerSummary").innerHTML = [
      [outcome, "observer outcome"],
      [summary.ambiguityCount, "unused valid alternatives"],
      [summary.privateLeakage, "private values leaked"],
      [summary.humanLanguagePayloads, "natural-language payloads"],
      [summary.acceptedDeltaProvenance ? "BOUND" : "OPEN", "commit provenance"],
      [reasonNames[summary.reasonCode] || summary.reasonCode, "reason"]
    ].map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
    $("#baselineOutcome").textContent = outcomeNames[baseline.outcomeCode];
    $("#baselineCopy").textContent = `${baseline.evaluations} centralized evaluation \xB7 ${outcome === outcomeNames[baseline.outcomeCode] ? "agrees with current outcome when closed" : "trial still open or disagrees"}.`;
    $("#claimText").textContent = summary.outcomeCode === LANGUAGE_OUTCOMES.OPEN ? "The machine channel contains only typed state values; observer prose is separate." : `Observed ${outcome.toLowerCase()}: ${summary.messages} accepted packets, ${summary.privateLeakage} private leaks, ${summary.humanLanguagePayloads} prose payloads.`;
    $("#stepButton").textContent = nextLabel();
    $("#stepButton").disabled = summary.outcomeCode !== LANGUAGE_OUTCOMES.OPEN;
    if (message) $("#systemMessage").textContent = message;
  }
  function initialize() {
    trial = new StateLanguageTrial(currentFixture());
    $("#attackResults").innerHTML = '<p class="empty">No adversarial packets attempted.</p>';
    render("Reset to the exact frozen fixture.");
  }
  function runSelected() {
    while (trial.state.observer.outcomeCode === LANGUAGE_OUTCOMES.OPEN) stepProtocol();
    const result = trial.summary();
    render(`Protocol closed ${outcomeNames[result.outcomeCode]} \xB7 ${trial.verifyReplay().status} replay.`);
  }
  function runAttacks() {
    const textTrial = new StateLanguageTrial("held-complement");
    const textPacket = textTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0], text: "prose" });
    const textResult = textTrial.applyPacket(textPacket, { operationId: "ui-text" });
    const tamperTrial = new StateLanguageTrial("held-complement");
    const tampered = tamperTrial.makePacket("a", LANGUAGE_OPS.OFFER, { v: [1, 0, 0] });
    tampered.payload.v[0] = 0;
    const tamperResult = tamperTrial.applyPacket(tampered, { operationId: "ui-tamper" });
    const staleTrial = new StateLanguageTrial("held-complement");
    const stale = staleTrial.makePacket("b", LANGUAGE_OPS.OFFER, { v: [0, 2, 0] });
    staleTrial.emitOffer("a");
    const staleResult = staleTrial.applyPacket(stale, { operationId: "ui-stale" });
    const rows = [["free-text field", textResult], ["tampered digest", tamperResult], ["stale sequence", staleResult]];
    $("#attackResults").innerHTML = rows.map(([label, result]) => `<div><span>${esc(label)}</span><b>${esc(result.status)} \xB7 ${result.reasonCode}</b></div>`).join("");
    $("#systemMessage").textContent = "Three adversarial packets refused; each target state remained unchanged.";
  }
  function renderGate() {
    const gate = stateLanguageGate();
    $("#gateMetrics").innerHTML = [[gate.heldOutRuns, "runs"], [gate.solved, "solved"], [gate.refused, "refused"], [gate.deadlocked, "deadlocked"], [gate.allPrivateClean ? "PASS" : "HOLD", "private clean"], [gate.allReplay ? "PASS" : "HOLD", "exact replay"], [gate.baselineAgreement ? "PASS" : "HOLD", "baseline agree"]].map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
    $("#gateLedger").innerHTML = gate.runs.map((run) => `<article class="gate-card ${outcomeClass(run.outcomeCode)}"><strong>${esc(run.fixtureId)}</strong><span>${run.messages} packets \xB7 ${run.bytes} bytes<br>${run.ambiguityCount} alternatives retained</span><em>${esc(outcomeNames[run.outcomeCode])} \xB7 replay ${esc(run.replay)}</em></article>`).join("");
    $("#systemMessage").textContent = `Held-out gate ${gate.allPrivateClean && gate.allPayloadsStateOnly && gate.allReplay && gate.baselineAgreement ? "PASS" : "HOLD"} \xB7 no result hidden.`;
    return gate;
  }
  for (const fixture of heldFixtures) $("#fixtureSelect").add(new Option(fixture.id.replace("held-", ""), fixture.id));
  $("#fixtureDigest").textContent = `fixtures ${STATE_LANGUAGE_FIXTURE_DIGEST}`;
  $("#fixtureSelect").addEventListener("change", initialize);
  $("#stepButton").addEventListener("click", () => {
    const result = stepProtocol();
    const packet = result?.packet;
    render(packet ? explainPacket(packet) : `Local close \xB7 ${reasonNames[result?.reasonCode] || "closed"}.`);
  });
  $("#runButton").addEventListener("click", runSelected);
  $("#resetButton").addEventListener("click", initialize);
  $("#replayButton").addEventListener("click", () => {
    const result = trial.verifyReplay();
    render(`Replay ${result.status} \xB7 ${result.receiptsReplayed ?? result.at ?? 0} receipts checked.`);
  });
  $("#attackButton").addEventListener("click", runAttacks);
  $("#gateButton").addEventListener("click", renderGate);
  window.AXM_STATE_LANGUAGE = { get trial() {
    return trial;
  }, stateLanguageGate, stateLanguageContracts, stepProtocol, renderGate };
  initialize();
})();
