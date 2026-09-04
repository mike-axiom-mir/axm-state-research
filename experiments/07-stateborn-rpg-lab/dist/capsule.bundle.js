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
  var GENERATOR_VERSION = "axm.stateborn.field/v2";
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

  // dist/capsule-world.js
  var ALLOWED_EXPORT_PATHS = ["public.displayName", "public.color", "public.position", "public.signalCount"];
  var ALLOWED_RETURN_PATHS = ["accepted.sharedSignals", "accepted.visitedCells"];
  var DIRECTIONS = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 }
  };
  function uniqueSorted(values) {
    return [...new Set(values)].sort();
  }
  function packetPayload(packet) {
    const payload = deepClone(packet);
    delete payload.packetDigest;
    return payload;
  }
  function capsulePayload(capsule) {
    const payload = deepClone(capsule);
    delete payload.capsuleDigest;
    return payload;
  }
  function refusedReceipt(schema, sequence, operationId, reason, beforeRevision, beforeDigest, extra = {}) {
    const receipt = {
      schema,
      sequence,
      operationId,
      status: "REFUSED",
      reason,
      beforeRevision,
      afterRevision: beforeRevision,
      beforeDigest,
      afterDigest: beforeDigest,
      changedPaths: [],
      ...extra
    };
    receipt.receiptId = digest(receipt);
    return receipt;
  }
  function verifyCapsule(capsule) {
    if (!capsule || capsule.schema !== "axm.stateborn.actor-capsule/v1") return { status: "REFUSED", reason: "CAPSULE_SCHEMA" };
    if (digest(capsulePayload(capsule)) !== capsule.capsuleDigest) return { status: "REFUSED", reason: "CAPSULE_DIGEST" };
    const exportPaths = capsule.consent?.exportPaths || [];
    const returnPaths = capsule.consent?.returnPaths || [];
    if (exportPaths.some((path) => !ALLOWED_EXPORT_PATHS.includes(path))) return { status: "REFUSED", reason: "CAPSULE_EXPORT_SCOPE" };
    if (returnPaths.some((path) => !ALLOWED_RETURN_PATHS.includes(path))) return { status: "REFUSED", reason: "CAPSULE_RETURN_SCOPE" };
    if (Object.keys(capsule.projection || {}).some((path) => !exportPaths.includes(path))) return { status: "REFUSED", reason: "CAPSULE_PROJECTION_SCOPE" };
    return { status: "PASS", reason: "CAPSULE_VALID" };
  }
  function verifyReturnPacket(packet) {
    if (!packet || packet.schema !== "axm.stateborn.return-packet/v1") return { status: "REFUSED", reason: "RETURN_SCHEMA" };
    if (digest(packetPayload(packet)) !== packet.packetDigest) return { status: "REFUSED", reason: "RETURN_DIGEST" };
    if ((packet.deltas || []).some((delta) => !ALLOWED_RETURN_PATHS.includes(delta.path) || delta.operation !== "append_unique" || !Array.isArray(delta.values))) {
      return { status: "REFUSED", reason: "RETURN_DELTA_SCOPE" };
    }
    return { status: "PASS", reason: "RETURN_VALID" };
  }
  var ActorStateOwner = class {
    constructor({ seed = "AXM-CAPSULE-SOURCE", ownerId = "source-a", displayName = "Aster", color = "amber", position = { x: 3, y: 3 } } = {}) {
      this.options = { seed, ownerId, displayName, color, position: deepClone(position) };
      this.genesis = {
        schema: "axm.stateborn.actor-source/v1",
        seed,
        ownerId,
        meta: { revision: 0 },
        public: { displayName, color, position: deepClone(position), signalCount: 0 },
        accepted: { sharedSignals: [], visitedCells: [] },
        private: { localNote: `${seed}:PRIVATE_NOTE`, recoveryToken: digest(`${seed}:RECOVERY`) }
      };
      this.state = deepClone(this.genesis);
      this.receipts = [];
      this.operations = /* @__PURE__ */ new Map();
    }
    get stateDigest() {
      return digest(this.state);
    }
    issueCapsule({ exportPaths = ALLOWED_EXPORT_PATHS, returnPaths = ALLOWED_RETURN_PATHS, operationId } = {}) {
      const resolvedId = operationId || `issue-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeDigest = this.stateDigest;
      const invalidExport = exportPaths.find((path) => !ALLOWED_EXPORT_PATHS.includes(path));
      const invalidReturn = returnPaths.find((path) => !ALLOWED_RETURN_PATHS.includes(path));
      if (invalidExport || invalidReturn) {
        const refused = refusedReceipt(
          "axm.stateborn.source-receipt/v1",
          this.receipts.length,
          resolvedId,
          invalidExport ? `EXPORT_NOT_CONSENTABLE:${invalidExport}` : `RETURN_NOT_CONSENTABLE:${invalidReturn}`,
          this.state.meta.revision,
          beforeDigest,
          { kind: "ISSUE_CAPSULE", capsule: null }
        );
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const consent = { exportPaths: uniqueSorted(exportPaths), returnPaths: uniqueSorted(returnPaths) };
      const projection = Object.fromEntries(consent.exportPaths.map((path) => [path, deepClone(getPath(this.state, path))]));
      const capsule = {
        schema: "axm.stateborn.actor-capsule/v1",
        ownerId: this.state.ownerId,
        sourceRevision: this.state.meta.revision,
        sourceStateDigest: beforeDigest,
        issuedSequence: this.receipts.length,
        consent,
        projection
      };
      capsule.capsuleId = digest({ ownerId: capsule.ownerId, sourceStateDigest: capsule.sourceStateDigest, consent: capsule.consent });
      capsule.capsuleDigest = digest(capsulePayload(capsule));
      const receipt = {
        schema: "axm.stateborn.source-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedId,
        kind: "ISSUE_CAPSULE",
        status: "APPLIED",
        reason: "CONSENTED_PROJECTION_ONLY",
        beforeRevision: this.state.meta.revision,
        afterRevision: this.state.meta.revision,
        beforeDigest,
        afterDigest: beforeDigest,
        capsule,
        changedPaths: []
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedId, receipt);
      return deepClone(receipt);
    }
    applyReturn(packet, { acceptedPaths = [], operationId, expectedRevision } = {}) {
      const resolvedId = operationId || `return-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      const validity = verifyReturnPacket(packet);
      let reason = validity.status === "PASS" ? null : validity.reason;
      if (!reason && expectedRevision !== void 0 && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
      if (!reason && packet.ownerId !== this.state.ownerId) reason = "RETURN_OWNER_MISMATCH";
      if (!reason && packet.baseSourceDigest !== beforeDigest) reason = "RETURN_SOURCE_STALE";
      if (!reason && acceptedPaths.some((path) => !packet.consentReturnPaths.includes(path))) reason = "ACCEPT_PATH_NOT_CONSENTED";
      if (!reason && packet.deltas.some((delta) => !packet.consentReturnPaths.includes(delta.path))) reason = "PACKET_PATH_NOT_CONSENTED";
      if (reason) {
        const refused = refusedReceipt(
          "axm.stateborn.source-receipt/v1",
          this.receipts.length,
          resolvedId,
          reason,
          beforeRevision,
          beforeDigest,
          { kind: "APPLY_RETURN", packetDigest: packet?.packetDigest || null, acceptedPaths: deepClone(acceptedPaths) }
        );
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      const changedPaths = [];
      const accepted = uniqueSorted(acceptedPaths);
      for (const delta of packet.deltas.filter((candidate) => accepted.includes(candidate.path))) {
        const current = getPath(draft, delta.path);
        const next = uniqueSorted([...current, ...delta.values]);
        if (canonicalStringify(current) !== canonicalStringify(next)) {
          const [root, key] = delta.path.split(".");
          draft[root][key] = next;
          changedPaths.push(delta.path);
        }
      }
      if (changedPaths.length) draft.meta.revision += 1;
      this.state = draft;
      const receipt = {
        schema: "axm.stateborn.source-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedId,
        kind: "APPLY_RETURN",
        status: "APPLIED",
        reason: changedPaths.length ? "EXPLICIT_PATH_ACCEPTANCE" : "ACCEPTED_NO_DELTA",
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        packetDigest: packet.packetDigest,
        acceptedPaths: accepted,
        ignoredPaths: packet.deltas.map((delta) => delta.path).filter((path) => !accepted.includes(path)),
        changedPaths
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedId, receipt);
      return deepClone(receipt);
    }
  };
  function sessionThreads(state) {
    const signals = state.events.filter((event) => event.intent.kind === "signal");
    const groups = /* @__PURE__ */ new Map();
    for (const event of signals) {
      const key = `${event.cell}:${event.intent.signal}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    return [...groups.entries()].flatMap(([key, events]) => {
      const owners = uniqueSorted(events.map((event) => event.ownerId));
      if (owners.length < 2) return [];
      const [cell, signal] = key.split(":");
      return [{
        id: `shared_signal:${key}`,
        kind: "shared_signal",
        cell,
        signal,
        owners,
        evidence: events.map((event) => event.eventId),
        basis: "independent capsule namespaces emitted the same signal at one cell"
      }];
    }).sort((left, right) => left.id.localeCompare(right.id));
  }
  var CapsuleSession = class _CapsuleSession {
    constructor({ seed = "AXM-CAPSULE-SESSION", width = 7, height = 7 } = {}) {
      this.options = { seed, width, height };
      this.genesis = {
        schema: "axm.stateborn.capsule-session/v1",
        seed,
        meta: { revision: 0, sequence: 0, fixture: "EMPTY_SHARED_SESSION" },
        world: { width, height },
        projections: {},
        events: [],
        detached: {},
        threads: []
      };
      this.state = deepClone(this.genesis);
      this.receipts = [];
      this.operations = /* @__PURE__ */ new Map();
    }
    get stateDigest() {
      return digest(this.state);
    }
    compose(capsule, { operationId, expectedRevision } = {}) {
      const resolvedId = operationId || `compose-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      const validity = verifyCapsule(capsule);
      let reason = validity.status === "PASS" ? null : validity.reason;
      if (!reason && expectedRevision !== void 0 && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
      const occupied = !reason ? this.state.projections[capsule.ownerId] : null;
      if (!reason && occupied) reason = occupied.capsuleId === capsule.capsuleId ? "CAPSULE_ALREADY_COMPOSED" : "OWNER_NAMESPACE_COLLISION";
      const position = capsule?.projection?.["public.position"];
      if (!reason && (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y) || position.x < 0 || position.y < 0 || position.x >= this.options.width || position.y >= this.options.height)) reason = "PROJECTION_POSITION";
      if (reason) {
        const refused = refusedReceipt(
          "axm.stateborn.session-receipt/v1",
          this.receipts.length,
          resolvedId,
          reason,
          beforeRevision,
          beforeDigest,
          {
            kind: "COMPOSE",
            ownerId: capsule?.ownerId || null,
            conflict: reason === "OWNER_NAMESPACE_COLLISION" ? { existingCapsuleId: occupied.capsuleId, proposedCapsuleId: capsule.capsuleId } : null
          }
        );
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      draft.projections[capsule.ownerId] = {
        namespace: `capsules.${capsule.ownerId}`,
        capsuleId: capsule.capsuleId,
        sourceStateDigest: capsule.sourceStateDigest,
        sourceRevision: capsule.sourceRevision,
        consent: deepClone(capsule.consent),
        sourceProjection: deepClone(capsule.projection),
        session: { active: true, position: deepClone(position), visitedCells: [`${position.x}_${position.y}`], signals: [] }
      };
      draft.meta.revision += 1;
      draft.meta.sequence += 1;
      this.state = draft;
      const receipt = {
        schema: "axm.stateborn.session-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedId,
        kind: "COMPOSE",
        status: "APPLIED",
        reason: "NAMESPACED_PROJECTION",
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        ownerId: capsule.ownerId,
        capsule: deepClone(capsule),
        namespace: `capsules.${capsule.ownerId}`,
        changedPaths: [`projections.${capsule.ownerId}`, "meta.revision", "meta.sequence"]
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedId, receipt);
      return deepClone(receipt);
    }
    act(ownerId, rawIntent, { operationId, expectedRevision } = {}) {
      const resolvedId = operationId || `act-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      const projection = this.state.projections[ownerId];
      let reason = null;
      if (expectedRevision !== void 0 && expectedRevision !== beforeRevision) reason = "STALE_REVISION";
      if (!reason && (!projection || !projection.session.active)) reason = "CAPSULE_NOT_ACTIVE";
      let intent = null;
      if (!reason && rawIntent?.kind === "signal" && CURIOSITY_SIGNALS.includes(rawIntent.signal)) intent = { kind: "signal", signal: rawIntent.signal };
      else if (!reason && rawIntent?.kind === "move" && DIRECTIONS[rawIntent.direction]) {
        const direction = DIRECTIONS[rawIntent.direction];
        const to = { x: projection.session.position.x + direction.dx, y: projection.session.position.y + direction.dy };
        if (to.x < 0 || to.y < 0 || to.x >= this.options.width || to.y >= this.options.height) reason = "MOVE_OUT_OF_BOUNDS";
        else intent = { kind: "move", direction: rawIntent.direction, to };
      } else if (!reason) reason = "UNKNOWN_INTENT";
      if (reason) {
        const refused = refusedReceipt(
          "axm.stateborn.session-receipt/v1",
          this.receipts.length,
          resolvedId,
          reason,
          beforeRevision,
          beforeDigest,
          { kind: "ACT", ownerId, intent: deepClone(rawIntent) }
        );
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      const actor = draft.projections[ownerId];
      if (intent.kind === "move") {
        actor.session.position = deepClone(intent.to);
        actor.session.visitedCells = uniqueSorted([...actor.session.visitedCells, `${intent.to.x}_${intent.to.y}`]);
      } else {
        actor.session.signals.push({ cell: `${actor.session.position.x}_${actor.session.position.y}`, signal: intent.signal });
      }
      const event = {
        schema: "axm.stateborn.capsule-session-event/v1",
        index: draft.events.length,
        sequence: draft.meta.sequence,
        ownerId,
        namespace: actor.namespace,
        cell: `${actor.session.position.x}_${actor.session.position.y}`,
        intent: deepClone(intent)
      };
      event.eventId = digest(event);
      draft.events.push(event);
      draft.meta.revision += 1;
      draft.meta.sequence += 1;
      draft.threads = sessionThreads(draft);
      this.state = draft;
      const receipt = {
        schema: "axm.stateborn.session-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedId,
        kind: "ACT",
        status: "APPLIED",
        reason: "SESSION_ONLY_DELTA",
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        ownerId,
        intent,
        eventId: event.eventId,
        threadIds: draft.threads.map((thread) => thread.id),
        changedPaths: [`projections.${ownerId}.session`, "events", "threads", "meta.revision", "meta.sequence"]
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedId, receipt);
      return deepClone(receipt);
    }
    proposeReturn(ownerId) {
      const projection = this.state.projections[ownerId];
      if (!projection?.session.active) return { status: "REFUSED", reason: "CAPSULE_NOT_ACTIVE", packet: null };
      const values = {
        "accepted.visitedCells": uniqueSorted(projection.session.visitedCells),
        "accepted.sharedSignals": uniqueSorted(projection.session.signals.map((entry) => `${entry.cell}:${entry.signal}`))
      };
      const packet = {
        schema: "axm.stateborn.return-packet/v1",
        ownerId,
        capsuleId: projection.capsuleId,
        baseSourceDigest: projection.sourceStateDigest,
        sessionStateDigest: this.stateDigest,
        consentReturnPaths: deepClone(projection.consent.returnPaths),
        deltas: projection.consent.returnPaths.map((path) => ({ path, operation: "append_unique", values: deepClone(values[path]) }))
      };
      packet.packetDigest = digest(packetPayload(packet));
      return { status: "PROPOSED", reason: "SOURCE_MUST_ACCEPT_PATHS", packet };
    }
    detach(ownerId, { operationId, expectedRevision } = {}) {
      const resolvedId = operationId || `detach-${this.receipts.length}`;
      if (this.operations.has(resolvedId)) return { ...deepClone(this.operations.get(resolvedId)), duplicate: true };
      const beforeRevision = this.state.meta.revision;
      const beforeDigest = this.stateDigest;
      const projection = this.state.projections[ownerId];
      let reason = expectedRevision !== void 0 && expectedRevision !== beforeRevision ? "STALE_REVISION" : null;
      if (!reason && (!projection || !projection.session.active)) reason = "CAPSULE_NOT_ACTIVE";
      if (reason) {
        const refused = refusedReceipt(
          "axm.stateborn.session-receipt/v1",
          this.receipts.length,
          resolvedId,
          reason,
          beforeRevision,
          beforeDigest,
          { kind: "DETACH", ownerId }
        );
        this.receipts.push(refused);
        this.operations.set(resolvedId, refused);
        return deepClone(refused);
      }
      const draft = deepClone(this.state);
      draft.detached[ownerId] = {
        capsuleId: projection.capsuleId,
        sourceStateDigest: projection.sourceStateDigest,
        finalSessionDigest: beforeDigest,
        eventIds: draft.events.filter((event) => event.ownerId === ownerId).map((event) => event.eventId)
      };
      delete draft.projections[ownerId];
      draft.threads = sessionThreads(draft);
      draft.meta.revision += 1;
      draft.meta.sequence += 1;
      this.state = draft;
      const receipt = {
        schema: "axm.stateborn.session-receipt/v1",
        sequence: this.receipts.length,
        operationId: resolvedId,
        kind: "DETACH",
        status: "APPLIED",
        reason: "REVERSIBLE_SEPARATION",
        ownerId,
        beforeRevision,
        afterRevision: draft.meta.revision,
        beforeDigest,
        afterDigest: this.stateDigest,
        changedPaths: [`projections.${ownerId}`, `detached.${ownerId}`, "threads", "meta.revision", "meta.sequence"]
      };
      receipt.receiptId = digest(receipt);
      this.receipts.push(receipt);
      this.operations.set(resolvedId, receipt);
      return deepClone(receipt);
    }
    verifyReplay() {
      const replay = new _CapsuleSession(this.options);
      for (const receipt of this.receipts.filter((entry) => entry.status === "APPLIED")) {
        let result;
        const options = { operationId: receipt.operationId, expectedRevision: receipt.beforeRevision };
        if (receipt.kind === "COMPOSE") result = replay.compose(receipt.capsule, options);
        else if (receipt.kind === "ACT") result = replay.act(receipt.ownerId, receipt.intent, options);
        else result = replay.detach(receipt.ownerId, options);
        if (result.afterDigest !== receipt.afterDigest) return { status: "FAIL", at: receipt.sequence, expected: receipt.afterDigest, actual: result.afterDigest };
      }
      return {
        status: replay.stateDigest === this.stateDigest ? "PASS" : "FAIL",
        receiptsReplayed: replay.state.meta.revision,
        expected: this.stateDigest,
        actual: replay.stateDigest
      };
    }
  };
  var capsuleContracts = {
    claim: "a structured state projection can be composed and separated under explicit consent; a human person is not moved",
    exportAllowlist: [...ALLOWED_EXPORT_PATHS],
    returnAllowlist: [...ALLOWED_RETURN_PATHS],
    authority: {
      source: "owns private state and explicitly accepts return paths",
      session: "owns only namespaced temporary projections and session events",
      returnPacket: "proposal only; cannot mutate its source"
    },
    exclusions: ["network transport", "identity fusion", "automatic writeback", "cryptographic identity proof", "real personal data"]
  };

  // dist/capsule-app.js
  var $ = (selector) => document.querySelector(selector);
  var elements = {
    canvas: $("#capsuleCanvas"),
    claim: $("#claimText"),
    digest: $("#digestBadge"),
    heading: $("#sessionHeading"),
    metrics: $("#sessionMetrics"),
    asterSource: $("#asterSource"),
    briarSource: $("#briarSource"),
    asterRevision: $("#asterRevision"),
    briarRevision: $("#briarRevision"),
    inspector: $("#capsuleInspector"),
    packet: $("#returnPacket"),
    threads: $("#threads"),
    threadCount: $("#threadCount"),
    ledger: $("#ledger"),
    system: $("#systemMessage"),
    controls: [...document.querySelectorAll("button")]
  };
  var sources;
  var capsules;
  var session;
  var activeOwner = "aster";
  var pendingReturn = null;
  var running = false;
  var esc = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  var pretty = (value) => String(value).replaceAll("_", " ");
  function initialize() {
    sources = {
      aster: new ActorStateOwner({ seed: "AXM-ASTER-HOME", ownerId: "aster", displayName: "Aster", color: "amber" }),
      briar: new ActorStateOwner({ seed: "AXM-BRIAR-HOME", ownerId: "briar", displayName: "Briar", color: "violet" })
    };
    capsules = {
      aster: sources.aster.issueCapsule({ operationId: "initial-capsule" }).capsule,
      briar: sources.briar.issueCapsule({ operationId: "initial-capsule" }).capsule
    };
    session = new CapsuleSession();
    activeOwner = "aster";
    pendingReturn = null;
  }
  function sourceHtml(source) {
    return `<div><span>source digest</span><b>${esc(source.stateDigest.slice(0, 10))}</b></div>
    <div><span>accepted signals</span><b>${source.state.accepted.sharedSignals.length}</b></div>
    <div><span>accepted visits</span><b>${source.state.accepted.visitedCells.length}</b></div>
    <div><span>withheld private fields</span><b>2</b></div>`;
  }
  function renderSources() {
    elements.asterSource.innerHTML = sourceHtml(sources.aster);
    elements.briarSource.innerHTML = sourceHtml(sources.briar);
    elements.asterRevision.textContent = `revision ${sources.aster.state.meta.revision}`;
    elements.briarRevision.textContent = `revision ${sources.briar.state.meta.revision}`;
    const capsule = capsules[activeOwner];
    elements.inspector.innerHTML = `<div><span>owner namespace</span><b>capsules.${esc(activeOwner)}</b></div>
    <div><span>exported paths</span><b>${capsule.consent.exportPaths.length}</b></div>
    <div><span>returnable paths</span><b>${capsule.consent.returnPaths.length}</b></div>
    <div><span>private paths exported</span><b>0</b></div><div><span>capsule digest</span><b>${esc(capsule.capsuleDigest.slice(0, 10))}</b></div>`;
  }
  function drawSession() {
    const canvas = elements.canvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.round(rect.width * dpr));
    const height = Math.max(320, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const columns = session.state.world.width;
    const rows = session.state.world.height;
    const size = Math.min((width - 60) / columns, (height - 60) / rows);
    const ox = (width - columns * size) / 2;
    const oy = (height - rows * size) / 2;
    const sharedCells = new Set(session.state.threads.map((thread) => thread.cell));
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
      const px = ox + x * size;
      const py = oy + y * size;
      const key = `${x}_${y}`;
      ctx.fillStyle = (x + y) % 2 ? "rgba(15,34,45,.78)" : "rgba(10,26,36,.9)";
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
      ctx.strokeStyle = sharedCells.has(key) ? "rgba(121,244,232,.9)" : "rgba(180,215,230,.11)";
      ctx.lineWidth = sharedCells.has(key) ? 3 : 1;
      ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
      ctx.fillStyle = "rgba(215,230,240,.22)";
      ctx.font = `${Math.max(9, size * 0.14)}px ui-monospace,monospace`;
      ctx.fillText(key, px + 6, py + size - 7);
    }
    const colors = { aster: "#ffcb70", briar: "#c89bff" };
    const shifts = { aster: [-0.15, -0.08], briar: [0.15, 0.1] };
    for (const [ownerId, projection] of Object.entries(session.state.projections)) {
      const { x, y } = projection.session.position;
      const [sx, sy] = shifts[ownerId] || [0, 0];
      const cx = ox + (x + 0.5 + sx) * size;
      const cy = oy + (y + 0.5 + sy) * size;
      ctx.save();
      ctx.shadowColor = colors[ownerId] || "#79f4e8";
      ctx.shadowBlur = 18;
      ctx.fillStyle = colors[ownerId] || "#79f4e8";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(7, size * 0.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(240,247,250,.88)";
      ctx.font = `${Math.max(10, size * 0.14)}px system-ui,sans-serif`;
      ctx.fillText(ownerId, cx + 9, cy - 8);
    }
    canvas.setAttribute("aria-label", `${Object.keys(session.state.projections).length} active capsule projections, ${session.state.events.length} session events, ${session.state.threads.length} shared threads.`);
  }
  function renderPacket() {
    if (!pendingReturn) {
      elements.packet.innerHTML = '<p class="empty">No return proposed.</p>';
      return;
    }
    const { ownerId, packet } = pendingReturn;
    elements.packet.innerHTML = `<strong>${esc(ownerId)} \xB7 proposal only</strong><span>${packet.deltas.map((delta) => `${esc(pretty(delta.path))}: ${delta.values.length}`).join("<br>")}<br>digest ${esc(packet.packetDigest.slice(0, 12))}</span>`;
  }
  function renderThreads() {
    elements.threadCount.textContent = `${session.state.threads.length} thread${session.state.threads.length === 1 ? "" : "s"}`;
    elements.threads.innerHTML = session.state.threads.length ? session.state.threads.map((thread) => `<article class="thread-card"><strong>${esc(pretty(thread.kind))}</strong><span>${esc(thread.basis)}</span><em>${esc(thread.cell)} \xB7 ${esc(thread.signal)} \xB7 ${thread.evidence.length} event ids</em></article>`).join("") : '<p class="empty">Independent actions have not intersected.</p>';
  }
  function renderLedger() {
    const sessionEntries = session.receipts.map((receipt) => ({ ...receipt, floor: "SESSION" }));
    const sourceEntries = Object.values(sources).flatMap((source) => source.receipts.filter((receipt) => receipt.kind === "APPLY_RETURN").map((receipt) => ({ ...receipt, floor: `SOURCE ${source.state.ownerId}` })));
    const entries = [...sessionEntries, ...sourceEntries].slice(-12).reverse();
    elements.ledger.innerHTML = entries.length ? entries.map((receipt) => `<div class="ledger-chip ${receipt.status === "REFUSED" ? "refused" : ""}"><strong>${esc(receipt.floor)} \xB7 ${esc(receipt.kind)}</strong><span>${esc(receipt.status)} \xB7 ${esc(pretty(receipt.reason))}<br>${esc((receipt.afterDigest || "").slice(0, 9))}</span></div>`).join("") : '<p class="empty">No composition receipt yet.</p>';
  }
  function claimText() {
    const active = Object.keys(session.state.projections).length;
    const accepted = Object.values(sources).reduce((sum, source) => sum + source.state.accepted.sharedSignals.length + source.state.accepted.visitedCells.length, 0);
    if (!active && !session.state.events.length) return "Two independent source states exist. Nothing has entered the shared session.";
    if (session.state.threads.length && accepted) return "Observed: namespaced projections collaborated; one source explicitly accepted selected return state. A person was not moved.";
    if (session.state.threads.length) return "Observed: independent projections intersected. Both sources remain unchanged until a return path is accepted.";
    return `${active} consented projection${active === 1 ? " is" : "s are"} active. Identity fusion and automatic writeback remain blocked.`;
  }
  function render(message, tone = "") {
    const active = Object.keys(session.state.projections).length;
    elements.claim.textContent = claimText();
    elements.digest.textContent = `session ${session.stateDigest.slice(0, 12)}`;
    elements.heading.textContent = active ? `${active} namespaced projection${active === 1 ? "" : "s"} \xB7 revision ${session.state.meta.revision}` : "Empty namespace floor";
    elements.metrics.innerHTML = [[active, "active projections"], [session.state.events.length, "session events"], [session.state.threads.length, "shared threads"], [Object.keys(session.state.detached).length, "detached receipts"]].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
    document.querySelectorAll(".seat-choice").forEach((button) => button.classList.toggle("active", button.dataset.owner === activeOwner));
    renderSources();
    renderPacket();
    renderThreads();
    renderLedger();
    drawSession();
    if (message) {
      elements.system.textContent = message;
      elements.system.style.color = tone === "PASS" ? "var(--cyan)" : tone === "HOLD" ? "var(--red)" : "var(--muted)";
    }
  }
  function compose(ownerId) {
    const receipt = session.compose(capsules[ownerId], { expectedRevision: session.state.meta.revision });
    render(`${ownerId.toUpperCase()} ${receipt.status} \xB7 ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
    return receipt;
  }
  function act(kind, value) {
    const intent = kind === "move" ? { kind, direction: value } : { kind, signal: value };
    const receipt = session.act(activeOwner, intent, { expectedRevision: session.state.meta.revision });
    render(`${activeOwner.toUpperCase()} ${receipt.status} \xB7 ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
  }
  function propose() {
    const result = session.proposeReturn(activeOwner);
    pendingReturn = result.packet ? { ownerId: activeOwner, packet: result.packet } : null;
    render(result.packet ? `RETURN PROPOSED \xB7 ${activeOwner} source still unchanged.` : `RETURN REFUSED \xB7 ${pretty(result.reason)}.`, result.packet ? "PASS" : "HOLD");
    return result;
  }
  function accept(paths) {
    if (!pendingReturn) {
      render("RETURN HOLD \xB7 build a packet first.", "HOLD");
      return;
    }
    const source = sources[pendingReturn.ownerId];
    const receipt = source.applyReturn(pendingReturn.packet, { acceptedPaths: paths, expectedRevision: source.state.meta.revision });
    pendingReturn = null;
    render(`SOURCE ${receipt.status} \xB7 ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
  }
  function setRunning(value) {
    running = value;
    elements.controls.forEach((button) => {
      button.disabled = value;
    });
  }
  $("#composeAster").addEventListener("click", () => compose("aster"));
  $("#composeBriar").addEventListener("click", () => compose("briar"));
  document.querySelectorAll(".seat-choice").forEach((button) => button.addEventListener("click", () => {
    activeOwner = button.dataset.owner;
    pendingReturn = null;
    render(`ACTIVE PROJECTION \xB7 ${activeOwner}.`);
  }));
  document.querySelectorAll(".session-action").forEach((button) => button.addEventListener("click", () => act(button.dataset.kind, button.dataset.value)));
  $("#proposeReturn").addEventListener("click", propose);
  $("#acceptSignals").addEventListener("click", () => accept(["accepted.sharedSignals"]));
  $("#acceptVisits").addEventListener("click", () => accept(["accepted.visitedCells"]));
  $("#refuseReturn").addEventListener("click", () => {
    pendingReturn = null;
    render("RETURN REFUSED BY SOURCE \xB7 no source state changed.", "HOLD");
  });
  $("#tamperReturn").addEventListener("click", () => {
    if (!pendingReturn && !propose().packet) return;
    const forged = structuredClone(pendingReturn.packet);
    forged.deltas[0].values.push("forged-state");
    const source = sources[pendingReturn.ownerId];
    const receipt = source.applyReturn(forged, { acceptedPaths: forged.consentReturnPaths, operationId: `forged-${source.receipts.length}` });
    pendingReturn = null;
    render(`FORGED PACKET ${receipt.status} \xB7 ${pretty(receipt.reason)} \xB7 source unchanged.`, "HOLD");
  });
  $("#detachButton").addEventListener("click", () => {
    const receipt = session.detach(activeOwner, { expectedRevision: session.state.meta.revision });
    pendingReturn = null;
    render(`${activeOwner.toUpperCase()} ${receipt.status} \xB7 ${pretty(receipt.reason)}.`, receipt.status === "APPLIED" ? "PASS" : "HOLD");
  });
  $("#replayButton").addEventListener("click", () => {
    const result = session.verifyReplay();
    render(`${result.status === "PASS" ? "REPLAY PASS" : "REPLAY HOLD"} \xB7 ${result.receiptsReplayed ?? result.at} committed revisions.`, result.status);
  });
  $("#resetButton").addEventListener("click", () => {
    initialize();
    render("RESET \xB7 exact independent sources and empty session restored.");
  });
  $("#proofButton").addEventListener("click", async () => {
    if (running) return;
    initialize();
    setRunning(true);
    compose("aster");
    compose("briar");
    activeOwner = "aster";
    session.act("aster", { kind: "signal", signal: "open" });
    render("PROOF \xB7 Aster emitted open.");
    await new Promise((resolve) => setTimeout(resolve, 80));
    activeOwner = "briar";
    session.act("briar", { kind: "signal", signal: "open" });
    render("PROOF \xB7 Briar intersected open.");
    await new Promise((resolve) => setTimeout(resolve, 80));
    activeOwner = "aster";
    const packet = session.proposeReturn("aster").packet;
    sources.aster.applyReturn(packet, { acceptedPaths: ["accepted.sharedSignals"] });
    setRunning(false);
    render("PROOF COMPLETE \xB7 shared signal earned; Aster accepted signals; Briar source unchanged.", "PASS");
  });
  window.addEventListener("resize", drawSession);
  window.AXM_CAPSULES = { get sources() {
    return sources;
  }, get session() {
    return session;
  }, get capsules() {
    return capsules;
  }, capsuleContracts };
  initialize();
  render("Ready. Source and session digests are separate.");
})();
