# AXM Machine-State Web Atlas v0.1

**Research date:** 2026-09-04  
**Question:** Is Genesis State the actual first state, or are there states before it? How does state travel from physical machinery to human-readable code and meaning?

## The answer in one sentence

**Genesis State is not the first state that exists; it is the first state a chosen state machine formally admits as canonical history.**

There can be many causal and construction states before it: physical conditions, reset state, firmware and program images, configuration, keys and allocations, empty/default objects, candidate states, validation results, and the act of commitment itself. What Genesis normally has no predecessor *inside* is the canonical history defined by that protocol.

That distinction resolves the apparent contradiction:

- **Inside canonical history:** Genesis is `G0`; there is no canonical `G-1` unless the protocol defines one.
- **Inside the initialization process:** candidate and validation states can exist before `G0`.
- **Inside the real machine:** power, reset, storage, firmware, clocks, memory, processes, and network state all pre-exist the canonical ledger state.
- **Inside the causal world:** fabrication, configuration, human decisions, and environmental conditions precede all of those.

## 1. Terminology and truth status

### What is verified

Ethereum's consensus specification explicitly constructs a `candidate_state` for incoming Ethereum proof-of-work blocks before beacon-chain genesis. The first candidate satisfying `is_valid_genesis_state(...)` becomes `genesis_state`. This is direct evidence of **pre-genesis candidate states** in the initialization procedure, followed by an admission gate and then a canonical genesis state. See the official [Ethereum Phase 0 beacon-chain specification](https://ethereum.github.io/consensus-specs/specs/phase0/beacon-chain/#genesis).

Ethereum's execution model separately formalizes successive state transitions such as `σ_(t+1) = Υ(σ_t, T)` and distinguishes the persistent world state from a transaction's transient machine state. See the [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf).

Bitcoin's founding paper talks primarily in terms of a timestamped chain of blocks and transactions rather than a universal metaphysical “state zero.” Its first block is the boundary of that chain, not the origin of the computers, keys, software, or decisions that constructed it. See the [Bitcoin whitepaper](https://bitcoin.org/bitcoin.pdf).

### What comes from the Stateborn RPG / AXM vocabulary

In the shared Stateborn framing, **Genesis State** was our name for the beginning of an admitted state history, borrowing the crypto/state-machine intuition of “state 0.” The exact old wording is not present in the retained material I could verify, so it should not be reconstructed as a quotation. The user's correction supplies the authoritative lineage: **Stateborn RPG term, rooted in crypto's genesis/state-zero idea.**

For this atlas, the term is made precise as:

> **Genesis State (`G0`)** — the first state accepted as canonical by a named state machine under a named rule set and boundary.

This is an AXM working definition, not a claim that every computer-science field uses the phrase identically.

### What is inferred

Genesis is best understood as an **admission boundary**, not an ontological beginning. A state becomes Genesis when the system says: “from here onward, transitions count as our official history.”

## 2. The states before Genesis

The numbering below is relational, not a universal standard. Negative labels mean “causally before the canonical boundary,” not canonical block heights.

| Relative state | State family | Examples | What makes it pre-genesis |
|---|---|---|---|
| `G−∞` | Physical and historical substrate | chip fabrication, board wiring, storage charge, network topology, human design decisions | These make the future state machine possible but are outside its formal history. |
| `G−5` | Platform availability | power rails, clocks, reset lines, CPU reset vector, RAM condition, device presence | The machine must reach an executable condition before protocol initialization. |
| `G−4` | Rule and identity material | protocol version, program image, firmware, chain parameters, schemas, keys, participant identities | These determine how later bytes will be interpreted and who may act. |
| `G−3` | Source/configuration inputs | allocations, deposits, initial validators, timestamps, seeds, environment values, genesis file | These are ingredients, not yet the accepted state. |
| `G−2` | Empty/default construction | zeroed or unspecified fields, empty state object, allocated memory, initialized containers | The state representation exists before valid domain content is admitted. |
| `G−1` | Candidate state(s) | candidate ledger state, proposed membership, derived root, tentative configuration | A candidate can be rejected, replaced, or recomputed. |
| `Gate` | Validation and commitment | invariant checks, quorum, signature checks, threshold checks, hash/root commitment, durable write | The gate distinguishes “possible” from “canonical.” |
| `G0` | Genesis State | first accepted ledger/world/configuration state | First canonical state under the chosen rules. |
| `G1+` | Normal transition history | blocks, transactions, events, commands, state deltas | Each admitted transition derives from the prior canonical state. |

The clean rule is:

> **No canonical predecessor does not mean no causal predecessor.**

Ethereum makes this unusually visible. Its initialization routine starts with an empty beacon-state structure, fills fields and processes deposits to create candidates, tests validity, and only then designates the first passing candidate as the genesis state.

## 3. What a machine state actually is

A useful machine state is never “just some bits.” At a named boundary, it has at least these parts:

`State = carrier + encoding + interpreter + transition rule + ordering + authority + provenance`

| Part | Question it answers | Example |
|---|---|---|
| **Carrier** | What physically or logically holds the distinction? | capacitor charge, register, RAM page, disk cell, database row, replicated log |
| **Encoding** | Which patterns stand for which symbols? | voltage threshold → bit; bytes → opcode; JSON bytes → fields |
| **Interpreter** | What gives the pattern operational meaning? | gate circuit, CPU ISA, decoder, runtime, application schema, human language |
| **Transition rule** | What may change the current state into the next? | clock edge, instruction, interrupt, syscall, transaction, consensus rule |
| **Ordering** | Which change counts first? | oscillator edge, program order, event loop, log index, block height |
| **Authority** | Who or what may cause or accept a change? | enable line, privilege mode, page permission, signature, role, quorum, consent |
| **Provenance** | How do we know where the state came from? | sensor trace, log, journal, hash, signature, receipt, witness |

### Code and data are roles, not substances

The same byte pattern can be treated as an instruction, an integer, text, compressed data, a cryptographic key, or meaningless noise. The difference is the **interpreter and context**, not the bytes alone.

This makes “code” a special role of state:

> **Code is state interpreted as transition instructions for other state.**

Compilers demonstrate this explicitly. LLVM describes its in-memory intermediate representation, bitcode, and human-readable assembly as different encodings of equivalent program structure. See the [LLVM Language Reference](https://llvm.org/docs/LangRef.html).

## 4. The layer map: physics to human meaning

This is an invariant family map across mainstream digital computers and distributed systems. Particular machines may merge, omit, duplicate, or hide layers.

| # | Layer | Main state carriers | Typical codes / alphabets | Transition engine | What the layer does |
|---:|---|---|---|---|---|
| 0 | **Environment and energy** | temperature, electromagnetic field, mechanical position, power rails, photons | continuous physical quantities and tolerances | physical law, power supply, cooling, mechanical action | Establishes whether any machine distinction can be maintained. |
| 1 | **Semiconductor / device physics** | charge, current, voltage, resistance, threshold voltage | analog ranges; device-specific levels | transistor physics, sensing, amplification | Creates controllable physical distinctions. A transistor is not “a bit”; circuits interpret ranges as symbols. |
| 2 | **Signal integrity, clock, and reset** | wires, buses, clock trees, reset lines, synchronizers | voltage thresholds, pulse widths, frequency, phase, timing windows | oscillators, PLLs, reset controllers, synchronizers | Decides when a value is stable enough to sample and when a machine begins an architectural episode. Metastability shows the substrate is not perfectly binary. |
| 3 | **Combinational logic** | gate inputs and outputs | Boolean `0/1`; hardware-description simulations may also represent unknown/high-impedance values | logic propagation | Computes outputs from current inputs without intended memory. |
| 4 | **Sequential logic / local FSM** | latches, flip-flops, counters, control registers | bits, register fields, finite-state labels | clock edges, enables, asynchronous reset/set | Retains history and implements small state machines. |
| 5 | **Storage media and hierarchy** | SRAM cells, DRAM cells, flash cells, magnetic domains, caches, sectors/pages/blocks | bits, words, cache lines, ECC codewords, NAND threshold levels | memory controller, refresh, cache policy, flash translation, storage controller | Preserves state over different time scales. NAND may encode multiple bits per cell through multiple threshold-voltage levels. |
| 6 | **Microarchitecture** | pipeline registers, micro-ops, reorder buffers, caches, branch predictors, TLBs | implementation-private control fields and tags | fetch/decode/issue/execute/retire machinery | Realizes an ISA efficiently. Much of this state is intentionally invisible to ordinary software. |
| 7 | **ISA / architectural machine** | program counter, general registers, flags, control/status registers, architecturally visible memory | opcodes, operands, addresses, privilege fields, exceptions | instruction execution, trap/interrupt rules | Defines the state software can rely on across implementations. RISC-V separates this contract from microarchitecture. |
| 8 | **Firmware and boot** | ROM/flash image, firmware variables, measured-boot registers, device tables, boot configuration | machine code, UEFI structures, firmware volumes, ACPI tables | reset vector, SEC/PEI/DXE-style phases, boot manager | Converts reset state into a described platform and loads the next execution environment. |
| 9 | **Hypervisor / virtual-machine boundary** | virtual CPUs, guest memory maps, virtual devices, second-level page tables | virtual ISA state, VM-control fields, emulated device protocols | trap-and-emulate, hardware virtualization, VM scheduler | Projects one physical platform into multiple isolated apparent machines. |
| 10 | **OS kernel and drivers** | tasks, page tables, file descriptors, sockets, device queues, credentials, interrupt state | syscalls, ioctls, file modes, input event type/code/value, packet buffers | scheduler, virtual-memory manager, VFS, network stack, drivers | Multiplexes hardware, enforces protection, and turns devices into stable software interfaces. |
| 11 | **Process, ABI, and system-call boundary** | process address space, threads, stacks, registers, handles, environment | calling convention, object format, syscall numbers, signals, IPC messages | loader, dynamic linker, syscall/trap entry, IPC | Gives programs a portable-enough contract with the OS and with other compiled components. |
| 12 | **Compiler, linker, and IR** | source tree, syntax/semantic graphs, IR, object files, symbols, relocations | source language, SSA/IR, assembly, machine code, debug metadata | parsing, optimization, code generation, linking | Translates human-oriented program descriptions into executable encodings while preserving selected meanings. |
| 13 | **Language runtime / VM** | heap, objects, stacks, frames, bytecode PC, GC roots, module/class tables | bytecode, type tags, object layouts, references | interpreter, JIT, garbage collector, exception machinery | Provides a higher-level abstract machine. JVM and WebAssembly explicitly define runtime state structures. |
| 14 | **Application / domain model** | entities, component state, reducers, workflows, queues, permissions | domain objects, commands, events, schemas, API calls | business rules, reducers, handlers, workflow engine | Converts general computation into a named human task such as editing, trading, messaging, or controlling a robot. |
| 15 | **Persistence / transaction layer** | files, records, indexes, journals, write-ahead logs, snapshots | file formats, SQL rows, keys, checksums, transaction records | commit protocol, locking/MVCC, journaling, flush, recovery | Makes selected application states durable and recoverable. “Returned from save” and “physically durable” are different boundaries unless the contract joins them. |
| 16 | **Network / protocol** | NIC rings, frames, packets, connection-control blocks, streams, request state | Ethernet, IP, TCP flags and sequence numbers, TLS records, HTTP messages | protocol finite-state machines, retransmission, routing, congestion control | Moves encoded state between machines while managing partial failure and reordering. TCP's `CLOSED` is even described as a fictional state representing absence of a connection record. |
| 17 | **Distributed log / consensus / ledger** | replicated logs, terms/epochs, votes, blocks, state roots, validator sets | commands, quorum certificates, hashes, signatures, Merkle commitments | leader/quorum consensus, validity rules, deterministic replay | Creates one admitted order across machines that do not share memory or perfect time. This is where a protocol-level Genesis State usually lives. |
| 18 | **Presentation, input, and rendering** | DOM/widget trees, focus, event queues, scene graphs, framebuffers, display-plane state | key/event codes, UI events, pixels, color values, accessibility trees | event loop, layout, compositor, GPU, display controller | Translates between human actions and application events, then between application state and perceivable output. |
| 19 | **Human semantic and social layer** | memory, language, documents, organizations, norms, agreements | words, symbols, laws, goals, consent, trust, interpretation | cognition, conversation, institutions, decision and action | Supplies purpose and evaluates consequences. Machines can carry encodings of these concepts but do not gain their full meaning merely by storing the symbols. |

### Important evidence behind the lower layers

- Intel's transistor overview explains how transistors combine into logic gates, circuits, and processors: [The transistor explained](https://www.intel.com/content/www/us/en/newsroom/tech101/the-transistor-explained.html).
- TI documents the electrical limits and voltage thresholds by which logic families interpret physical signals: [Logic Guide](https://www.ti.com/lit/an/szza036b/szza036b.pdf).
- TI documents metastability when timing requirements are violated, showing why physical sampling cannot be reduced to an ideal timeless bit: [Metastable Response in 5-V Logic Circuits](https://www.ti.com/lit/pdf/sdya006).
- Micron describes NAND storage in terms of threshold-voltage levels, including SLC, TLC, and QLC encodings: [Micron NAND/SSD white paper](https://www.micron.com/content/dam/micron/global/public/products/storage/ssds/client/3610/white-paper-3610-enabling-performance-ai-model-loading.pdf).

### Important evidence behind the platform and software layers

- A RISC-V execution-environment interface defines a program's initial state, harts, memory and I/O access, and handling of interrupts and exceptions. Execution environments can be layered; bare hardware begins at power-on reset: [RISC-V Unprivileged ISA — Introduction](https://docs.riscv.org/reference/isa/v20260120/unpriv/intro.html).
- RISC-V machine mode is entered at reset. The reset program counter is implementation-defined and much other hart state may be unspecified. Reset causes can include power-on, external hard reset, brownout, watchdog, and wakeup: [RISC-V Privileged ISA — Machine Level](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html). Reset is therefore an architectural boundary imposed on earlier physical and platform conditions, not the beginning of all state.
- Privileged interfaces form a stack: application/ABI, OS/SBI, hypervisor/HBI, and machine environment: [RISC-V Privileged Architecture — Introduction](https://docs.riscv.org/reference/isa/v20260120/priv/priv-intro.html).
- UEFI Platform Initialization divides early firmware work into phases that discover and initialize enough platform state for later phases: [UEFI PI Overview](https://uefi.org/specs/PI/1.9/V1_Overview.html).
- Linux's x86 boot protocol specifies the data structures, addresses, and handoff by which a bootloader transfers control to a loaded kernel: [Linux x86 boot protocol](https://docs.kernel.org/arch/x86/boot.html).
- NIST treats the platform's foundational hardware and firmware as the base needed to boot and operate, and defines protection, detection, and recovery around platform firmware: [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final).

### Important evidence behind runtime, UI, network, and distributed layers

- Linux virtual memory translates virtual addresses to physical addresses using hierarchical page tables and caches translations in TLBs: [Linux memory-management concepts](https://docs.kernel.org/admin-guide/mm/concepts.html).
- The JVM specifies an abstract machine with a program counter, VM stacks, heap, method area, run-time constant pools, frames, local variables, and operand stacks: [Java Virtual Machine Specification, Chapter 2](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html).
- WebAssembly defines a store containing mutable global state and stacks containing values and control frames: [WebAssembly runtime structure](https://webassembly.github.io/spec/core/exec/runtime.html).
- Browser event loops maintain task and microtask queues and connect events, callbacks, parsing, resource processing, DOM reactions, and rendering updates: [HTML Standard — Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops).
- Linux input events are stateful `type`, `code`, and `value` messages. For key events, values commonly distinguish release (`0`), press (`1`), and repeat (`2`): [Linux input event codes](https://docs.kernel.org/input/event-codes.html).
- Linux's display stack models framebuffers, planes, CRTCs, encoders, and connectors, with atomic state validation and commitment: [Linux DRM/KMS](https://docs.kernel.org/gpu/drm-kms.html).
- TCP defines a connection state machine including `LISTEN`, `SYN-SENT`, `ESTABLISHED`, and closing states: [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html).
- Raft explains replicated state machines as deterministic machines driven by the same ordered command log: [In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf).
- SQLite's atomic-commit documentation follows data through application memory, the operating-system cache, storage, journals, locks, flushes, failure, and recovery: [Atomic Commit in SQLite](https://www.sqlite.org/atomiccommit.html).

## 5. The web is not a simple stack

The numbered layers are readable as a stack, but real causality forms a web. Several axes cut across nearly every layer.

### Identity and addressing web

`physical cell/location → bus address → physical address → virtual address → pointer/reference → object ID → database key → protocol identity → human name`

These are translations, not synonyms. A virtual address is not a physical address; an object reference is not necessarily either; a wallet address is not a human identity; a display name is not cryptographic authority.

### Time and ordering web

`oscillator edge → device timing → CPU cycle → instruction order → scheduler order → event-loop order → transaction order → consensus log/block order → human chronology`

No single universal clock spans the whole web. Each boundary creates a local ordering promise and translation problem.

### Authority and permission web

`electrical enable → gate/control bit → CPU privilege → page protection → syscall policy → process credential → application role → signature/quorum → human consent`

A lower layer can make an action physically possible while an upper layer declares it forbidden. Conversely, a UI can claim permission while a lower layer rejects the operation. AXM's phrase “state is permission” belongs here: capability is always scoped to the boundary enforcing it.

### Evidence and provenance web

`sensor sample → hardware counter → trace → kernel log → application event → journal → signed message → hash/root → receipt → human record`

Every translation can preserve, compress, aggregate, reinterpret, or discard evidence. A trustworthy system identifies which happened.

### Fault and repair web

`noise/metastability → bit error/ECC → machine check/trap → driver error → syscall error → exception → rollback/recovery → UI message → human decision`

A fault at one layer often appears as an entirely different symbol above it. Repair requires tracing the translation path downward and the consequence path upward.

## 6. Signal trace A: a human keypress and its return path

1. **Human intention:** a person decides to enter a character.
2. **Mechanical/physical:** finger force closes or changes a switch; the signal may bounce and contains analog noise.
3. **Device electronics:** a keyboard controller scans a matrix, debounces the signal, and assigns a key position/usage.
4. **Device protocol:** firmware emits a USB HID report or equivalent device message.
5. **Host controller/driver:** electrical packets become buffers and then a device-level input event.
6. **Kernel input layer:** Linux can represent this as `EV_KEY`, a key code, and a value for press/release/repeat.
7. **Window system/compositor:** routing rules select the focused client and transform coordinates/modifiers as needed.
8. **Browser/runtime:** an event-loop task dispatches an event; language-runtime frames and objects carry it into a callback.
9. **Application:** a handler or reducer interprets the event under current app state and may emit a state delta.
10. **UI model:** DOM/widget/scene state changes; layout and paint data are recomputed.
11. **GPU/display:** commands modify buffers; the display pipeline scans framebuffer/plane state into a physical signal.
12. **Perception:** emitted photons reach the person, who interprets the glyph and decides whether it matches the original intention.

This is a loop, not a one-way command. Human confirmation closes the highest-level feedback path. At each seam, one code becomes another: force → voltage → scan position → HID usage → kernel code → UI event → character or command → pixel pattern → perceived meaning.

## 7. Signal trace B: what “Save” really means

1. An application mutates an in-memory object.
2. A serializer/database layer converts it to records, pages, or a log entry.
3. A transaction layer writes a journal or write-ahead log and establishes commit rules.
4. The operating system may first hold writes in its page cache.
5. A filesystem and block layer translate file offsets to block requests.
6. A storage controller translates logical blocks to physical media locations.
7. Flash translation and error correction may relocate and encode the data.
8. NAND cells retain threshold-voltage levels that a later read will interpret as symbols.

The word **saved** can therefore mean at least:

- changed in application memory;
- accepted by a database transaction;
- copied into an OS cache;
- sent to a device;
- acknowledged by a controller;
- durably represented on nonvolatile media;
- replicated to another failure domain.

Those are different states. Journals, ordered writes, flushes, barriers, checksums, and recovery rules create admission gates between them. SQLite's commit analysis is a concrete demonstration of this cross-layer mismatch.

## 8. Signal trace C: a blockchain transaction

1. **Human layer:** a user forms an intention such as transferring an asset.
2. **Application layer:** a wallet builds a domain operation and presents consequences.
3. **Encoding layer:** fields are serialized in a protocol-defined canonical form.
4. **Authority layer:** a private key signs a hash or structured message; the signature proves control under a cryptographic rule, not human understanding or consent by itself.
5. **Network layer:** packets and connections transport the candidate operation between machines.
6. **Node layer:** parsing, signature checks, balances/nonces, and other rules decide local validity and admission to a candidate pool.
7. **Consensus layer:** participants choose an order and a block/log position under protocol rules.
8. **State-transition layer:** deterministic execution transforms the prior world state into a proposed next state.
9. **Commitment layer:** hashes/Merkle roots commit to the ordered data and resulting state.
10. **Replication layer:** nodes adopt, reject, finalize, or later reorganize their local view depending on the consensus protocol.
11. **Presentation layer:** an explorer or wallet converts machine commitments back into human-facing claims such as “pending,” “confirmed,” or “final.”

The machine web can verify cryptographic and protocol facts. It cannot infer all the human facts people may read into them. “Valid signature” does not automatically mean “informed consent,” and “finalized state” does not automatically mean “morally or legally correct.”

## 9. Known capabilities of the machine web

Across these layers, known machines can:

- sense bounded physical differences;
- encode, decode, compare, and transform symbols;
- retain state for different durations;
- copy, route, schedule, and multiplex state;
- execute deterministic and stochastic transition rules;
- isolate and virtualize resources;
- validate conditions and reject invalid candidates;
- authenticate keys or principals under configured rules;
- order operations locally or by distributed consensus;
- commit, journal, snapshot, replicate, roll back, and recover;
- compress evidence into checksums, hashes, signatures, roots, and logs;
- render machine state into sound, light, motion, or actuator commands;
- accept human input and maintain feedback loops.

What the web does **not** obtain merely from more layers:

- intrinsic purpose;
- guaranteed truth about the outside world;
- human identity from a key alone;
- informed consent from a click or signature alone;
- moral legitimacy from protocol validity;
- complete observability of hidden or proprietary layers;
- a single universal clock or globally shared instantaneous state;
- proof that an upper-layer label perfectly matches lower-layer reality.

These require grounding, governance, evidence, or human judgment outside the narrow transition rule.

## 10. AXM design consequence: make Genesis an admission ceremony

For Stateborn/AXM, Genesis should be modeled as a **gate with receipts**, not a magical creation event.

### Proposed state sequence

`UNFORMED → CONFIGURED → INSTANTIATED → CANDIDATE → VALIDATED → COMMITTED/GENESIS → ACTIVE`

Failure branches should remain explicit:

`CANDIDATE → REJECTED`  
`VALIDATED → COMMIT_FAILED`  
`ACTIVE → DEGRADED / SUSPENDED / RECOVERING`

### Minimum Genesis evidence bundle

Before assigning `G0`, preserve:

1. the exact rule/specification version;
2. executable/code/firmware hashes where relevant;
3. platform and environment assumptions;
4. source inputs and their provenance;
5. identities, keys, roles, and authority boundaries;
6. configuration and initial allocations/membership;
7. seed/randomness source and timestamp semantics;
8. candidate-state encoding and root/hash;
9. validation checks and results;
10. who or what admitted the state;
11. commit/durability/replication evidence;
12. the first canonical identifier and a receipt linking all of the above.

This avoids silent rewrite. A corrected genesis should create a new named lineage or explicitly versioned genesis, not pretend the earlier candidate never existed.

### A practical node envelope

Every meaningful AXM node can expose the same small contract:

```text
NodeState {
  boundary        // which layer and scope this state belongs to
  identity        // which node/object/device/process it describes
  carrier         // where the state is held
  encoding        // schema, format, ISA, protocol, or unit
  current         // current state or reference to it
  allowed_next    // transition rules and permissions
  dependencies    // lower, peer, and upper state relied upon
  observations    // sensed or received evidence
  provenance      // source, time semantics, hashes/signatures/receipts
  confidence      // known, inferred, simulated, reported, unknown
}
```

The envelope does not flatten every layer into one format. It makes the translations and claims inspectable.

## 11. The most important seams to instrument

If the goal is a machine “signal map,” start at seams where meaning or authority changes:

| Seam | Typical translation | Main risk |
|---|---|---|
| Physics ↔ digital logic | voltage/timing range ↔ `0/1` | noise, metastability, threshold mismatch |
| Microarchitecture ↔ ISA | internal implementation ↔ architectural promise | hidden state, side channels, errata |
| Firmware ↔ OS | platform tables and boot handoff ↔ kernel model | unmeasured or malicious pre-OS state |
| Device ↔ driver | electrical/protocol report ↔ kernel event | spoofing, loss, mis-decoding |
| Kernel ↔ process | syscall/ABI ↔ program object | privilege bugs, partial failure |
| Compiler ↔ executable | source semantics ↔ machine instructions | undefined behavior, optimization mismatch, supply chain |
| Runtime ↔ application | bytecode/object state ↔ domain state | type/serialization/GC/lifetime mismatch |
| App ↔ persistence | object mutation ↔ durable commit | “saved” ambiguity, crash consistency |
| App ↔ network | local object ↔ protocol message | schema drift, authentication, replay |
| Node ↔ consensus | local candidate ↔ canonical order | fork, quorum assumptions, byzantine behavior |
| UI ↔ human | event/pixel/text ↔ intention and understanding | dark patterns, ambiguity, false confidence |
| Machine ↔ environment | actuator command ↔ physical outcome | calibration, delay, unsafe feedback |

## 12. Limits and open uncertainty

This atlas maps the **known invariant families**, not every possible state of every machine.

- The concrete state space is combinatorially too large to enumerate.
- Analog and quantum descriptions can be refined below any practical engineering boundary.
- Reset does not necessarily initialize every physical or architectural element; specifications may mark state as unspecified.
- Proprietary microcode, firmware, accelerators, cloud-control planes, and vendor services hide portions of the web.
- Distributed systems do not share a perfectly instantaneous global state; observations arrive with delay and may conflict.
- Human meaning and social legitimacy are not completely formalizable as machine state.
- Security boundaries are claims enforced by mechanisms; they can fail through implementation defects, side channels, or compromised lower layers.
- The “lowest” and “highest” layers depend on the investigation boundary. A biologist, physicist, lawyer, or sociologist can legitimately extend the map in either direction.

## 13. Final finding

The Stateborn term survives the research, but its meaning becomes sharper:

> **Genesis State is the first admitted truth of a named machine history, not the first condition in reality.**

Pre-genesis is not one hidden mystical state. It is a **web of prerequisite, candidate, validation, and commitment states distributed across layers**. The practical power of the machine web comes from translating state between those layers; its practical danger comes from forgetting that each translation changes the carrier, code, authority, and evidence.

For AXM, the correct design move is to preserve the pre-genesis trail, make the admission gate visible, and attach receipts to every cross-layer claim.

