from __future__ import annotations

import argparse
from copy import deepcopy
import html
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Mapping

from genesis_admission import GenesisAdmissionMachine, canonical_bytes, verify_bundle
from local_commit_store import LocalGenesisCommitStore, commit_with_local_store, verify_local_genesis_bundle

STORY_SCHEMA = "axm.genesis-admission-observer-story/v1"
PHASE_ORDER = [
    "UNFORMED",
    "CONFIGURED",
    "INSTANTIATED",
    "CANDIDATE",
    "VALIDATED",
    "GENESIS",
    "ACTIVE",
]

PHASE_COPY = {
    "UNFORMED": {
        "label": "Unformed",
        "meaning": "A named admission attempt exists, but no configuration receipt has been created.",
        "next_action": "Configure the rule version, executable identity, and platform assumptions.",
    },
    "CONFIGURED": {
        "label": "Configured",
        "meaning": "Configuration evidence is now receipted. This is still construction evidence, not canonical history.",
        "next_action": "Instantiate the source inputs, identities, initial configuration, randomness, and time semantics.",
    },
    "INSTANTIATED": {
        "label": "Instantiated",
        "meaning": "The proposed machine context is bound into evidence, but no candidate state has been admitted.",
        "next_action": "Propose one exact candidate state for validation.",
    },
    "CANDIDATE": {
        "label": "Candidate",
        "meaning": "A candidate exists and has a digest. Candidate identity is not Genesis identity.",
        "next_action": "Run the declared validation checks without granting the candidate canonical status.",
    },
    "VALIDATED": {
        "label": "Validated",
        "meaning": "All declared checks passed. G0 still does not exist until commit evidence is accepted.",
        "next_action": "Persist the exact validated admission and obtain bounded commit evidence.",
    },
    "GENESIS": {
        "label": "Genesis / G0",
        "meaning": "The admission machine accepted durable commit evidence and issued the first canonical identity for this lineage.",
        "next_action": "Activate the already-admitted canonical state. Do not reinterpret G0 from the display.",
    },
    "ACTIVE": {
        "label": "Active",
        "meaning": "The admitted G0 identity is active. The observer remains read-only and cannot advance canonical state.",
        "next_action": "Inspect the receipt chain or begin later canonical transitions in a separate authoritative runtime.",
    },
}


def _latest_receipt(bundle: Mapping[str, Any]) -> Mapping[str, Any] | None:
    receipts = bundle.get("pre_genesis_receipts")
    if not isinstance(receipts, list) or not receipts:
        return None
    return deepcopy(receipts[-1])


def _frame(
    machine: GenesisAdmissionMachine,
    *,
    local_verdict: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    bundle = machine.export_receipt_bundle()
    verdict = verify_bundle(bundle)
    if verdict.get("status") != "PASS":
        raise RuntimeError(f"observer source bundle did not verify: {verdict}")

    phase = machine.phase
    if phase not in PHASE_COPY:
        raise RuntimeError(f"observer does not know phase {phase!r}")

    latest = _latest_receipt(bundle)
    genesis = bundle.get("genesis")
    canonical_id = verdict.get("canonical_id")
    commit_evidence: Mapping[str, Any] | None = None
    if isinstance(genesis, Mapping):
        evidence = genesis.get("evidence")
        if isinstance(evidence, Mapping):
            maybe_commit = evidence.get("commit_evidence")
            if isinstance(maybe_commit, Mapping):
                commit_evidence = maybe_commit

    storage: Mapping[str, Any] = {}
    if commit_evidence is not None and isinstance(commit_evidence.get("storage"), Mapping):
        storage = commit_evidence["storage"]

    receipt_count = len(bundle.get("pre_genesis_receipts", []))
    transition = "No transition receipt yet"
    receipt_digest = None
    receipt_evidence: Mapping[str, Any] = {}
    if latest is not None:
        transition = f"{latest.get('from')} → {latest.get('to')}"
        receipt_digest = latest.get("receipt_digest")
        if isinstance(latest.get("evidence"), Mapping):
            receipt_evidence = latest["evidence"]

    if phase in {"GENESIS", "ACTIVE"}:
        zone = "CANONICAL HISTORY"
        canonical_status = "G0 ADMITTED" if phase == "GENESIS" else "ACTIVE CANONICAL"
    else:
        zone = "PRE-GENESIS EVIDENCE"
        canonical_status = "NOT ISSUED"

    return {
        "phase": phase,
        "phase_index": PHASE_ORDER.index(phase),
        "label": PHASE_COPY[phase]["label"],
        "zone": zone,
        "canonical_status": canonical_status,
        "canonical_id": canonical_id,
        "meaning": PHASE_COPY[phase]["meaning"],
        "next_action": PHASE_COPY[phase]["next_action"],
        "receipt_count": receipt_count,
        "transition": transition,
        "receipt_digest": receipt_digest,
        "receipt_evidence": deepcopy(dict(receipt_evidence)),
        "preparation_id": commit_evidence.get("preparation_id") if commit_evidence else None,
        "prepared_bytes": commit_evidence.get("prepared_bytes") if commit_evidence else None,
        "file_fsync_observed": storage.get("file_fsync_observed") if storage else None,
        "directory_fsync_observed": storage.get("directory_fsync_observed") if storage else None,
        "local_verification": deepcopy(dict(local_verdict)) if local_verdict else None,
    }


def build_story() -> dict[str, Any]:
    """Exercise the real admission machine and local fsync provider, then return display-only frames."""
    machine = GenesisAdmissionMachine("observer-lineage")
    frames = [_frame(machine)]

    machine.configure(
        rule_version="rules/observer-v1",
        executable_hashes={"engine": "sha256:observer-fixture-engine"},
        platform_assumptions={"execution": "single-process deterministic observer fixture"},
    )
    frames.append(_frame(machine))

    machine.instantiate(
        source_inputs={"allocations": {"alpha": 3}, "provenance": "observer-fixture/v1"},
        identities={"admitter": "operator:observer", "roles": ["validator"]},
        initial_configuration={"network": "offline"},
        randomness={"kind": "fixed", "seed": 7},
        timestamp_semantics="logical-only",
    )
    frames.append(_frame(machine))

    machine.propose({"members": ["alpha"], "balance": 3})
    frames.append(_frame(machine))

    machine.validate(
        [
            {"name": "balance_nonnegative", "passed": True, "evidence": {"balance": 3}},
            {"name": "member_present", "passed": True, "evidence": {"member": "alpha"}},
        ]
    )
    frames.append(_frame(machine))

    with TemporaryDirectory(prefix="axm-genesis-observer-") as root:
        store = LocalGenesisCommitStore(root)
        commit_with_local_store(machine, store, admitted_by="operator:observer")
        local_verdict = verify_local_genesis_bundle(machine.export_receipt_bundle(), store)
        if local_verdict.get("status") != "PASS":
            raise RuntimeError(f"local Genesis evidence did not verify: {local_verdict}")
        frames.append(_frame(machine, local_verdict=local_verdict))

        machine.activate()
        local_verdict = verify_local_genesis_bundle(machine.export_receipt_bundle(), store)
        if local_verdict.get("status") != "PASS":
            raise RuntimeError(f"active Genesis evidence did not verify: {local_verdict}")
        frames.append(_frame(machine, local_verdict=local_verdict))

    return {
        "schema": STORY_SCHEMA,
        "lineage": machine.lineage,
        "phase_order": list(PHASE_ORDER),
        "frames": frames,
        "truth_boundary": {
            "observer_authority": "DISPLAY_ONLY_NO_STATE_TRANSITION_AUTHORITY",
            "pre_genesis": "evidence_only_not_canonical_history",
            "fsync": "process_observed_file_and_directory_fsync_not_power_loss_proof",
            "canonical_identity": "issued_only_by_existing_admission_machine_after_commit_evidence",
        },
    }


CSS = r"""
:root{color-scheme:dark;--bg:#071019;--panel:#0d1823;--line:#294158;--text:#eef6fb;--muted:#9fb1bf;--cyan:#6eddf3;--amber:#f2bf62;--green:#79e6a5;--danger:#ffb0a3;--shadow:0 24px 80px rgba(0,0,0,.34)}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-width:280px;font:15px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 18% 0%,rgba(110,221,243,.10),transparent 34rem),radial-gradient(circle at 92% 16%,rgba(242,191,98,.09),transparent 30rem),var(--bg)}
button{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 44px}.topline{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase;background:rgba(9,20,31,.72)}
.hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(250px,.6fr);gap:20px;align-items:end;margin-bottom:22px}.eyebrow{color:var(--cyan);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px}.hero h1{font-size:clamp(32px,6vw,72px);line-height:.95;letter-spacing:-.045em;margin:8px 0 14px}.hero p{max-width:760px;color:var(--muted);font-size:17px;margin:0}.boundary{border:1px solid var(--line);border-radius:18px;padding:15px;background:rgba(13,24,35,.82);box-shadow:var(--shadow)}.boundary strong{display:block;color:var(--amber);margin-bottom:5px}.boundary span{color:var(--muted);font-size:13px}
.rail-wrap{position:relative;margin:22px 0}.rail-wrap:after{content:"G0 ADMISSION";position:absolute;left:71.4%;top:-12px;transform:translateX(-50%);padding:2px 8px;background:var(--bg);color:var(--amber);font-size:10px;letter-spacing:.12em}.rail{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:12px;border:1px solid var(--line);border-radius:20px;background:rgba(8,17,26,.78);overflow:hidden}.phase{min-height:64px;padding:9px;border:1px solid transparent;border-radius:13px;background:#101f2c;color:var(--muted);cursor:pointer;text-align:left;transition:transform .16s ease,border-color .16s ease,background .16s ease}.phase small{display:block;opacity:.72;font-size:10px;letter-spacing:.09em;margin-bottom:3px}.phase:hover{border-color:#44627a}.phase[aria-current="step"]{border-color:var(--cyan);background:#122938;color:var(--text);transform:translateY(-2px)}.phase[data-zone="canon"]{box-shadow:inset 0 2px 0 rgba(121,230,165,.55)}.phase:focus-visible,.control:focus-visible{outline:3px solid #fff;outline-offset:3px}
.workspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(310px,.65fr);gap:18px}.panel{border:1px solid var(--line);border-radius:22px;background:linear-gradient(180deg,rgba(16,31,44,.96),rgba(9,19,29,.96));box-shadow:var(--shadow)}.main-panel{padding:24px}.side{padding:20px}.state-head{display:flex;justify-content:space-between;gap:16px;align-items:start;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:18px}.state-kicker{color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}.state-title{font-size:clamp(28px,5vw,50px);line-height:1;margin:5px 0}.status{border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;letter-spacing:.08em;white-space:nowrap;border:1px solid var(--amber);color:var(--amber)}.status.canonical{border-color:var(--green);color:var(--green)}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fact{border:1px solid #22384b;border-radius:14px;padding:12px;background:rgba(6,15,23,.55);min-width:0}.fact span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.fact strong,.fact code{display:block;margin-top:5px;overflow-wrap:anywhere;color:var(--text)}.fact.wide{grid-column:1/-1}.not-issued{color:var(--amber)!important}.issued{color:var(--green)!important}
.meaning{margin:20px 0 0;padding:16px 18px;border-left:3px solid var(--cyan);background:rgba(110,221,243,.055);border-radius:0 14px 14px 0}.meaning h2,.side h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px;color:var(--cyan)}.meaning p{font-size:18px;margin:0}.next{margin-top:16px;padding:16px 18px;border:1px solid rgba(242,191,98,.3);border-radius:14px;background:rgba(242,191,98,.05)}.next strong{display:block;color:var(--amber);font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}.next p{margin:0}
.receipt{display:grid;gap:10px}.evidence-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #213648;padding:8px 0}.evidence-row span{color:var(--muted)}.evidence-row strong{text-align:right;overflow-wrap:anywhere}.fsync{display:grid;grid-template-columns:1fr 1fr;gap:8px}.signal{border:1px solid #294158;border-radius:12px;padding:10px;text-align:center;color:var(--muted)}.signal.observed{border-color:rgba(121,230,165,.55);color:var(--green)}.signal b{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.signal span{display:block;margin-top:3px}.hold-note{margin:12px 0 0;color:var(--muted);font-size:12px}.exact{margin-top:15px}.exact summary{cursor:pointer;color:var(--muted)}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#050b11;border:1px solid #1d3142;border-radius:12px;padding:12px;max-height:260px;overflow:auto;color:#c7d8e4;font-size:11px}
.controls{display:flex;gap:10px;margin-top:18px}.control{min-height:46px;flex:1;border:1px solid #35516a;border-radius:13px;background:#102335;color:var(--text);cursor:pointer;font-weight:750}.control:disabled{opacity:.35;cursor:not-allowed}.control.next{margin:0;padding:0;background:#143145;border-color:#4a728c}
.footer{margin-top:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.footer div{border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font-size:12px}.footer strong{color:var(--text);display:block;margin-bottom:2px}
@media (max-width:780px){.shell{width:min(100% - 20px,680px);padding-top:18px}.hero,.workspace{grid-template-columns:1fr}.hero h1{font-size:44px}.rail-wrap:after{display:none}.rail{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px}.phase{min-width:126px;min-height:52px;scroll-snap-align:center}.main-panel,.side{padding:17px}.state-head{align-items:flex-start}.facts{grid-template-columns:1fr}.fact.wide{grid-column:auto}.footer{grid-template-columns:1fr}.evidence-row{display:block}.evidence-row strong{display:block;text-align:left;margin-top:3px}.fsync{grid-template-columns:1fr}.controls{position:sticky;bottom:8px;background:rgba(7,16,25,.92);padding:8px;border-radius:15px;backdrop-filter:blur(10px)}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}.phase[aria-current="step"]{transform:none}}
@media (prefers-contrast:more){:root{--line:#7f97a8;--muted:#d3dce3}.panel,.rail,.boundary,.fact{border-width:2px}.phase[aria-current="step"]{outline:2px solid var(--cyan)}}
@media (max-width:780px){.controls{position:static;bottom:auto;background:transparent;padding:0;border-radius:0;backdrop-filter:none}}
"""

JS = r"""
(() => {
  const story = window.__AXM_GENESIS_STORY__;
  const phaseButtons = [...document.querySelectorAll('[data-phase-index]')];
  const status = document.querySelector('#canonical-status');
  const zone = document.querySelector('#zone');
  const phaseLabel = document.querySelector('#phase-label');
  const transition = document.querySelector('#transition');
  const receipts = document.querySelector('#receipt-count');
  const canonicalId = document.querySelector('#canonical-id');
  const preparation = document.querySelector('#preparation-id');
  const meaning = document.querySelector('#meaning-copy');
  const nextAction = document.querySelector('#next-action');
  const receiptDigest = document.querySelector('#receipt-digest');
  const preparedBytes = document.querySelector('#prepared-bytes');
  const fileFsync = document.querySelector('#file-fsync');
  const dirFsync = document.querySelector('#dir-fsync');
  const localVerify = document.querySelector('#local-verify');
  const exact = document.querySelector('#exact-evidence');
  const live = document.querySelector('#live');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  let selected = 0;

  const textOr = (value, fallback = 'Not present in this phase') => value === null || value === undefined ? fallback : String(value);
  function render(index, announce = true) {
    selected = Math.max(0, Math.min(story.frames.length - 1, index));
    const frame = story.frames[selected];
    phaseButtons.forEach((button, idx) => {
      button.setAttribute('aria-current', idx === selected ? 'step' : 'false');
      button.tabIndex = idx === selected ? 0 : -1;
    });
    phaseLabel.textContent = frame.label;
    zone.textContent = frame.zone;
    status.textContent = frame.canonical_status;
    status.classList.toggle('canonical', Boolean(frame.canonical_id));
    transition.textContent = frame.transition;
    receipts.textContent = String(frame.receipt_count);
    canonicalId.textContent = textOr(frame.canonical_id, 'Not issued');
    canonicalId.className = frame.canonical_id ? 'issued' : 'not-issued';
    preparation.textContent = textOr(frame.preparation_id, 'Not created');
    meaning.textContent = frame.meaning;
    nextAction.textContent = frame.next_action;
    receiptDigest.textContent = textOr(frame.receipt_digest, 'None yet');
    preparedBytes.textContent = frame.prepared_bytes === null ? 'Not persisted yet' : `${frame.prepared_bytes} bytes`;
    const fileObserved = frame.file_fsync_observed === true;
    const dirObserved = frame.directory_fsync_observed === true;
    fileFsync.classList.toggle('observed', fileObserved);
    dirFsync.classList.toggle('observed', dirObserved);
    fileFsync.querySelector('span').textContent = fileObserved ? 'OBSERVED' : 'NOT YET';
    dirFsync.querySelector('span').textContent = dirObserved ? 'OBSERVED' : 'NOT YET';
    localVerify.textContent = frame.local_verification ? frame.local_verification.status : 'Not applicable yet';
    exact.textContent = JSON.stringify({
      phase: frame.phase,
      transition: frame.transition,
      receipt_digest: frame.receipt_digest,
      receipt_evidence: frame.receipt_evidence,
      canonical_id: frame.canonical_id,
      preparation_id: frame.preparation_id,
      local_verification: frame.local_verification,
    }, null, 2);
    prev.disabled = selected === 0;
    next.disabled = selected === story.frames.length - 1;
    if (announce) live.textContent = `${frame.label}. ${frame.canonical_status}. ${frame.next_action}`;
    document.body.dataset.phase = frame.phase;
  }

  phaseButtons.forEach((button, idx) => {
    button.addEventListener('click', () => render(idx));
    button.addEventListener('keydown', (event) => {
      let target = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = Math.min(story.frames.length - 1, selected + 1);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = Math.max(0, selected - 1);
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = story.frames.length - 1;
      if (target !== null) {
        event.preventDefault();
        render(target);
        phaseButtons[target].focus();
      }
    });
  });
  prev.addEventListener('click', () => render(selected - 1));
  next.addEventListener('click', () => render(selected + 1));
  render(0, false);
  document.body.dataset.ready = 'true';
})();
"""


def build_html(story: Mapping[str, Any]) -> str:
    story_json = json.dumps(story, sort_keys=True, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    buttons = []
    for index, phase in enumerate(PHASE_ORDER):
        zone = "canon" if phase in {"GENESIS", "ACTIVE"} else "pre"
        buttons.append(
            f'<button class="phase" data-phase-index="{index}" data-zone="{zone}" '
            f'aria-current="false" tabindex="-1"><small>{index + 1:02d}</small>{html.escape(PHASE_COPY[phase]["label"])}</button>'
        )
    rail = "".join(buttons)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AXM Genesis Admission Observatory</title>
<style>{CSS}</style>
</head>
<body data-ready="false">
<main class="shell">
  <div class="topline" aria-label="Observer boundaries">
    <span class="chip">Local · offline</span><span class="chip">Display ≠ authority</span><span class="chip">Pre-genesis ≠ canon</span><span class="chip">No auto-action</span>
  </div>
  <section class="hero">
    <div><div class="eyebrow">AXM State Research · Evidence Observer</div><h1>Genesis Admission Observatory</h1><p>Walk the real admission receipt chain and see the exact moment a named attempt crosses from construction evidence into its first canonical identity.</p></div>
    <aside class="boundary"><strong>THE LINE THAT MATTERS</strong><span>Validation is not Genesis. The existing admission machine issues G0 only after accepted commit evidence. This page can inspect that result; it cannot create it.</span></aside>
  </section>
  <div class="rail-wrap"><div class="rail" role="toolbar" aria-label="Genesis admission phases">{rail}</div></div>
  <section class="workspace">
    <article class="panel main-panel">
      <div class="state-head"><div><div class="state-kicker" id="zone">PRE-GENESIS EVIDENCE</div><h2 class="state-title" id="phase-label">Unformed</h2></div><div class="status" id="canonical-status">NOT ISSUED</div></div>
      <div class="facts">
        <div class="fact"><span>Latest transition</span><strong id="transition">No transition receipt yet</strong></div>
        <div class="fact"><span>Receipt count</span><strong id="receipt-count">0</strong></div>
        <div class="fact wide"><span>Canonical identity</span><code id="canonical-id" class="not-issued">Not issued</code></div>
        <div class="fact wide"><span>Prepared admission</span><code id="preparation-id">Not created</code></div>
      </div>
      <div class="meaning"><h2>What this phase means</h2><p id="meaning-copy"></p></div>
      <div class="next"><strong>Next honest action</strong><p id="next-action"></p></div>
      <div class="controls"><button class="control" id="prev" type="button">← Previous evidence</button><button class="control next" id="next" type="button">Next evidence →</button></div>
    </article>
    <aside class="panel side">
      <h2>Evidence receipt</h2>
      <div class="receipt">
        <div class="evidence-row"><span>Receipt digest</span><strong id="receipt-digest">None yet</strong></div>
        <div class="evidence-row"><span>Prepared bytes</span><strong id="prepared-bytes">Not persisted yet</strong></div>
        <div class="fsync"><div class="signal" id="file-fsync"><b>File fsync</b><span>NOT YET</span></div><div class="signal" id="dir-fsync"><b>Directory fsync</b><span>NOT YET</span></div></div>
        <div class="evidence-row"><span>Local causal verification</span><strong id="local-verify">Not applicable yet</strong></div>
      </div>
      <p class="hold-note">Observed fsync is bounded process evidence. It is not proof of sudden-power-loss durability, hardware/firmware honesty, authorship, consensus, merge authority, or CANON.</p>
      <details class="exact"><summary>Inspect exact selected evidence</summary><pre id="exact-evidence"></pre></details>
    </aside>
  </section>
  <footer class="footer"><div><strong>Canonical truth</strong>Comes from the existing Genesis admission machine and its receipt verifier.</div><div><strong>Realization</strong>This single-file observer only selects recorded frames; it never advances the machine.</div><div><strong>Authority</strong>Human review remains outside this display. No merge, promotion, deployment, or CANON action exists here.</div></footer>
  <p id="live" aria-live="polite" class="sr-only" style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden"></p>
</main>
<script>window.__AXM_GENESIS_STORY__={story_json};</script>
<script>{JS}</script>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a read-only single-file observer from the real Genesis admission contract.")
    parser.add_argument("--output", type=Path, default=Path("genesis-admission-observer.html"))
    parser.add_argument("--check-determinism", action="store_true")
    args = parser.parse_args()

    story = build_story()
    if args.check_determinism:
        second = build_story()
        if canonical_bytes(story) != canonical_bytes(second):
            raise SystemExit("HOLD: repeated Genesis observer story differed")

    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    rendered = build_html(story)
    output.write_text(rendered, encoding="utf-8", newline="\n")
    final = story["frames"][-1]
    print(json.dumps({
        "status": "PASS",
        "schema": story["schema"],
        "frames": len(story["frames"]),
        "output": str(output),
        "canonical_id": final["canonical_id"],
        "preparation_id": final["preparation_id"],
        "claim_boundary": "display-only observer; fsync observed is not power-loss proof; no merge/CANON authority",
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
