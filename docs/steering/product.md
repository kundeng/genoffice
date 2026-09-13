# officebay — Product

## 1. Product identity

**officebay is a fork and improvement of genoffice, not a replacement implementation.**

genoffice is the working baseline: a multi-format Electron office suite with reading, editing,
marking, chat, file persistence, project storage, and document-specific agent tools. officebay keeps
that product useful while adding a derived-artifact layer that genoffice does not currently expose.

The governing product equation is:

```
officebay = genoffice's shipped office surface
          + durable document structure and provenance
          + work-anchored transformation
          + officebay identity
```

A feature is not absent merely because the agent cannot invoke it. Before building anything, classify
the gap as one of:

1. **Capability gap** — neither implementation nor usable substrate exists.
2. **Exposure gap** — the capability exists but is not available at the required boundary.
3. **Registration gap** — an existing API is not registered as an agent tool or UI action.
4. **Composition gap** — the parts exist but no workflow joins them.

Only the first category normally justifies a new subsystem.

## 2. What is inherited and must remain good

The fork starts with working product value, not an empty architecture:

- PDF, document, spreadsheet, slide, Markdown, and HTML applications in one Electron shell.
- Reading, selection, editing, annotations, ink capture, save, navigation, and print behavior.
- A shared agent loop with compaction, guards, snapshots, and multiple AI providers.
- Per-format tools and write primitives.
- Project and chat persistence, including project-file listing and rename-following chat identity.

These are officebay capabilities even when every relevant line remains upstream-owned. Regressing
them while adding an officebay feature is product failure.

## 3. What officebay adds

genoffice is strong at operating on the open document. It is weaker at representing and explaining
work derived from documents. officebay adds the smallest coherent layer for that job:

1. **A shared document model.** Typed structural items in reading order, with stable identity and
   provenance into the source format.
2. **Durable authored state.** Marks, notes, links, gaps, and generated blocks anchored downward into
   document structure or source coordinates, with visible stale/orphan states.
3. **Work-anchored transformation.** The reader's selections and marks can become explicit pipeline
   input instead of being dead annotation data.
4. **Mapped document work.** Long transformations run by explicit units with resume and coverage,
   using `@picobay/engine` rather than another orchestrator.
5. **Artifact lineage.** Generated outputs record their source documents, source units, workflow,
   and relevant run identity.
6. **Cross-document agent access.** Existing project storage and IPC become usable through narrow
   tools before any new corpus store is considered.
7. **Honest ingestion.** The product distinguishes grounded extraction from degraded or unavailable
   source content, especially for mathematics.

## 4. Product thesis and its status

### Settled: the document is the default workspace

Opening a document lands in the document, not in chat or a pipeline editor. Chat remains first-class,
but it is not the sole or default interaction. AI should carry the current document, location, and
reader-authored state whenever those are relevant.

### Settled: generated work must remain inspectably tied to sources

A generated artifact is useful only when the reader can inspect what produced it. Provenance is not
presentation metadata added at export; it begins at the source and survives transformation.

### Hypothesis to prove: marks are the bridge between reading and production

The imported pdfbay thesis was comprehension rather than substitution. The imported notebay thesis
was source-grounded transformation into editable artifacts. officebay's proposed bridge is:

> What the reader marked is often the best input to what the reader produces.

This is a product hypothesis, not yet a proven fact. It earns promotion to settled policy only if
real use shows that readers invoke transformations from their marks rather than recreating the same
context in a fresh prompt.

## 5. Work-anchored renderings

A work anchor says what output is attached to; it does not dictate where pixels appear.

| Rendering | Meaning | Baseline |
|---|---|---|
| **Overlay** | Highlight, ink, or note on the page | ships |
| **Virtual margin** | Content outside the page box, linked to an anchor | ships |
| **Dragged-apart** | Reader-opened space inside the visual page flow | does not ship |
| **Floating** | Anchor-following content that occupies no page space | partial |
| **Projection** | Read-only reflow of source structure, such as translation or accessible large print | does not ship as a shared officebay surface |

Displacement and projection are retained requirements from pdfbay, but their implementation must be
re-evaluated against genoffice's existing renderers. The archived ProseMirror/PageSlice architecture
is evidence, not binding implementation policy.

## 6. Audience and trust boundary

The audience is workers and students using whatever documents arrive: modern exports, old textbooks,
scans, Office files, and web material. Therefore:

- users are not asked to diagnose the encoding or parser class of their own documents;
- source quality and grounding failures must be visible;
- inferred or reconstructed content must not be presented as extracted fact;
- destructive edits retain the format's existing safety and save semantics;
- generated material remains editable without erasing its lineage.

## 7. Scope guardrails

Do not build:

- a replacement office suite beside the inherited one;
- a second agent runtime, transformation engine, annotation store, or project store without proving
  the existing owner cannot be extended;
- automatic artifacts on import;
- an artifact-type menu that substitutes for an explicit reader goal;
- agent swarms or workflow spectacle without a user workflow requiring them;
- deep edits across upstream applications when a new package and a narrow adapter suffice.

## 8. Development order

The order is fork-aware rather than greenfield:

1. **Baseline and seams.** Establish inherited behavior, owners, extension points, and regression
   evidence for the journey being changed.
2. **Small exposure wins.** Register existing project/corpus APIs and close annotation read-back gaps
   before designing replacement stores or layers.
3. **Shared document identity.** Define the minimum L1 contract and anchoring semantics required by
   multiple formats and generated lineage.
4. **Prove one vertical slice.** A reader mark invokes one mapped transformation and produces one
   editable, provenance-bearing result through existing write primitives.
5. **Improve ingestion where measured failures block that slice.** Mathematics is a leading case,
   not automatically the first implementation milestone.
6. **Expand formats and cross-document workflows.** Reuse the same contracts.
7. **Prototype displacement and projection against the inherited renderer.** Proceed only with
   measured interaction and rebase costs.

## 9. Ways the product can lose

- Inherited editing or reading quality regresses while officebay additions grow.
- The fork accumulates broad upstream diffs and can no longer rebase economically.
- Existing capabilities are repeatedly rebuilt because missing wiring is mistaken for missing code.
- Marks-as-input is not used, leaving reading and artifact generation as unrelated products.
- Provenance exists in storage but is not inspectable in the actual user workflow.
- Grounding failures remain silent.
- The officebay name is cosmetic while shipped surfaces still present upstream marks as the product.
