# officebay — Pillars

The dimensions on which this product succeeds or fails. Specs track work *within* a sprint;
pillars track health *across* the product. Every sprint advances ≥1.

---

## P1 · Reading and marking surface

**What it means.** The reader — page rendering, selection, highlights, typed notes, navigation.
The thing a person touches for hours.

**Healthy when.**
1. The owner reads real documents in officebay instead of another viewer.
2. Highlights and typed notes reach the agent verbatim, with the text they cover.
3. Marks survive re-parse, edit and re-render.

**Current state.** 🟢 **Inherited and working.** genoffice ships it: `annotations.ts` is a single
rotation-aware screen↔page transform in PDF points; `NoteMargin.tsx` is a real virtual margin with
leader lines; `read_annotations` resolves the text under each highlight via `textUnderRect`.
**Gap:** ink is invisible to the agent — `MARKUP_TYPE_BY_ANNOT` covers subtypes 9/10/12 and
`toSavedNote` only type 1; **ink is subtype 15, in neither table**.

---

## P2 · Document model (L1)

**What it means.** A structural twin of the source with stable ids: typed blocks in reading order,
levels, spans, provenance back into page space. Everything else anchors into it.

**Healthy when.** "§19.1" is an object with an id, a level, a page and a span — not a substring
search. A citation survives a re-parse. An anchor that no longer resolves says so.

**Current state.** ❌ **Not started, and nothing upstream has it.** `pdf2docx` builds an `IrDocument`
but discards it after conversion; `file-parse` returns flat text. Provenance is page-grained by
construction. `selfref.mjs` (carried from pdfbay) proves content-addressed `self_ref` survives
re-parse but dies on a heading edit — the tradeoff is unresolved.

---

## P3 · Transformation and artifacts

**What it means.** Map over a document: chunk, generate per unit, merge, review, write back — with
resume and provable coverage.

**Healthy when.** "Cheatsheet from chapter 19" and "humanize this 60-page doc" both complete, and
you can tell which units were actually processed.

**Current state.** 🟡 **Exists, not connected.** `@picobay/engine` shipped it (spec 07, CLOSED
2026-09-10) and `source-to-artifact` runs on it, with a prompt cache and guards measured against
real failures. genoffice has the per-unit *write* primitives and **no map**: a 60-page rewrite
elides 1,180 blocks from the model's view and tells it to extrapolate indexes, then offers a
Continue button. Coverage is unverifiable. The seam between the two does not exist yet.

---

## P4 · Ingestion

**What it means.** Getting any document a worker or student has into a form the rest can use —
modern Quarto, legacy textbooks, scans, Office files.

**Healthy when.** A math-dense PDF answers questions from what is on the page, and the system knows
which documents it cannot read well.

**Current state.** 🟡 **Partial, with a silent failure.** pdf.js text works for prose; platform OCR
rescues scans into the same index. Math is the hole: on a legacy CM-encoded PDF the Σ is dropped
entirely and glyphs arrive in draw order, so answers are reconstructed from priors and are
confidently wrong when priors do not cover the equation. **Detecting which class a page is in is
unsolved** — three signals tried and rejected (font names are opaque subsetted ids, `getTextContent`
zeroes the height on empty items, width thresholds rank the clean page worse than the degraded one).

---

## P5 · Provenance and durability

**What it means.** Knowing what produced a thing, and not losing what a person authored.

**Healthy when.** "What produced this paragraph?" is answerable. Marks and reader-made links — the
only non-reproducible state — survive a year, a re-parse and a machine change.

**Current state.** ❌ **Not started.** `create_document` writes a file with no link to its source.
`project-store` persists per-file chat but is invisible to the agent. Nothing records what an
artifact was built from, and nothing marks an anchor as stale when its source moves.
