# Genesis State Machine-Web Source Ledger

**Accessed:** 2026-09-04 UTC  
**Companion research:** `RESEARCH/GENESIS_STATE_MACHINE_WEB.md`

This ledger separates externally verified mechanisms from the Stateborn/AXM synthesis. Links point to specifications, standards, vendor engineering documents, or original research rather than secondary summaries.

| Area | Primary source | What it supports | Boundary |
|---|---|---|---|
| Blockchain genesis | [Ethereum Phase 0 beacon-chain specification](https://ethereum.github.io/consensus-specs/specs/phase0/beacon-chain/#genesis) | Constructs `candidate_state` values before the first valid candidate becomes `genesis_state`. | Direct evidence for Ethereum initialization; not proof that every protocol uses the same terminology. |
| Blockchain transition | [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) | Formal world-state and transaction machine-state transitions. | Ethereum execution model. |
| First-chain boundary | [Bitcoin whitepaper](https://bitcoin.org/bitcoin.pdf) | Timestamped chain and transaction ancestry. | Uses genesis-block practice rather than a universal Genesis State definition. |
| Execution environments | [RISC-V unprivileged ISA introduction](https://docs.riscv.org/reference/isa/v20260120/unpriv/intro.html) | EEIs define initial state and can be layered; bare hardware begins at power-on reset. | ISA/EEI contract, not complete device physics. |
| Reset state | [RISC-V privileged ISA — machine level](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html) | Reset mode, reset vector, causes, and unspecified hart state. | Architectural boundary; implementations may differ. |
| Privilege layering | [RISC-V privileged architecture introduction](https://docs.riscv.org/reference/isa/v20260120/priv/priv-intro.html) | ABI, SBI, HBI, and machine-environment layering. | RISC-V architecture. |
| Transistors | [Intel — The Transistor Explained](https://www.intel.com/content/www/us/en/newsroom/tech101/the-transistor-explained.html) | Transistors combine into gates, circuits, and processors. | Introductory vendor explanation, not a transistor-device specification. |
| Logic thresholds | [Texas Instruments Logic Guide](https://www.ti.com/lit/an/szza036b/szza036b.pdf) | Electrical voltage ranges interpreted as logic levels. | Logic-family electrical contracts. |
| Metastability | [TI — Metastable Response in 5-V Logic Circuits](https://www.ti.com/lit/pdf/sdya006) | Sampling near timing limits can create metastable physical state. | Device-family study; general mechanism, not universal measured values. |
| Flash encoding | [Micron NAND/SSD white paper](https://www.micron.com/content/dam/micron/global/public/products/storage/ssds/client/3610/white-paper-3610-enabling-performance-ai-model-loading.pdf) | NAND threshold-voltage levels encode one or more bits per cell. | Vendor storage example. |
| Firmware phases | [UEFI Platform Initialization overview](https://uefi.org/specs/PI/1.9/V1_Overview.html) | Early firmware phases establish platform state for later execution. | UEFI PI platforms. |
| Boot handoff | [Linux x86 boot protocol](https://docs.kernel.org/arch/x86/boot.html) | Bootloader-to-kernel data structures and control handoff. | Linux on x86. |
| Firmware resilience | [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final) | Platform firmware protection, detection, and recovery. | Security guidance, not implementation proof. |
| Virtual memory | [Linux memory-management concepts](https://docs.kernel.org/admin-guide/mm/concepts.html) | Virtual-to-physical translation through page tables and TLBs. | Linux documentation; architecture details vary. |
| Compiler representations | [LLVM Language Reference](https://llvm.org/docs/LangRef.html) | In-memory IR, bitcode, and human-readable assembly representations. | LLVM IR ecosystem. |
| Language VM | [Java Virtual Machine Specification, Chapter 2](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html) | PC, stacks, heap, method area, frames, locals, and operand stacks. | JVM abstract machine. |
| Portable runtime | [WebAssembly runtime structure](https://webassembly.github.io/spec/core/exec/runtime.html) | Store, stack values, control frames, and mutable runtime state. | WebAssembly core semantics. |
| Input translation | [Linux input event codes](https://docs.kernel.org/input/event-codes.html) | Stateful event type/code/value messages including key press, release, and repeat. | Linux input subsystem. |
| Browser ordering | [HTML Standard — Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) | Task/microtask ordering, callbacks, DOM reactions, and rendering updates. | Web-platform event-loop model. |
| Display output | [Linux DRM/KMS](https://docs.kernel.org/gpu/drm-kms.html) | Framebuffers, planes, CRTCs, encoders, connectors, and atomic state commits. | Linux graphics subsystem. |
| Network state machine | [RFC 9293 — TCP](https://www.rfc-editor.org/rfc/rfc9293.html) | Connection states, transitions, flags, sequencing, and the fictional `CLOSED` state. | TCP, not all network protocols. |
| Replicated state machine | [Raft paper](https://raft.github.io/raft.pdf) | Deterministic machines driven by the same ordered command log. | Crash-fault consensus model described by Raft. |
| Durable commit | [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html) | State crossing application memory, OS cache, journal, storage, interruption, and recovery. | SQLite/filesystem/storage assumptions are documented explicitly. |

## Synthesis boundary

The sources establish particular state carriers, encodings, transitions, initialization steps, and layer contracts. They do **not** establish the full 20-layer AXM map as a standard, prove AXM novelty, or use the Stateborn RPG meaning of Genesis State.

The companion report's central synthesis—**Genesis is the first admitted canonical state of a named machine history, not the first causal condition in reality**—is an evidence-backed AXM interpretation of the cited mechanisms.

