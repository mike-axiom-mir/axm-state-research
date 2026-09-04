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
      return this.applyPacket(this.prepareOffer(actorId), { operationId: `offer-${actorId}` });
    }
    prepareOffer(actorId) {
      const view = this.policyView(actorId);
      return this.makePacket(actorId, LANGUAGE_OPS.OFFER, { v: vectorMin(view.own.inventory, view.own.consentMax) });
    }
    emitProposal() {
      const prepared = this.prepareProposal();
      return prepared.packet ? this.applyPacket(prepared.packet, { operationId: "proposal" }) : prepared;
    }
    prepareProposal() {
      if (!ACTOR_IDS.every((id) => this.state.channel.offers[id])) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.OFFERS_INCOMPLETE };
      const offers = Object.fromEntries(ACTOR_IDS.map((id) => [id, this.state.channel.offers[id].payload.v]));
      const candidates = enumerateContributions(this.state.task.target, offers);
      if (!candidates.length) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.INSUFFICIENT_OFFER };
      const payload = {
        c: candidates[0],
        n: candidates.length,
        o: ACTOR_IDS.map((id) => this.state.channel.offers[id].packetDigest).sort()
      };
      return { status: "READY", reasonCode: LANGUAGE_REASONS.OK, packet: this.makePacket(ACTOR_IDS[0], LANGUAGE_OPS.PROPOSE, payload) };
    }
    emitResponse(actorId) {
      const prepared = this.prepareResponse(actorId);
      return prepared.packet ? this.applyPacket(prepared.packet, { operationId: `response-${actorId}` }) : prepared;
    }
    prepareResponse(actorId) {
      const proposal = this.state.channel.proposal;
      if (!proposal) return { status: "REFUSED", reasonCode: LANGUAGE_REASONS.PROPOSAL_MISMATCH };
      const contribution = proposal.payload.c[actorId];
      const rejects = contribution.some((value, index) => value > 0 && this.seats[actorId].rejectMask[index] > 0);
      const op = rejects ? LANGUAGE_OPS.REFUSE : LANGUAGE_OPS.ACCEPT;
      const reasonCode = rejects ? LANGUAGE_REASONS.CONSENT_POLICY : LANGUAGE_REASONS.OK;
      return { status: "READY", reasonCode, packet: this.makePacket(actorId, op, { p: proposal.packetDigest, r: reasonCode }) };
    }
    emitCommit() {
      return this.applyPacket(this.prepareCommit(), { operationId: "commit" });
    }
    prepareCommit() {
      const proposal = this.state.channel.proposal;
      const acceptDigests = ACTOR_IDS.map((id) => this.state.channel.responses[id]?.packetDigest).filter(Boolean).sort();
      return this.makePacket(-1, LANGUAGE_OPS.COMMIT, { p: proposal?.packetDigest || digest(null), a: acceptDigests });
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
  var stateLanguageContracts = {
    claim: "bounded deterministic actors can coordinate through typed state packets without a natural-language payload channel",
    packetOps: deepClone(LANGUAGE_OPS),
    dimensions: LANGUAGE_DIMENSIONS,
    authority: { actor: "offer, propose, accept, or refuse within its own public consent vector", referee: "commit only after two exact proposal acceptances" },
    exclusions: ["private machine language", "subjective understanding", "general communication", "network transport", "secure identity", "production multiplayer"]
  };

  // dist/state-transport.js
  var TRANSPORT_FAULTS = Object.freeze({
    PASS: "PASS",
    DROP: "DROP",
    DUPLICATE: "DUPLICATE",
    DELAY: "DELAY",
    EXPIRE: "EXPIRE",
    CORRUPT: "CORRUPT"
  });
  var PASS = Object.freeze({ kind: TRANSPORT_FAULTS.PASS });
  var RAW_TRANSPORT_FIXTURES = [
    { id: "train-clean", split: "training", languageFixtureId: "train-complement", expectedOutcomeCode: 1 },
    {
      id: "train-drop",
      split: "training",
      languageFixtureId: "train-complement",
      expectedOutcomeCode: 1,
      faults: { "offer-a": ["DROP", "PASS"] }
    },
    {
      id: "held-drop-retry",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      faults: { "offer-a": ["DROP", "PASS"] }
    },
    {
      id: "held-duplicate",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      faults: { proposal: ["DUPLICATE"] }
    },
    {
      id: "held-delay",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      faults: { "offer-b": [{ kind: "DELAY", delay: 3 }] }
    },
    {
      id: "held-reorder-stale",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      parallelOffers: true,
      faults: { "offer-a": [{ kind: "DELAY", delay: 2 }, "PASS"], "offer-b": ["PASS"] }
    },
    {
      id: "held-disconnect-recover",
      split: "held_out",
      languageFixtureId: "held-ambiguous",
      expectedOutcomeCode: 1,
      disconnects: [{ start: 1, end: 4 }]
    },
    {
      id: "held-expiry-retry",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      faults: { "response-b": [{ kind: "EXPIRE", delay: 3, ttl: 1 }, "PASS"] }
    },
    {
      id: "held-corrupt-retry",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 1,
      faults: { proposal: ["CORRUPT", "PASS"] }
    },
    {
      id: "held-consent-refusal",
      split: "held_out",
      languageFixtureId: "held-refusal",
      expectedOutcomeCode: 2,
      faults: { "offer-a": ["DUPLICATE"] }
    },
    { id: "held-insufficient", split: "held_out", languageFixtureId: "held-insufficient", expectedOutcomeCode: 3 },
    {
      id: "held-loss-exhaustion",
      split: "held_out",
      languageFixtureId: "held-complement",
      expectedOutcomeCode: 3,
      maxAttempts: 3,
      faults: { "offer-a": ["DROP", "DROP", "DROP"] }
    }
  ];
  var STATE_TRANSPORT_FIXTURES = deepClone(RAW_TRANSPORT_FIXTURES);
  var STATE_TRANSPORT_FIXTURE_DIGEST = digest(STATE_TRANSPORT_FIXTURES);
  var FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST = "937ea582ce4576bdff15db1afebbece7c9f11e2b138860d66cfcbc381f948079";
  var encoder3 = new TextEncoder();
  var normalizeFault = (fault) => typeof fault === "string" ? { kind: fault } : deepClone(fault || PASS);
  var bytesOf = (value) => encoder3.encode(canonicalStringify(value)).length;
  function fixtureById2(id) {
    const fixture = STATE_TRANSPORT_FIXTURES.find((candidate) => candidate.id === id);
    if (!fixture) throw new Error(`UNKNOWN_TRANSPORT_FIXTURE:${id}`);
    return deepClone(fixture);
  }
  function eventRecord(index, tick, type, data = {}) {
    const event = { index, tick, type, ...deepClone(data) };
    event.eventId = digest(event);
    return event;
  }
  var _HostileTransportTrial_instances, record_fn, checkpoint_fn, onlineAt_fn, recover_fn, faultFor_fn, pending_fn, prepare_fn, enqueue_fn, requiredKeys_fn, plan_fn, deliverCopy_fn, deliver_fn, evidence_fn;
  var _HostileTransportTrial = class _HostileTransportTrial {
    constructor(fixtureOrId = "train-clean") {
      __privateAdd(this, _HostileTransportTrial_instances);
      this.fixture = typeof fixtureOrId === "string" ? fixtureById2(fixtureOrId) : deepClone(fixtureOrId);
      this.engine = new StateLanguageTrial(this.fixture.languageFixtureId);
      this.initialSourceDigests = deepClone(this.engine.sourceDigests);
      this.tick = 0;
      this.online = true;
      this.queue = [];
      this.ledger = [];
      this.attempts = {};
      this.deliveredDigests = /* @__PURE__ */ new Set();
      this.sendIndex = 0;
      this.maxDeliveredSendIndex = -1;
      this.latestCheckpoint = null;
      this.terminalReason = null;
      this.maxAttempts = this.fixture.maxAttempts ?? 3;
      this.maxTicks = this.fixture.maxTicks ?? 48;
      this.defaultTtl = this.fixture.defaultTtl ?? 6;
      __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
    }
    get outcomeCode() {
      return this.engine.state.observer.outcomeCode;
    }
    get closed() {
      return this.outcomeCode !== LANGUAGE_OUTCOMES.OPEN;
    }
    tickOnce() {
      if (this.closed) return this.summary();
      const nowOnline = __privateMethod(this, _HostileTransportTrial_instances, onlineAt_fn).call(this, this.tick);
      if (nowOnline !== this.online) {
        this.online = nowOnline;
        if (!nowOnline) {
          __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
          __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "DISCONNECT", { checkpointDigest: this.latestCheckpoint.checkpointDigest });
        } else {
          __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "RECONNECT", { queued: this.queue.filter((item) => item.status === "QUEUED").length });
          __privateMethod(this, _HostileTransportTrial_instances, recover_fn).call(this);
        }
      }
      if (this.online && !this.closed) {
        __privateMethod(this, _HostileTransportTrial_instances, plan_fn).call(this);
        if (!this.closed) __privateMethod(this, _HostileTransportTrial_instances, deliver_fn).call(this);
      }
      this.tick += 1;
      if (!this.closed && this.tick >= this.maxTicks) {
        this.terminalReason = "TRANSPORT_TICK_LIMIT";
        const result = this.engine.closeDeadlock({ operationId: "transport-tick-limit" });
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "TICK_LIMIT", { maxTicks: this.maxTicks, receiptId: result.receiptId });
        __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
      }
      return this.summary();
    }
    run() {
      while (!this.closed && this.tick < this.maxTicks) this.tickOnce();
      return this.summary();
    }
    summary() {
      const language = this.engine.summary();
      const count = (type) => this.ledger.filter((event) => event.type === type).length;
      const mutationSafe = (type) => this.ledger.filter((event) => event.type === type).every((event) => event.engineDigestBefore === event.engineDigestAfter);
      return {
        fixtureId: this.fixture.id,
        split: this.fixture.split,
        languageFixtureId: this.fixture.languageFixtureId,
        outcomeCode: this.outcomeCode,
        expectedOutcomeCode: this.fixture.expectedOutcomeCode,
        baselineOutcomeCode: directStateBaseline(this.fixture.languageFixtureId).outcomeCode,
        outcomeMatchesExpected: this.outcomeCode === this.fixture.expectedOutcomeCode,
        terminalReason: this.terminalReason,
        ticks: this.tick,
        attempts: count("SEND"),
        acceptedPackets: language.messages,
        transmittedBytes: this.ledger.filter((event) => event.type === "SEND").reduce((sum, event) => sum + event.bytes, 0),
        acceptedBytes: language.bytes,
        drops: count("DROP"),
        duplicatesSuppressed: count("DUPLICATE_SUPPRESSED"),
        delayed: this.queue.filter((envelope) => envelope.deliverTick > envelope.sentTick && envelope.faultKind === TRANSPORT_FAULTS.DELAY).length,
        expired: count("EXPIRED"),
        reorders: count("REORDER"),
        disconnects: count("DISCONNECT"),
        recoveryPasses: count("RECOVERY_PASS"),
        recoveryFailures: count("RECOVERY_FAIL"),
        staleRefusals: this.ledger.filter((event) => event.type === "DELIVER_REFUSED" && [LANGUAGE_REASONS.STALE_SEQUENCE, LANGUAGE_REASONS.STALE_STATE].includes(event.reasonCode)).length,
        tamperRefusals: this.ledger.filter((event) => event.type === "DELIVER_REFUSED" && event.reasonCode === LANGUAGE_REASONS.PACKET_DIGEST).length,
        duplicateNoEffect: mutationSafe("DUPLICATE_SUPPRESSED"),
        expiredNoEffect: mutationSafe("EXPIRED"),
        sourcesUnchanged: canonicalStringify(this.initialSourceDigests) === canonicalStringify(this.engine.sourceDigests),
        privateLeakage: language.privateLeakage,
        humanLanguagePayloads: language.humanLanguagePayloads,
        acceptedDeltaProvenance: language.acceptedDeltaProvenance,
        engineReplay: this.engine.verifyReplay().status,
        transportDigest: digest(__privateMethod(this, _HostileTransportTrial_instances, evidence_fn).call(this))
      };
    }
    verifyReplay() {
      const expected = this.summary();
      const replay = new _HostileTransportTrial(this.fixture);
      while (replay.tick < this.tick && !replay.closed) replay.tickOnce();
      const actual = replay.summary();
      return {
        status: actual.transportDigest === expected.transportDigest ? "PASS" : "FAIL",
        expected: expected.transportDigest,
        actual: actual.transportDigest,
        ticksReplayed: replay.tick,
        engineReplay: actual.engineReplay
      };
    }
  };
  _HostileTransportTrial_instances = new WeakSet();
  record_fn = function(type, data = {}) {
    const event = eventRecord(this.ledger.length, this.tick, type, data);
    this.ledger.push(event);
    return event;
  };
  checkpoint_fn = function() {
    const value = {
      schema: "axm.stateborn.transport-checkpoint/v1",
      fixtureId: this.fixture.id,
      engineStateDigest: this.engine.stateDigest,
      engineReceiptIds: this.engine.receipts.map((receipt2) => receipt2.receiptId),
      deliveredDigests: [...this.deliveredDigests].sort(),
      sourceDigests: this.engine.sourceDigests
    };
    value.checkpointDigest = digest(value);
    this.latestCheckpoint = deepClone(value);
    return value;
  };
  onlineAt_fn = function(tick) {
    return !(this.fixture.disconnects || []).some((window2) => tick >= window2.start && tick < window2.end);
  };
  recover_fn = function() {
    const checkpoint = deepClone(this.latestCheckpoint);
    const sealed = checkpoint.checkpointDigest;
    delete checkpoint.checkpointDigest;
    if (digest(checkpoint) !== sealed) {
      this.terminalReason = "CHECKPOINT_DIGEST";
      this.engine.closeDeadlock({ operationId: `transport-checkpoint-fail-${this.tick}` });
      __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "RECOVERY_FAIL", { reason: this.terminalReason });
      return false;
    }
    const recovered = new StateLanguageTrial(this.fixture.languageFixtureId);
    for (const expected of this.engine.receipts) {
      const actual = expected.kind === "CLOSE" ? recovered.closeDeadlock({ operationId: expected.operationId }) : recovered.applyPacket(expected.packet, { operationId: expected.operationId });
      if (actual.receiptId !== expected.receiptId) {
        this.terminalReason = "CHECKPOINT_REPLAY";
        this.engine.closeDeadlock({ operationId: `transport-replay-fail-${this.tick}` });
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "RECOVERY_FAIL", { reason: this.terminalReason, at: expected.index });
        return false;
      }
    }
    if (recovered.stateDigest !== this.engine.stateDigest || canonicalStringify(recovered.sourceDigests) !== canonicalStringify(checkpoint.sourceDigests)) {
      this.terminalReason = "CHECKPOINT_STATE";
      this.engine.closeDeadlock({ operationId: `transport-state-fail-${this.tick}` });
      __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "RECOVERY_FAIL", { reason: this.terminalReason });
      return false;
    }
    this.engine = recovered;
    this.deliveredDigests = new Set(checkpoint.deliveredDigests);
    __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "RECOVERY_PASS", { checkpointDigest: sealed, receipts: recovered.receipts.length });
    return true;
  };
  faultFor_fn = function(logicalKey, attempt) {
    const faults = this.fixture.faults?.[logicalKey] || [];
    return normalizeFault(faults[attempt - 1] || PASS);
  };
  pending_fn = function(logicalKey) {
    return this.queue.some((envelope) => envelope.logicalKey === logicalKey && envelope.status === "QUEUED");
  };
  prepare_fn = function(logicalKey) {
    if (logicalKey === "offer-a") return { status: "READY", packet: this.engine.prepareOffer("a") };
    if (logicalKey === "offer-b") return { status: "READY", packet: this.engine.prepareOffer("b") };
    if (logicalKey === "proposal") return this.engine.prepareProposal();
    if (logicalKey === "response-a") return this.engine.prepareResponse("a");
    if (logicalKey === "response-b") return this.engine.prepareResponse("b");
    if (logicalKey === "commit") return { status: "READY", packet: this.engine.prepareCommit() };
    throw new Error(`UNKNOWN_LOGICAL_KEY:${logicalKey}`);
  };
  enqueue_fn = function(logicalKey) {
    const attempt = (this.attempts[logicalKey] || 0) + 1;
    this.attempts[logicalKey] = attempt;
    const prepared = __privateMethod(this, _HostileTransportTrial_instances, prepare_fn).call(this, logicalKey);
    if (!prepared.packet) {
      if (prepared.reasonCode === LANGUAGE_REASONS.INSUFFICIENT_OFFER) {
        this.terminalReason = "STATE_INSUFFICIENT";
        const result = this.engine.closeDeadlock({ operationId: `transport-state-deadlock-${this.tick}` });
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "LOCAL_DEADLOCK", { logicalKey, reasonCode: prepared.reasonCode, receiptId: result.receiptId });
        __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
      }
      return null;
    }
    const fault = __privateMethod(this, _HostileTransportTrial_instances, faultFor_fn).call(this, logicalKey, attempt);
    const delay = fault.delay ?? 0;
    const ttl = fault.ttl ?? this.defaultTtl;
    const packet = deepClone(prepared.packet);
    if (fault.kind === TRANSPORT_FAULTS.CORRUPT) packet.payload = { ...packet.payload, x: 1 };
    const envelope = {
      schema: "axm.stateborn.transport-envelope/v1",
      logicalKey,
      attempt,
      sendIndex: this.sendIndex,
      sentTick: this.tick,
      deliverTick: this.tick + delay,
      expiresTick: this.tick + ttl,
      copies: fault.kind === TRANSPORT_FAULTS.DUPLICATE ? 2 : 1,
      faultKind: fault.kind,
      packet,
      status: "QUEUED"
    };
    envelope.envelopeId = digest(envelope);
    this.sendIndex += 1;
    __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "SEND", {
      envelopeId: envelope.envelopeId,
      logicalKey,
      attempt,
      packetDigest: packet.packetDigest,
      faultKind: fault.kind,
      bytes: bytesOf(packet) * envelope.copies
    });
    if (fault.kind === TRANSPORT_FAULTS.DROP) {
      envelope.status = "DROPPED";
      __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "DROP", {
        envelopeId: envelope.envelopeId,
        logicalKey,
        attempt,
        engineDigestBefore: this.engine.stateDigest,
        engineDigestAfter: this.engine.stateDigest
      });
    } else {
      this.queue.push(envelope);
    }
    return envelope;
  };
  requiredKeys_fn = function() {
    const channel = this.engine.state.channel;
    if (!channel.offers.a || !channel.offers.b) {
      const missing = ["a", "b"].filter((id) => !channel.offers[id]).map((id) => `offer-${id}`);
      return this.fixture.parallelOffers ? missing : missing.slice(0, 1);
    }
    if (!channel.proposal) return ["proposal"];
    if (!channel.responses.a) return ["response-a"];
    if (!channel.responses.b) return ["response-b"];
    return ["commit"];
  };
  plan_fn = function() {
    for (const logicalKey of __privateMethod(this, _HostileTransportTrial_instances, requiredKeys_fn).call(this)) {
      if (__privateMethod(this, _HostileTransportTrial_instances, pending_fn).call(this, logicalKey)) continue;
      if ((this.attempts[logicalKey] || 0) >= this.maxAttempts) {
        this.terminalReason = "TRANSPORT_ATTEMPTS_EXHAUSTED";
        const result = this.engine.closeDeadlock({ operationId: `transport-exhausted-${logicalKey}` });
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "ATTEMPTS_EXHAUSTED", { logicalKey, attempts: this.attempts[logicalKey], receiptId: result.receiptId });
        __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
        return;
      }
      __privateMethod(this, _HostileTransportTrial_instances, enqueue_fn).call(this, logicalKey);
      if (this.closed) return;
    }
  };
  deliverCopy_fn = function(envelope, copy) {
    const before = this.engine.stateDigest;
    if (this.deliveredDigests.has(envelope.packet.packetDigest)) {
      __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "DUPLICATE_SUPPRESSED", {
        envelopeId: envelope.envelopeId,
        logicalKey: envelope.logicalKey,
        copy,
        packetDigest: envelope.packet.packetDigest,
        engineDigestBefore: before,
        engineDigestAfter: before
      });
      return;
    }
    const result = this.engine.applyPacket(envelope.packet, { operationId: `transport-${envelope.envelopeId}` });
    if (result.status === "APPLIED") this.deliveredDigests.add(envelope.packet.packetDigest);
    __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, result.status === "APPLIED" ? "DELIVER_APPLIED" : "DELIVER_REFUSED", {
      envelopeId: envelope.envelopeId,
      logicalKey: envelope.logicalKey,
      copy,
      packetDigest: envelope.packet.packetDigest,
      receiptId: result.receiptId,
      reasonCode: result.reasonCode,
      engineDigestBefore: before,
      engineDigestAfter: this.engine.stateDigest
    });
    __privateMethod(this, _HostileTransportTrial_instances, checkpoint_fn).call(this);
  };
  deliver_fn = function() {
    const due = this.queue.filter((envelope) => envelope.status === "QUEUED" && envelope.deliverTick <= this.tick).sort((left, right) => left.deliverTick - right.deliverTick || left.sendIndex - right.sendIndex);
    for (const envelope of due) {
      if (envelope.sendIndex < this.maxDeliveredSendIndex) {
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "REORDER", {
          envelopeId: envelope.envelopeId,
          logicalKey: envelope.logicalKey,
          sendIndex: envelope.sendIndex,
          priorMaximum: this.maxDeliveredSendIndex
        });
      }
      this.maxDeliveredSendIndex = Math.max(this.maxDeliveredSendIndex, envelope.sendIndex);
      if (this.tick > envelope.expiresTick) {
        envelope.status = "EXPIRED";
        const same = this.engine.stateDigest;
        __privateMethod(this, _HostileTransportTrial_instances, record_fn).call(this, "EXPIRED", {
          envelopeId: envelope.envelopeId,
          logicalKey: envelope.logicalKey,
          packetDigest: envelope.packet.packetDigest,
          engineDigestBefore: same,
          engineDigestAfter: same
        });
        continue;
      }
      envelope.status = "DELIVERED";
      for (let copy = 0; copy < envelope.copies; copy += 1) __privateMethod(this, _HostileTransportTrial_instances, deliverCopy_fn).call(this, envelope, copy);
      if (this.closed) break;
    }
  };
  evidence_fn = function() {
    return {
      fixtureId: this.fixture.id,
      tick: this.tick,
      online: this.online,
      attempts: deepClone(this.attempts),
      queue: deepClone(this.queue),
      ledger: deepClone(this.ledger),
      terminalReason: this.terminalReason,
      engineStateDigest: this.engine.stateDigest,
      engineReceiptIds: this.engine.receipts.map((receipt2) => receipt2.receiptId),
      normalizedOutcomeDigest: this.engine.normalizedOutcomeDigest(),
      sourceDigests: this.engine.sourceDigests
    };
  };
  var HostileTransportTrial = _HostileTransportTrial;
  function stateTransportGate(fixtures2 = STATE_TRANSPORT_FIXTURES.filter((fixture) => fixture.split === "held_out")) {
    const runs = fixtures2.map((fixture) => {
      const trial2 = new HostileTransportTrial(fixture);
      const result = trial2.run();
      return { ...result, replay: trial2.verifyReplay().status };
    });
    return {
      schema: "axm.stateborn.hostile-transport-gate/v1",
      fixtureDigest: STATE_TRANSPORT_FIXTURE_DIGEST,
      frozenFixtureDigest: FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST,
      freezeValid: STATE_TRANSPORT_FIXTURE_DIGEST === FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST,
      heldOutRuns: runs.length,
      solved: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED).length,
      refused: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.REFUSED).length,
      deadlocked: runs.filter((run) => run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK).length,
      totalAttempts: runs.reduce((sum, run) => sum + run.attempts, 0),
      totalAcceptedPackets: runs.reduce((sum, run) => sum + run.acceptedPackets, 0),
      totalTransmittedBytes: runs.reduce((sum, run) => sum + run.transmittedBytes, 0),
      totalDrops: runs.reduce((sum, run) => sum + run.drops, 0),
      totalDuplicatesSuppressed: runs.reduce((sum, run) => sum + run.duplicatesSuppressed, 0),
      totalExpired: runs.reduce((sum, run) => sum + run.expired, 0),
      totalReorders: runs.reduce((sum, run) => sum + run.reorders, 0),
      totalDisconnects: runs.reduce((sum, run) => sum + run.disconnects, 0),
      totalRecoveryPasses: runs.reduce((sum, run) => sum + run.recoveryPasses, 0),
      allExpectedOutcomes: runs.every((run) => run.outcomeMatchesExpected),
      allReplay: runs.every((run) => run.replay === "PASS" && run.engineReplay === "PASS"),
      allSourcesUnchanged: runs.every((run) => run.sourcesUnchanged),
      allConsentBound: runs.every((run) => run.acceptedDeltaProvenance),
      allPrivateClean: runs.every((run) => run.privateLeakage === 0),
      allPayloadsStateOnly: runs.every((run) => run.humanLanguagePayloads === 0),
      allDuplicatesNoEffect: runs.every((run) => run.duplicateNoEffect),
      allExpiredNoEffect: runs.every((run) => run.expiredNoEffect),
      interruptedRecoverySolved: runs.some((run) => run.disconnects > 0 && run.recoveryPasses > 0 && run.outcomeCode === LANGUAGE_OUTCOMES.SOLVED),
      retainedTransportFailure: runs.some((run) => run.baselineOutcomeCode === LANGUAGE_OUTCOMES.SOLVED && run.outcomeCode === LANGUAGE_OUTCOMES.DEADLOCK),
      runs
    };
  }
  var stateTransportContracts = {
    claim: "the v0.6 typed packets can preserve bounded consent and recovery under frozen simulated transport faults",
    faults: deepClone(TRANSPORT_FAULTS),
    exclusions: [
      "real networking",
      "cryptographic identity",
      "hostile Internet safety",
      "production multiplayer",
      "human-state movement",
      "private machine language",
      "subjective understanding"
    ]
  };

  // dist/transport-app.js
  var $ = (selector) => document.querySelector(selector);
  var fixtures = STATE_TRANSPORT_FIXTURES.filter((fixture) => fixture.split === "held_out");
  var outcomeNames = Object.fromEntries(Object.entries(LANGUAGE_OUTCOMES).map(([name, code]) => [code, name]));
  var opNames = Object.fromEntries(Object.entries(LANGUAGE_OPS).map(([name, code]) => [code, name]));
  var esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
  var short = (value) => String(value || "").slice(0, 11);
  var trial;
  function currentFixture() {
    return fixtures.find((fixture) => fixture.id === $("#fixtureSelect").value) || fixtures[0];
  }
  function faultSummary(fixture) {
    const faults = Object.entries(fixture.faults || {}).flatMap(([key, values]) => values.map((value) => `${key}:${typeof value === "string" ? value : value.kind}`));
    const disconnects = (fixture.disconnects || []).map((window2) => `offline ${window2.start}\u2013${window2.end}`);
    return [...faults, ...disconnects].join(", ") || "none";
  }
  function outcomeClass(code) {
    return (outcomeNames[code] || "OPEN").toLowerCase();
  }
  function render(message = "") {
    const fixture = currentFixture();
    const result = trial.summary();
    const outcome = outcomeNames[result.outcomeCode];
    $("#freezeStatus").textContent = STATE_TRANSPORT_FIXTURE_DIGEST === FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST ? "FROZEN PASS" : "FREEZE HOLD";
    $("#freezeStatus").classList.toggle("hold", STATE_TRANSPORT_FIXTURE_DIGEST !== FROZEN_STATE_TRANSPORT_FIXTURE_DIGEST);
    $("#digestBadge").textContent = `transport ${short(result.transportDigest)}`;
    $("#fixtureFacts").innerHTML = [["base state task", fixture.languageFixtureId], ["fault plan", faultSummary(fixture)], ["attempt limit", fixture.maxAttempts ?? 3], ["expected close", outcomeNames[fixture.expectedOutcomeCode]]].map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("");
    $("#networkHeading").textContent = `Tick ${result.ticks} \xB7 ${result.attempts} sends \xB7 ${result.acceptedPackets} accepted`;
    $("#connectionPill").textContent = trial.online ? "ONLINE" : "OFFLINE";
    $("#connectionPill").className = `connection-pill ${trial.online ? "online" : "offline"}`;
    $("#seatARevision").textContent = `source ${short(trial.engine.sourceDigests.a)}`;
    $("#seatBRevision").textContent = `source ${short(trial.engine.sourceDigests.b)}`;
    const queued = trial.queue.filter((envelope) => envelope.status === "QUEUED");
    $("#queueCount").textContent = `${queued.length} queued`;
    $("#queueLedger").innerHTML = queued.length ? queued.map((envelope) => `<article class="queue-card"><strong>${esc(envelope.logicalKey)} \xB7 #${envelope.attempt}</strong><span>deliver ${envelope.deliverTick} \xB7 expire ${envelope.expiresTick}<br>${esc(envelope.faultKind)}</span></article>`).join("") : '<p class="empty">No packet is in flight.</p>';
    $("#eventCount").textContent = `${trial.ledger.length} events`;
    $("#eventLedger").innerHTML = trial.ledger.length ? [...trial.ledger].reverse().slice(0, 20).map((event) => `<article class="event-card ${event.type.toLowerCase()}"><strong>${esc(event.type)}</strong><span>tick ${event.tick} \xB7 ${esc(event.logicalKey || "transport")}</span><em>${esc(short(event.eventId))}</em></article>`).join("") : '<p class="empty">Advance a tick to emit the first packet.</p>';
    $("#outcomePill").textContent = outcome;
    $("#outcomePill").className = `outcome-pill ${outcomeClass(result.outcomeCode)}`;
    $("#resultMetrics").innerHTML = [[result.attempts, "send attempts"], [result.transmittedBytes, "wire bytes"], [result.drops, "drops"], [result.duplicatesSuppressed, "duplicates blocked"], [result.expired, "expired"], [result.staleRefusals + result.tamperRefusals, "packet refusals"], [result.recoveryPasses, "recoveries"], [result.sourcesUnchanged ? "YES" : "NO", "sources unchanged"]].map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
    $("#checkpointDigest").textContent = trial.latestCheckpoint?.checkpointDigest || "\u2014";
    $("#checkpointCopy").textContent = result.recoveryPasses ? `${result.recoveryPasses} reconnect rebuilt and verified the packet engine.` : "The latest engine state remains sealed for a possible reconnect.";
    $("#acceptedPackets").innerHTML = trial.engine.state.messages.length ? trial.engine.state.messages.map((packet, index) => `<span class="packet-chip">#${index} \xB7 ${esc(opNames[packet.op])}</span>`).join("") : '<p class="empty">No packet accepted.</p>';
    $("#tickButton").disabled = trial.closed;
    $("#tickButton").textContent = trial.closed ? "Route closed" : "Advance one tick";
    $("#claimText").textContent = trial.closed ? `${outcome}: ${result.acceptedPackets} packets accepted, ${result.drops} dropped, ${result.duplicatesSuppressed} duplicate effects blocked, sources unchanged ${result.sourcesUnchanged}.` : "The simulator may damage delivery, never the source or consent rules.";
    if (message) $("#systemMessage").textContent = message;
  }
  function initialize() {
    trial = new HostileTransportTrial(currentFixture());
    render("Reset to the exact frozen route.");
  }
  function runSelected() {
    const result = trial.run();
    render(`Route ${outcomeNames[result.outcomeCode]} \xB7 ${trial.verifyReplay().status} replay \xB7 ${result.terminalReason || "protocol closed normally"}.`);
  }
  function runGate() {
    const gate = stateTransportGate();
    $("#gateMetrics").innerHTML = [[gate.heldOutRuns, "routes"], [gate.solved, "solved"], [gate.refused, "refused"], [gate.deadlocked, "deadlocked"], [gate.totalDrops, "drops"], [gate.totalDuplicatesSuppressed, "dups blocked"], [gate.totalExpired, "expired"], [gate.totalRecoveryPasses, "recoveries"]].map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
    $("#gateLedger").innerHTML = gate.runs.map((run) => `<article class="gate-card ${outcomeClass(run.outcomeCode)}"><strong>${esc(run.fixtureId.replace("held-", ""))}</strong><span>${run.attempts} sends \xB7 ${run.acceptedPackets} accepted<br>${run.transmittedBytes} wire bytes \xB7 ${run.ticks} ticks</span><em>${esc(outcomeNames[run.outcomeCode])} \xB7 replay ${esc(run.replay)}</em></article>`).join("");
    $("#systemMessage").textContent = `Fault matrix ${gate.allExpectedOutcomes && gate.allReplay && gate.allSourcesUnchanged ? "PASS" : "HOLD"} \xB7 the repeated-loss deadlock remains in the result.`;
    return gate;
  }
  for (const fixture of fixtures) $("#fixtureSelect").add(new Option(fixture.id.replace("held-", ""), fixture.id));
  $("#fixtureDigest").textContent = `fixtures ${STATE_TRANSPORT_FIXTURE_DIGEST}`;
  $("#fixtureSelect").addEventListener("change", initialize);
  $("#tickButton").addEventListener("click", () => {
    trial.tickOnce();
    render(`Tick ${trial.tick} committed to the transport receipt chain.`);
  });
  $("#runButton").addEventListener("click", runSelected);
  $("#resetButton").addEventListener("click", initialize);
  $("#replayButton").addEventListener("click", () => {
    const result = trial.verifyReplay();
    render(`Transport replay ${result.status} \xB7 ${result.ticksReplayed} ticks \xB7 engine ${result.engineReplay}.`);
  });
  $("#gateButton").addEventListener("click", runGate);
  window.AXM_STATE_TRANSPORT = { get trial() {
    return trial;
  }, stateTransportGate, stateTransportContracts, runGate };
  initialize();
})();
