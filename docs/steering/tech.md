# officebay — Technical policy

This policy distinguishes what the fork inherits, what it exposes through narrow seams, what it
must genuinely add, and what remains an experiment. Planned boundaries are not described as shipped
architecture.

## 1. Classification before implementation

For every proposed capability, inspect in this order:

1. Existing implementation in `apps/*` and `packages/*`.
2. Existing main/preload/renderer boundary and tool registration.
3. Existing external implementation in `@picobay/engine` or the ingestion toolchain.
4. Only then, a new officebay package.

Classify the result as **capability**, **exposure**, **registration**, or **composition** gap. Record
the existing owner and the proving test before editing it. Missing agent access is not evidence of a
missing product capability.

## 2. Inherited contracts

These are the baseline architecture unless a later decision explicitly supersedes one.

| Contract | Existing owner | officebay rule |
|---|---|---|
| Desktop shell and application lifecycle | Electron shell and app main processes | extend; do not replace with another desktop runtime |
| PDF render and text | pdf.js | reuse its loaded document/page/canvas paths |
| PDF content-stream edits | pdfium WASM and existing PDF services | preserve existing save semantics |
| PDF annotations and ink | renderer drawing/annotation code plus pdf-lib save path | widen catalogs and payloads before inventing storage |
| Rich document editing | existing Tiptap/ProseMirror applications | use format write primitives already exposed |
| Agent loop | `@genoffice/agent-core` | extend its typed tool/image/provider contracts; no second loop |
| Providers | `@genoffice/ai-provider` | preserve provider-specific capability and failure handling |
| Project/file/chat state | `packages/project-store` plus shell IPC | expose existing APIs before adding a corpus database |
| Hosted service client | `packages/ai-search` (`gsk.ts`, `genoffice-auth.ts`), `apps/shell/src/main/cloud-projects.ts`, `slides:cloud-page-generate` | **to be removed** under P7. Do not add callers. New AI work targets the provider abstraction in `packages/ai-provider`, never the hosted path. |
| Transformation | `@picobay/engine` | host and configure it; do not rebuild map/resume/cache/guards |
| Flat text parsing | `packages/file-parse` and current PDF indexing | retain for cases that do not require structural L1 |

All inherited journeys changed by officebay require regression evidence. A green test for the new
package alone does not prove the fork still works.

## 3. Narrow extension seams already verified

### Annotation read-back

Ink capture and `/Ink` persistence ship. The immediate gap is read-back: subtype 15 is absent from
the annotation catalog used by the agent path. Existing custom annotation keys show that officebay
anchor, recognition, or crop references can travel in the current annotation mechanism where PDF
semantics permit it.

This does not solve placement outside page space. Dragged-apart content belongs to the outer layout,
not the PDF annotation dictionary.

### Project and cross-document access

`project-store` supplies project-file and timeline APIs, and main-process IPC exposes relevant calls.
The first cross-document increment is a typed, permission-aware tool registration using those APIs.
A new vector/graph/corpus store requires evidence that this substrate and current search paths cannot
support the selected user journey.

### Agent images

The shared agent/provider contracts carry images and at least one existing application uses them.
Any PDF raster experiment must reuse that contract and the PDF renderer's existing loaded-page path.
It must verify provider support, page selection, latency, cost, privacy, cancellation, and failure
behavior rather than assuming the change is only a call-site argument.

### Long transformations

Existing format tools write document units; `@picobay/engine` maps work over explicit units with
resume, coverage, caching, and guards. The missing seam is a host adapter with typed source units,
job policy, progress/cancellation, and result application. It is a composition gap.

## 4. Genuinely new officebay boundaries

Names below describe intended ownership, not necessarily final package names.

### Shared document model

A pure TypeScript package may own the minimum cross-format L1 contract:

- typed structural items in reading order;
- stable/assigned identity semantics;
- source-format provenance;
- resolution and stale/orphan classification;
- deterministic serialization and validation.

Use a compatible subset of `DoclingDocument` concepts (`self_ref`, label, level, provenance) as a
boundary schema. Do not use Docling as the mathematics parser, and do not require Python on the
desktop to consume the schema.

One identifier need not pretend to solve both content identity and continuity through edits. The L1
design must explicitly choose content IDs, assigned IDs, or aliases and define migration behavior.

### Anchored authored state

L2 state—marks, notes, links, gaps, generated blocks—references L1 identities and/or L0 source
coordinates. Anchors point down; source and derived document representations do not know authored
state exists. Re-derivation flags unresolved anchors rather than deleting them.

Prefer existing native persistence per format. A shared sidecar/store is justified only for state
that cannot live safely in the source format or existing project store.

### Artifact lineage

Generated outputs carry typed provenance to source file identities, source units, workflow/version,
and run identity. Lineage must be readable by both the application and the user-facing inspector; a
hidden metadata record alone does not satisfy the requirement.

## 5. Ingestion policy

No single parser is the architecture. Choose the cheapest sufficient path for the required output:

| Need | Existing/default path | Escalation |
|---|---|---|
| PDF prose/text operations | pdf.js text layer | structural or visual parser when measured fidelity requires it |
| Modern Unicode-mapped PDF math | pdf.js may be sufficient | raster/VLM or Mathpix only when the workflow requires stronger evidence |
| Legacy or degraded PDF math | unresolved routing | measured raster/VLM or Mathpix path with visible grounding state |
| Scans | existing platform OCR | stronger parser when OCR cannot support the journey |
| Office text only | `packages/file-parse` | none unless structure is required |
| Office structural L1 | existing format structure where available | Docling producer on online/optional sidecar tier |
| Web source | Readability + Turndown implementation already used by source-to-artifact | preserve source URL and extraction provenance |

Docling scored 0/70 on the carried mathematics assertions and emitted
`formula-not-decoded`; it is a schema/Office-structure candidate, not the math parser.

A parse cache is content-addressed by source bytes plus parser identity/version and stores the
resulting L1. Do not add a second model-response cache beside the engine cache.

## 6. Experiments, not decisions

### Math answer grounding

Known: legacy CM/Type1 PDFs can drop operators and return draw order instead of reading order.
Known: raster input improved transcription in the prior benchmark. Unknown: whether it improves
answers when the model and questions are controlled.

The experiment must compare text, raster, and both across Unicode/legacy and canonical/non-canonical
cells; count confident contradiction separately; and measure latency/cost/provider coverage. Its
result selects a product path. It is not itself the first mandatory implementation milestone.

### Displacement and projection

pdfbay's PageSlice/ProseMirror design is archived evidence, not officebay policy. First inspect
whether genoffice's current PDF virtualization and layout can host reader-opened gaps or a read-only
reflow projection with narrow changes. Prototype against realistic document length, ink latency,
selection, scroll restoration, anchor mapping, and snapshot-rebase footprint.

## 7. Runtime and tier rules

- Desktop remains Electron and TypeScript. No mandatory Python desktop runtime.
- Python services are permitted in an online or explicitly optional sidecar tier.
- `packages/*` remain Electron-free; host-specific behavior stays in application boundaries.
- Provider/model/parser identities are typed configuration, not literals scattered through tools.
- Credentials stay in the existing provider/config mechanisms; generated lineage records references
  and public identity, never secret values.

## 8. Fork discipline

Upstream `main` advances through squashed snapshots. officebay rebases onto those snapshots.

- Prefer new packages and files. A new editor surface belongs in a new `apps/` directory registered
  through the shell's `TabManager` seam (`createXView` / `requestXClose` / `TabKind`) — a sibling
  fork demonstrated this works for two added apps.
- Keep each upstream edit narrow, named, and covered by a journey-level check.
- **Two surfaces are expensive.** `apps/docs/src/renderer/editor/` is edited heavily by every active
  fork; `apps/slides/src/main/session-state.ts` and `slides-main.ts` are named in upstream's own
  published plan for a sync transport. Editing either needs a justification that survives the next
  snapshot. Read from `journaledTxn`; do not change how it produces.
- Do not edit upstream `CLAUDE.md`.
- Recheck `ee/` on every rebase; it contains no capability code at the pinned baseline.
- Before accepting a feature, report files changed under `apps/`, why each edit cannot live behind an
  adapter, and the expected rebase conflict surface.
- Preserve Apache-2.0 notices and replace upstream product marks in anything officebay distributes.

## 9. Current decision queue

1. Establish a compact inherited-journey baseline and extension inventory.
2. Choose one vertical slice joining mark → mapped transform → editable result → visible lineage.
3. Define only the L1/anchor fields that slice requires.
4. Close cheap exposure/registration gaps encountered by that slice.
5. Run ingestion experiments only where the slice proves current extraction insufficient.
6. Defer replacement stores, generalized retrieval, displacement, and projection until a measured
   workflow requires them.
