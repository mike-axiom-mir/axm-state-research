# Primary Source Ledger

**Access date for every source:** 2026-09-02 UTC

**Inclusion rule:** official specification/documentation, original paper, author/institution publication page, or direct corporate research publication. Secondary explainers were not used as evidence.

| ID | Primary source | Owner / authors | Published or version | Access status | Use in review |
|---|---|---|---|---|---|
| S01 | [Rete](https://doi.org/10.1016/0004-3702%2882%2990020-0) | Charles L. Forgy | September 1982 | Verified publisher DOI/title/metadata | Direct relative: shared incremental rule matching |
| S02 | [Blackboard model](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/537) | H. Penny Nii / AAAI | 15 June 1986 | Verified article page, abstract, DOI, date | Direct relative: specialists through shared state and control |
| S03 | [Adapton](https://www.cs.umd.edu/~mwh/papers/hammer13adapton.html) | Hammer, Khoo, Hicks, Foster / University of Maryland | June 2014 | Verified author/institution page and mechanism summary | Direct relative: demanded dependency graph |
| S04 | [Differential Dataflow](https://www.microsoft.com/en-us/research/publication/differential-dataflow/) | McSherry, Murray, Isaacs, Isard / Microsoft Research | January 2013 | Verified corporate research publication | Direct relative: delta propagation through iteration |
| S05 | [Naiad publications](https://www.microsoft.com/en-us/research/project/naiad/publications/) | Murray et al. / Microsoft Research | November 2013 | Verified corporate research index and publication metadata | Direct relative: cyclic progress/dataflow context |
| S06 | [Incremental View Maintenance for Collection Programming](https://dbtoaster.github.io/papers/pods2016-ivmcp.pdf) | Koch et al. | 2016 | Verified project-hosted original paper | Direct relative: delta-maintained derived state |
| S07 | [Temporal Workflows](https://docs.temporal.io/workflows) | Temporal Technologies | Current page; date not stated | Verified official documentation and replay description | Partial relative and state-only counterexample |
| S08 | [SCXML](https://www.w3.org/TR/scxml/) | W3C; Barnett et al., editors | Recommendation, 1 September 2015 | Verified W3C Recommendation | Partial relative: event cycles and stable configurations |
| S09 | [Erlang processes](https://www.erlang.org/doc/system/ref_man_processes.html) | Ericsson/Erlang OTP | OTP 29.0.6 | Verified official documentation | Partial relative: lightweight isolated processes/messages |
| S10 | [OTP supervision](https://www.erlang.org/doc/system/sup_princ.html) | Ericsson/Erlang OTP | OTP 29.0.6 | Verified official documentation | Partial relative: lifecycle, restart, bounded escalation |
| S11 | [CRDTs](https://arxiv.org/abs/1805.06358) | Preguiça, Baquero, Shapiro | Submitted 16 May 2018 | Verified author-submitted paper and abstract | Partial relative: deterministic convergence and non-map |
| S12 | [Unity ECS concepts](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/concepts-intro.html) | Unity Technologies | Entities 1.3.15; generated 14 January 2026 | Verified official versioned manual | Partial relative: data/components separated from systems |
| S13 | [ROS 2 QoS design](https://design.ros2.org/articles/qos.html) | Esteve Fernandez / Open Source Robotics Foundation | Written October 2015; modified May 2019 | Verified official design document | Partial relative: subscription/transport policies |
| S14 | [CloudEvents v1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md) | CNCF CloudEvents project | v1.0.2; date not stated in document | Verified official versioned specification | Supporting event envelope |
| S15 | [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) | Rundgren, Jordan, Erdtman / RFC Editor | June 2020 | Verified canonical RFC Editor copy | Supporting canonical bytes/hashes |
| S16 | [PROV-O](https://www.w3.org/TR/prov-o/) | W3C; Lebo, Sahoo, McGuinness, editors | Recommendation, 30 April 2013 | Verified W3C Recommendation | Supporting provenance vocabulary |
| S17 | [SLSA v1.2](https://slsa.dev/spec/v1.2/) | Cross-industry/Linux Foundation collaboration | Approved v1.2 | Verified official current specification | Supporting source/build provenance |
| S18 | [TUF specification](https://theupdateframework.github.io/specification/latest/) | The Update Framework / CNCF | Current 1.x; work began 2009 | Verified official specification | Supporting trusted node/version distribution |
| S19 | [in-toto](https://in-toto.io/) | in-toto / CNCF | Current page; date not stated | Verified official project page | Supporting ordered step provenance |
| S20 | [WASI](https://wasi.dev/) | WASI subgroup, W3C WebAssembly Community Group | Active standard; current page | Verified official documentation | Supporting capability isolation |
| S21 | [seL4 overview](https://sel4.systems/About/) | seL4 Foundation/project | Current page; date not stated | Verified official project page | Screened out as core relative; OS-layer non-map |

## Verification notes

- A source marked **Verified** means its owner, title/version, and the mechanism used in the review were available at the linked primary location on the access date.
- “Date not stated” is retained rather than guessing a publication date.
- The ROS 2 current documentation site rejected automated access, so the official ROS 2 design document was used instead.
- The seL4 proof subpage did not return usable content in the first fetch; its official project overview was sufficient to establish that it is a formally verified microkernel and therefore a different architectural layer.
- SLSA v1.0 was found to be retired on the current site; the review uses approved v1.2 instead.
- No unverified performance claim from any external project was imported.
