# The bays: one component map, three products

**Status:** design note, 2026-09-10. Revises the table given in conversation on 2026-09-09; the
shell correction (Electron, not Tauri) is the owner's, stated repeatedly and recorded here so it
stops recurring. `docs/app_steering_document.md` still says Tauri and needs the same correction.

## What is shared and what is not

notebay, picobay, pdfbay and the `source-to-artifact` skill are one family because they share
*machinery*, not because they share a *thesis*. The theses exclude each other on purpose:

| product | thesis | excludes |
|---|---|---|
| pdfbay | comprehension: the reader reads; marks, ink and notes anchored to the page are the primary signal; chat is first-class but not the default surface | "source-agnostic aggregation and batch transformation across mixed sources" (its own scope line) |
| notebay | pipeline-first knowledge transformation: many sources in, editable artifacts out, through visible pipelines | reading as the product |
| picobay | one workflow system for browser testing, automation and extraction: explore, edit YAML, replay deterministically | documents |
| source-to-artifact | one source in, one study artifact out, as a Workflow IR graph | everything interactive |

So "notebay is a superset" is true of the components and false of the purposes. A notebay that
absorbed pdfbay's reading surface would have to carry pdfbay's rule that opening a document lands
you in the document, not in a pipeline.

## Component map, revised

| layer | picobay | source-to-artifact | pdfbay | notebay |
|---|---|---|---|---|
| **shell** | Chrome extension (MV3) | none; a CLI host, `scripts/run.ts` | Electron | **Electron** + React; web later |
| **workflow IR and runtime** | origin of the Workflow IR; `@picobay/engine` compiles YAML to LangGraph.js; nodes: browser, transform, http, human, agent, render | the same engine, vendored as a `file:` dependency; the skill registers its transforms, its `ask` agent and its rendering engines | none | the same engine; steering already says "compiled into LangGraph StateGraph"; React Flow editor later |
| **source representation** | the live page: DOM, selectors, extraction records | ingested Markdown with figures landed; Mathpix `.mmd`; clipped HTML | the PDF via pdfium (EmbedPDF), immutable, T0 | any of these, through parser adapters |
| **document IR** | none today; results are JSON/CSV | the merged draft as Markdown, block identity rebuilt by every node (the cost measured on 2026-09-09) | T1, the buddy layer: a structural twin aligned to the page, re-derived, never edited | block-level provenance, citations, guided rewrite scoped to blocks |
| **viewer** | the user's own tab | the in-page HTML engine; Quarto and Quarkdown outputs | EmbedPDF over pdfium, the reading surface | a React PDF viewer with citation highlights (kotaemon pattern) |
| **authored / interaction layer** | the YAML the user edits | none | T2/T3: marks, ink, notes, gaps, AI blocks, in ProseMirror | editable outputs |
| **parsers** | none | Mathpix, Readability+Turndown, Docling as a host tool (measured: GLM-OCR on MLX 85% maths, 5 s/page) | Mathpix decision reopened; frontier VLM arms measured | Docling adopted, Mathpix, LightOnOCR named |

Two places the word "superset" misleads in practice:

- picobay's browser nodes run through Chrome extension APIs against the user's tab. An Electron
  window has no extension API; the IR and the transforms carry over, the browser node
  implementation does not. It needs a driver, CDP or a `webContents` bridge.
- the workflow IR was *conceived* in notebay's steering and *realised* in picobay and the skill.
  notebay's "no workflow layer for MVP … must remain extensible toward it" is already met by
  the engine; the sentence should now point at it rather than defer it.

## The layered IR

One representation cannot serve the three data kinds the products hold, and each product has
already discovered one layer of it. The layers, bottom to top:

| layer | what it is | who owns it | mutable | example |
|---|---|---|---|---|
| **L0 source** | the bytes as they arrived, plus the coordinate space they define: PDF page space, DOM, sheet cells, a Markdown file's lines | pdfbay named it T0; picobay's page; the skill's ingested file | never | `page 17, bbox (72, 340, 520, 410)`; `#/texts/41` in a DOM; `lines 219–226` |
| **L1 document** | the structural twin: typed blocks in reading order with stable ids, levels, captions and provenance back into L0 | pdfbay named it T1, the buddy layer; the skill rebuilds it per node today; notebay calls it block-level provenance | never edited; re-derived by a better parser | **DoclingDocument JSON**: `self_ref`, `label`, `level`, `prov[{page_no, bbox, charspan}]`, `meta` |
| **L2 authored** | everything a person or an agent adds, anchored into L1 or L0: marks, ink, notes, gaps, AI blocks, the writer's draft, a rewrite scoped to blocks | pdfbay's T2/T3; notebay's editable outputs; the skill's draft | yes, with history | **ProseMirror** nodes whose `anchor` attr holds an L1 `self_ref` + offsets or an L0 page bbox |
| **L3 view** | how it is laid out and interacted with: a page raster with an ink canvas, a Quarto chapter, a reveal deck, an in-page HTML article, a virtual margin | each product's surface | derived | EmbedPDF + PageSlice tree; Quarto `.qmd`; Quarkdown `.qd`; `index.html` |

The rules that make it one system:

1. **Anchors point down, never up.** L2 references L1 ids and L0 coordinates. L1 references L0.
   Nothing in L0 or L1 knows L2 exists. Re-deriving L1 leaves L2 intact and flags anchors that no
   longer resolve, which is the re-anchoring problem in its honest form.
2. **L1 is produced, not edited.** Docling's Python produces it for PDF, DOCX, PPTX, XLSX; the
   skill's TypeScript parser produces it from Markdown and Mathpix; both write the same JSON. The
   TypeScript types are generated from the published schema (`DoclingDocument.model_json_schema()`,
   73 definitions), so no Python runs where Docling does not.
3. **Transforms read L1 and write L2.** An LLM node is handed a Markdown serialisation of a block
   range and its reply is re-parsed and diffed against the ids it was given. A promoted heading is a
   level change on a known item; a dropped block is an id that did not return. This is the omission
   check and the seam repair for free, and it is what the skill re-derives with regexes today.
4. **Engines serialise from L1 + L2.** Quarto Markdown, Quarkdown, the in-page HTML, Pandoc AST for
   docx and pptx, DocTags for a VLM round trip: one serialiser per engine over the same items. The
   writer stops needing to know the engine's dialect.
5. **L3 never persists.** A PageSlice tree, a rendered PDF, a deck: all rebuilt from L0–L2.

What L1 cannot yet name, and where it goes: `mermaid` is not a `CodeLanguageLabel`, Quarto's
`:::` environments have no item type, and provenance for a non-paged source has no page. All three
live in the per-node `meta` until the schema grows; none needs a fork.

## Where each product sits on the layers

| | L0 | L1 | L2 | L3 |
|---|---|---|---|---|
| picobay | the page | extraction records (today), L1 items (proposed) | the YAML | the tab |
| source-to-artifact | ingested file | proposed: emitted beside the draft | the draft | Quarto, Quarkdown, in-page |
| pdfbay | PDF, T0 | buddy layer, T1 | ProseMirror, T2/T3 | EmbedPDF + margins |
| notebay | any, via adapters | block provenance index | editable outputs | React viewer, React Flow |

## Evidence behind the rows

- Docling backends, VLM measurements and the DoclingDocument probes: [docling-spikes-2026-09-09.md](docling-spikes-2026-09-09.md).
- Docling routing, native Office parsing, OCR merge: [docling-pipeline-and-fallbacks.md](docling-pipeline-and-fallbacks.md).
- pdfbay's three objects and anchors: `../../pdfbay/docs/steering/product.md` §3, `../../pdfbay/docs/design/data-architecture.md`.
- The engine and its sprints: `~/Projects/picobay-engine/specs/00–07`; sprint 07 is the lecture pipeline on the engine, closed 2026-09-10.
