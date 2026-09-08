# Related Systems: What Already Exists Around the AXM State Floor

**Research date:** 2026-09-02 UTC

**Evidence rule:** primary sources only

**Runtime boundary:** this is software-architecture research. Nothing here demonstrates a hardware, CPU/GPU, firmware, brain, neuron, physics, or “below software” implementation.

## Question and bounded conclusion

AXM State Floor combines a canonical current state, sparse change routing, many small deterministic perspective functions, structured evidence/deltas, a deterministic conflict-preserving merge gate, repeat-until-quiescent execution, and an explicit escalation boundary.

The mechanisms around that combination have substantial prior art. Rete networks already avoid repeating unaffected rule matches. Blackboard systems already coordinate many specialist knowledge sources through shared state instead of pairwise chatter. Incremental-computation systems already track dependencies and recompute only demanded affected work. Differential dataflow already propagates structured changes through iterative dataflows. Durable workflow systems already enforce replay determinism. Statecharts already run event-driven transition cycles. Provenance and canonicalization standards already cover pieces of the evidence boundary.

This review did **not** find one primary source that contains the complete AXM contract and experiment framing. That is not proof of novelty. The most defensible present statement is:

> AXM State Floor is currently best treated as an experimentally tested combination and comparison frame built from established families of ideas. Whether the particular combination is novel remains **UNKNOWN** until a broader literature, patent, product, and implementation search is performed.

## Relationship scale

- **Direct relative:** shares a central runtime mechanism, not merely vocabulary.
- **Partial relative:** shares one important property but differs in coordination or truth semantics.
- **Supporting standard:** useful at an interface or evidence boundary; not the runtime architecture.
- **Misleading analogy:** sounds close but would inflate the current evidence.

## Direct relatives

### 1. Rete production-rule matching

- **Primary source:** [Charles L. Forgy, “Rete: A Fast Algorithm for the Many Pattern/Many Object Pattern Match Problem”](https://doi.org/10.1016/0004-3702%2882%2990020-0), *Artificial Intelligence*, September 1982.
- **Organization/authors/date:** Charles L. Forgy, Carnegie Mellon University lineage; 1982.
- **Architectural layer:** rule-engine runtime / incremental pattern matching.
- **Exact mechanism:** a network shares condition tests across many rules and retains partial matches, so a fact change propagates through relevant portions of the match network instead of rematching every rule against every fact from scratch.
- **Genuine AXM mapping:** facts resemble canonical state elements; rules resemble deterministic perspective nodes; match-network propagation resembles sparse wake-up routing; retained partial matches resemble carefully bounded derived node state.
- **What does not map:** Rete’s match memory is internal rule-engine state, not AXM’s declared state-subset contract. Rete does not by itself define evidence receipts, domain authority, explicit unresolved conflict objects, deterministic merge policy, or AI escalation.
- **Testable AXM lesson:** compile subscriptions and predicates into a shared discrimination network and compare its routing time, memory, missed wakes, and false wakes against the current flat subscription index at 10,000 and 100,000 registered variants.

### 2. Blackboard architectures

- **Primary source:** [H. Penny Nii, “The Blackboard Model of Problem Solving and the Evolution of Blackboard Architectures”](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/537), *AI Magazine* 7(2), 15 June 1986.
- **Organization/authors/date:** H. Penny Nii; AAAI publication; 1986. The source traces the first blackboard system to HEARSAY-II, developed during 1971–1976.
- **Architectural layer:** shared-state problem-solving architecture.
- **Exact mechanism:** independent knowledge sources inspect and modify a shared blackboard; a control component observes opportunities and selects which knowledge source executes next.
- **Genuine AXM mapping:** the blackboard is a strong ancestor of canonical shared state; knowledge sources resemble perspectives; the control component resembles the scheduler/router; indirect coordination through shared state avoids all-to-all specialist chatter.
- **What does not map:** classic blackboard scheduling can be opportunistic or heuristic, knowledge sources can be stateful and coarse, and the architecture does not inherently require deterministic execution, immutable receipts, conflict preservation, or replay hashes.
- **Testable AXM lesson:** build a blackboard-style opportunistic scheduler as an honest baseline and measure whether deterministic event routing loses useful solutions or merely removes scheduling variability in a bounded multi-step fixture.

### 3. Adapton and self-adjusting computation

- **Primary source:** [Matthew A. Hammer, Yit Phang Khoo, Michael Hicks, and Jeffrey S. Foster, “Adapton: Composable, Demand-Driven Incremental Computation”](https://www.cs.umd.edu/~mwh/papers/hammer13adapton.html), PLDI, June 2014.
- **Organization/authors/date:** University of Maryland and collaborators; 2014.
- **Architectural layer:** programming-language/runtime incremental computation.
- **Exact mechanism:** a demanded computation graph records dependencies, tracks changes hierarchically, separates incremental inner computations from observers, and recomputes only results still demanded by observers.
- **Genuine AXM mapping:** this is one of the closest matches to sparse wake-up semantics. Its dependency graph corresponds to `reads` and subscriptions, observer demand corresponds to active outputs, and change propagation corresponds to selective node execution.
- **What does not map:** Adapton computes program values; it does not model competing perspective claims, evidence provenance, domain authority, explicit unresolved conflicts, or quiescent merge cycles.
- **Testable AXM lesson:** instrument actual node reads and construct an observed dependency graph at runtime. Compare declared subscriptions, observed reads, and a full-scan oracle to detect both missing edges and over-broad wake-ups automatically.

### 4. Differential and timely dataflow

- **Primary sources:** [Frank McSherry, Derek Murray, Rebecca Isaacs, and Michael Isard, “Differential Dataflow”](https://www.microsoft.com/en-us/research/publication/differential-dataflow/), CIDR, January 2013; [Derek G. Murray et al., “Naiad: A Timely Dataflow System”](https://www.microsoft.com/en-us/research/project/naiad/publications/), SOSP, November 2013.
- **Organization/authors/date:** Microsoft Research; 2013.
- **Architectural layer:** distributed incremental data-parallel runtime.
- **Exact mechanism:** differential computation represents and propagates changes through dataflow operators, including nested iterative computations; timely dataflow tracks logical progress through cyclic dataflows.
- **Genuine AXM mapping:** structured differences resemble AXM deltas; operators resemble deterministic nodes; cyclic dataflow resembles repeat-until-quiescent execution; indexes and arranged state show that selective recomputation can trade memory for less repeated work.
- **What does not map:** dataflow operators transform collections under algebraic update semantics. They do not inherently represent evidence quality, perspective authority, contradictory truths, or an unresolved escalation queue. The published systems are distributed; the current AXM prototype is not.
- **Testable AXM lesson:** express one AXM fixture as a differential collection of state facts and compare stabilization, delta volume, index memory, and output equivalence against the current scheduler without claiming the distributed results transfer automatically.

### 5. Incremental view maintenance

- **Primary source:** [Christoph Koch et al., “Incremental View Maintenance for Collection Programming”](https://dbtoaster.github.io/papers/pods2016-ivmcp.pdf), PODS, 2016.
- **Organization/authors/date:** database research collaboration led by Christoph Koch; 2016.
- **Architectural layer:** database/query engine.
- **Exact mechanism:** derive delta computations that update materialized query results from input changes instead of rerunning the complete query; recursive higher-order maintenance can maintain intermediate views.
- **Genuine AXM mapping:** a perspective output can be treated as a materialized view over its declared state subset; its handler can consume state deltas rather than rereading full state.
- **What does not map:** view maintenance assumes defined query semantics and generally one intended result. It does not decide whether two evidence-backed claims are genuinely incompatible or which domain authority applies.
- **Testable AXM lesson:** add an optional delta-input handler contract beside full-state handlers, then measure the crossover point where intermediate-view memory costs more than the recomputation it saves.

## Partial relatives and useful counterexamples

### 6. Temporal durable workflows

- **Primary source:** [Temporal Workflow documentation](https://docs.temporal.io/workflows), Temporal Technologies; current documentation snapshot accessed 2026-09-02 UTC.
- **Organization/authors/date:** Temporal Technologies; document date not stated; current page identifies its event-history and replay model.
- **Architectural layer:** durable workflow orchestration.
- **Exact mechanism:** an ordered Event History is the source of truth. Workflow code replays that history to recreate pre-failure state and must make the same decisions from the same history; side-effecting Activities are recorded and not repeated during replay.
- **Genuine AXM mapping:** deterministic replay, version-sensitive execution, explicit external-effect boundaries, and replay-safe operations closely match AXM’s receipt and determinism goals.
- **What does not map:** Temporal deliberately retains and replays history. It is a direct counterexample to any universal claim that current state alone is sufficient, especially where side effects, timers, external calls, and workflow-version compatibility matter.
- **Testable AXM lesson:** create a side-effectful fixture with timers and external-result receipts. Compare snapshot-only recovery, history replay, and snapshot-plus-minimal-causal-evidence to identify exactly which history can safely be compacted.

### 7. SCXML and statecharts

- **Primary source:** [State Chart XML (SCXML): State Machine Notation for Control Abstraction](https://www.w3.org/TR/scxml/), W3C Recommendation, 1 September 2015.
- **Organization/authors/date:** W3C; editors from Genesys, IBM, Voxeo, Microsoft, Nuance, HP, and invited experts; 2015.
- **Architectural layer:** reactive state-machine specification.
- **Exact mechanism:** hierarchical and parallel states consume external and internal events through specified transition-selection and execution algorithms, including eventless transitions and repeated microsteps until a stable configuration is reached.
- **Genuine AXM mapping:** external change events, internal events generated by node output, deterministic selection rules, and stabilization cycles resemble AXM’s event queue and repeat-until-quiescent loop.
- **What does not map:** SCXML transitions are part of one state-machine model, not thousands of independently registered perspectives. It does not define evidence receipts or conflict-preserving state merge.
- **Testable AXM lesson:** encode the scheduler’s lifecycle as a small SCXML-compatible state machine and use model-derived transition tests to expose ambiguous event ordering and nontermination.

### 8. Erlang processes and OTP supervision

- **Primary sources:** [Erlang Processes](https://www.erlang.org/doc/system/ref_man_processes.html) and [OTP Supervisor Behaviour](https://www.erlang.org/doc/system/sup_princ.html), Ericsson/Erlang OTP 29.0.6 documentation, accessed 2026-09-02 UTC.
- **Organization/authors/date:** Ericsson/Erlang community; current documentation version 29.0.6; page publication date not stated.
- **Architectural layer:** concurrent language runtime and fault supervision.
- **Exact mechanism:** lightweight isolated processes communicate through asynchronous signals and message queues. Supervisors start, monitor, stop, and restart children using declared strategies and bounded restart intensity.
- **Genuine AXM mapping:** small independently failing work units, explicit lifecycle metadata, bounded escalation, and “one-for-one” recovery are relevant if perspective execution later needs isolation.
- **What does not map:** an Erlang process is much heavier semantically than a deterministic function record: it owns a mailbox, execution state, and process lifecycle. Message arrival and scheduling do not supply AXM’s canonical total order, deterministic merge, or state-subset contract. “Thousands of Erlang processes” is not evidence for “10,000 AXM perspectives are free.”
- **Testable AXM lesson:** isolate only handlers that fail or exceed budgets, then compare per-node processes with an in-process function registry for memory, startup, deterministic replay, and failure containment.

### 9. Conflict-free replicated data types (CRDTs)

- **Primary source:** [Nuno Preguiça, Carlos Baquero, and Marc Shapiro, “Conflict-free Replicated Data Types (CRDTs)”](https://arxiv.org/abs/1805.06358), submitted 16 May 2018.
- **Organization/authors/date:** university/INRIA distributed-systems researchers; 2018.
- **Architectural layer:** distributed replicated data types.
- **Exact mechanism:** replicas accept updates without coordination and deterministically converge after receiving the same update set by using datatype-specific mathematically defined merge/update rules.
- **Genuine AXM mapping:** deterministic convergence, explicit merge semantics, and order-insensitive independent updates are useful for AXM’s independent/identical delta cases.
- **What does not map:** CRDTs make selected conflicts disappear through datatype semantics. AXM explicitly requires genuine semantic conflicts to remain visible. A converged value is not automatically a true value, and CRDT convergence is not majority-vote truth.
- **Testable AXM lesson:** formally classify AXM delta fields into commutative, idempotent, authoritative, and conflict-preserving types; property-test permutation invariance only for the first two classes.

### 10. Entity-component-system (ECS) architecture

- **Primary source:** [Unity Entities 1.3: Entity Component System concepts](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/concepts-intro.html), Unity Technologies, generated 14 January 2026.
- **Organization/authors/date:** Unity Technologies; Entities 1.3.15 documentation; 2026.
- **Architectural layer:** application/game runtime data organization.
- **Exact mechanism:** an entity is a lightweight identifier associated with data-only components; systems process data selected by component composition rather than storing behavior inside each object.
- **Genuine AXM mapping:** canonical state can be decomposed into data components, and perspectives can declare queries over only the components they read. This is a useful physical data-layout option for large registries.
- **What does not map:** ECS alone does not guarantee event-driven wake-up, deterministic scheduling, receipts, evidence, conflict handling, or quiescence. It is data organization, not the full perspective fabric.
- **Testable AXM lesson:** store state fields and subscriptions in component/archetype-style tables and measure cache behavior and registration bytes without renaming software records as hardware nodes.

### 11. ROS 2 publish/subscribe quality of service

- **Primary source:** [ROS 2 Quality of Service policies](https://design.ros2.org/articles/qos.html), Open Source Robotics Foundation; written October 2015, modified May 2019.
- **Organization/authors/date:** Esteve Fernandez / Open Source Robotics Foundation; 2015–2019.
- **Architectural layer:** robotics middleware transport.
- **Exact mechanism:** DDS publishers and subscribers match only when offered/requested QoS is compatible; policies include queue history, depth, reliability, and durability.
- **Genuine AXM mapping:** typed topics and subscription compatibility could carry events to isolated perspectives, while history/depth choices make memory and staleness explicit.
- **What does not map:** ROS 2 routes transport messages, not deterministic state dependencies. QoS may intentionally drop data, and distributed timing makes it unsuitable as evidence for the current single-runtime determinism claim.
- **Testable AXM lesson:** only after the in-process floor is stable, test a transport adapter under best-effort versus reliable delivery and prove which lost or duplicated events are detected by state hashes and receipts.

## Supporting standards, not architectural ancestors

### 12. CloudEvents

- **Primary source:** [CloudEvents Specification v1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md), CNCF CloudEvents project; version 1.0.2, document date not stated.
- **Architectural layer:** interoperable event envelope.
- **Exact mechanism:** defines a vendor-neutral event record containing occurrence data and context; events are routed from producers to interested consumers without naming a destination in the event itself.
- **AXM mapping / non-map:** useful vocabulary and envelope fields for `triggering_event`; it neither discovers dependencies nor guarantees delivery, ordering, deterministic handlers, or merge correctness.
- **Testable lesson:** map an AXM event to CloudEvents without losing state-path, causation, schema-version, and input-hash information; reject the mapping if required AXM evidence becomes an opaque payload.

### 13. RFC 8785 JSON Canonicalization Scheme

- **Primary source:** [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html), Anders Rundgren, Bret Jordan, and Samuel Erdtman; June 2020.
- **Architectural layer:** deterministic serialization.
- **Exact mechanism:** constrains JSON to I-JSON, defines primitive serialization, recursively sorts object properties, and emits UTF-8 to produce invariant hashable bytes.
- **AXM mapping / non-map:** directly supports portable state and receipt hashes; canonical bytes do not guarantee deterministic handler logic, numeric-domain correctness, or equivalent semantics across different schemas.
- **Testable lesson:** replace implementation-specific JSON hashing with an RFC 8785 conformance vector suite and test Unicode, number, duplicate-key, NaN, and Infinity failure behavior.

### 14. W3C PROV-O

- **Primary source:** [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/), W3C Recommendation, 30 April 2013; editors Timothy Lebo, Satya Sahoo, and Deborah McGuinness.
- **Architectural layer:** interoperable provenance model.
- **Exact mechanism:** relates entities, activities, and responsible agents through usage, generation, derivation, attribution, revision, and qualified influence relationships.
- **AXM mapping / non-map:** provides a mature vocabulary for evidence and receipt provenance; it describes provenance but does not execute routing, verify evidence truth, or resolve conflicts.
- **Testable lesson:** export a receipt chain as a minimal PROV bundle and verify that every accepted delta can be traced to input entity, handler activity, version, and resulting entity without implying a person-like agent for a software function.

### 15. SLSA

- **Primary source:** [SLSA Specification v1.2](https://slsa.dev/spec/v1.2/), cross-industry/Linux Foundation collaboration; current approved v1.2, accessed 2026-09-02 UTC.
- **Architectural layer:** software supply-chain assurance.
- **Exact mechanism:** defines tracks, increasing assurance levels, provenance/attestation formats, and verification guidance for source and build artifacts.
- **AXM mapping / non-map:** relevant to proving which node implementation and scheduler version produced a receipt; it does not validate the domain truth of a node output or schedule runtime work.
- **Testable lesson:** attach build/source provenance to node-version manifests and test whether replay refuses unverified or version-mismatched handler packages.

### 16. The Update Framework (TUF)

- **Primary source:** [The Update Framework Specification](https://theupdateframework.github.io/specification/latest/), TUF project/CNCF; work began in 2009, current 1.x specification accessed 2026-09-02 UTC.
- **Architectural layer:** secure software-update metadata and delegated trust.
- **Exact mechanism:** signed roles, delegated keys, threshold signatures, versioned snapshot/timestamp metadata, and checks against rollback, freeze, and mix-and-match attacks.
- **AXM mapping / non-map:** useful for distributing trusted node and schema versions. TUF threshold signatures establish artifact authorization, not majority truth about a domain claim, and must not be reused as a semantic merge rule.
- **Testable lesson:** simulate stale, rollback, mixed-version, and partially signed node registries; require the scheduler to reject them before execution while preserving a diagnostic receipt.

### 17. in-toto

- **Primary source:** [in-toto project specification entry point](https://in-toto.io/), CNCF graduated project; current documentation accessed 2026-09-02 UTC.
- **Architectural layer:** software supply-chain step provenance.
- **Exact mechanism:** records what steps were performed, by whom, and in what order so users can verify software-product supply-chain integrity.
- **AXM mapping / non-map:** strongly relevant to tamper-evident node/version provenance and complements execution receipts; it does not define canonical application state or runtime conflict handling.
- **Testable lesson:** model registry generation, handler build, benchmark, and publication as an in-toto layout and verify that an altered handler binary breaks the expected chain.

### 18. WASI capability isolation

- **Primary source:** [WASI introduction](https://wasi.dev/), W3C WebAssembly Community Group WASI subgroup; active standard, accessed 2026-09-02 UTC.
- **Architectural layer:** portable sandboxed component interface.
- **Exact mechanism:** WASI applications begin without ambient authority and receive only host-granted capabilities; the component model supports portable composition across languages.
- **AXM mapping / non-map:** a plausible future boundary for untrusted or multi-language node handlers and enforceable read/capability permissions; it does not provide sparse routing, deterministic scheduling, or merge semantics and has not been benchmarked here.
- **Testable lesson:** only after the pure-function contract is stable, run a small handler subset in WASI with explicit read capabilities and measure isolation cost, determinism, and denied-access receipts.

## Screened but not promoted to a core relative

### seL4

[seL4](https://sel4.systems/About/) is a formally verified high-assurance microkernel. That is important systems research, but it is at the operating-system isolation layer, not the state-routing/merge layer. It may one day host isolated components, yet using it as evidence for AXM’s runtime efficiency or determinism would be a category error. **Classification: misleading as a core analogy; possible much-later containment substrate.**

### Generic “multi-agent” systems

A group of conversational agents with private context, memory, and pairwise messaging implements the architecture this experiment is trying to compare against, not the tiny-node contract itself. Actor systems can be useful implementation substrates, but an actor is not automatically an AXM perspective. **Classification: misleading unless the state, trigger, handler, reads, and delta contract are explicitly demonstrated.**

### Hardware, neural, and physics analogies

CPU cores, GPU lanes, neurons, brains, material state, and physical replication are not evidence sources for the current software runtime. No current experiment maps one registered perspective to one physical compute unit. **Classification: out of scope and unsupported.**

## Synthesis: where AXM is genuinely different so far

The research families overlap AXM in a chain rather than a single predecessor:

1. **Blackboards** contribute shared canonical work state and indirect specialist coordination.
2. **Rete, Adapton, and incremental view maintenance** contribute selective dependency-driven recomputation.
3. **Differential/timely dataflow and statecharts** contribute delta propagation and cyclic stabilization.
4. **Temporal** contributes deterministic replay discipline and an important state-versus-history counterexample.
5. **CRDTs** contribute algebraic merge lessons while clarifying why semantic conflicts sometimes must remain explicit.
6. **PROV-O, RFC 8785, CloudEvents, SLSA, TUF, and in-toto** contribute evidence, identity, transport, serialization, and version integrity.
7. **Erlang/OTP, ECS, ROS 2, and WASI** are possible substrates or neighboring designs, not proof of the core architecture.

What remains distinctive in the current AXM experiment is the deliberate combination of:

- thousands of registered **function-like** perspective variants rather than thousands of conversational agents;
- one explicit canonical state with declared reads and sparse subscriptions;
- structured evidence and delta receipts for every execution;
- deterministic domain-bounded authority plus explicit unresolved conflict objects;
- repeat-until-quiescent execution followed by an expensive-capability boundary;
- controlled comparison of registered, triggered, and state-changing nodes;
- direct state-versus-history sufficiency tests; and
- a non-rigged naive baseline with failures retained.

Those choices form a useful research frame. They do not yet establish a new computer-science primitive.

## Strongest next experiment suggested by this review

Build **AXM Observed Dependency Router**:

1. Instrument every canonical-state read made by a handler.
2. Record an observed dependency edge from the state path to the node/version.
3. Run declared subscriptions, observed dependencies, a Rete-style shared matcher, and a full-scan oracle over the same generated mutations.
4. Preserve any case where a sparse strategy misses an oracle-required execution.
5. Compare final-state equivalence, missed wakes, false wakes, dormant percentage, routing time, graph-maintenance time, bytes per edge, and stabilization iterations.
6. Change execution order and replay each failure from receipts.

This directly attacks the measured weakness already exposed by Workfloor Sentinel: sparse routing is cheap only if dependency declarations are complete. It also tests the strongest reusable lesson shared by Rete and Adapton without importing either system’s assumptions wholesale.

## Limitations

- This is a bounded architecture review, not an exhaustive prior-art, patent, or novelty search.
- Only primary sources that were directly accessible and sufficiently specific were used. Absence from this report is not evidence that a system does not exist.
- Current documentation pages can change after the access date. Versioned standards and papers are preferred where available.
- No source implementation was installed or benchmarked in this lane.
- No runtime code, scheduler rule, node contract, or benchmark result was changed.
- Similar vocabulary does not imply equivalent semantics or performance.
- Cross-system performance numbers were deliberately not copied because workloads and hosts are not comparable to the AXM fixtures.

The source ledger and access status are in [SOURCE_LEDGER.md](SOURCE_LEDGER.md).
