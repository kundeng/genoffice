# Extensibility audit — what genoffice already has, read from source

**Date:** 2026-09-11. **Status:** correction. **Relation:** `SUPERSEDES` the capability claims in
`2026-09-11-officebay-consolidation.md` §5 and in sprint 01's `RETIRED.md` files. Those were wrong,
not merely stale — they are not to be cited forward.

## Why this exists

Sprint 01's retirement notes said displacement, the one-tree layout and **ink capture** were "lost"
in the move to genoffice, and the consolidation note's §5 listed several capabilities as absent.

That framing was wrong twice over. First, officebay is an **extension** — the fork exists to add
what genoffice lacks, so "genoffice lacks X" is a work item, never a reason to drop X. Second, and
worse, several things called absent are **already implemented**; what is missing is a table entry
or a tool registration.

The error has one shape: **absent wiring read as absent capability.** Every correction below is the
same mistake.

## C1 — Ink capture exists. Only the read-back table is missing

**Claimed:** "ink capture is lost"; "genoffice cannot see ink at all".

**Actual:**

| piece | where | state |
|---|---|---|
| pen/stroke capture | `apps/pdf/src/renderer/DrawLayer.tsx` — `DrawTool` includes `'ink'` | **works** |
| stroke data model | `DrawingInput` `kind: 'ink'`, `paths: number[][]`, each stroke `[x1,y1,x2,y2,…]` | **works, in PDF page space** |
| persistence | `save-pdf.ts:297` `addDrawing()` — writes real `/Ink` annotations with hand-written appearance streams | **works** |
| read-back for the agent | `MARKUP_TYPE_BY_ANNOT` = `{9,10,12}` | **subtype 15 absent** |

So the app captures pen strokes in page coordinates and writes standard `/Ink` annotations — then
cannot read its own ink back, because the catalog lists three subtypes. The agent's blindness to ink
is one missing map entry, not a missing feature.

pdfbay's rule 7 (strokes + recognition + raster crop kept together, so a wrong recognition is
recoverable rather than invisible) is therefore **two thirds shipped**: strokes are captured and
persisted in page space. Recognition and the crop are the extension.

## C2 — The projects layer is a corpus model, and it is already wired to IPC

**Claimed:** "no cross-document tool"; "correlation is impossible by construction"; "`project-store`
is invisible".

**Actual:** `packages/project-store` is 1,006 lines with a real API — atomic writes, and chat that
follows a file across renames via `chatIdByPath`:

```
resolveProjectForFile()   listProjectFiles()     getProjectTimeline()
moveFileToProject()       createProject()        listProjectsSummary()
```

`apps/docs/src/main/docs-main.ts:3164,3192` **already expose `listProjectFiles` and
`getProjectTimeline` over IPC.** The path from a corpus to the renderer is complete and shipping.

What is absent is a **tool definition**: no entry in any app's `AGENT_TOOLS` calls them. Cross-document
work is a tool-registration gap on top of a working substrate — not an architectural absence.

## C3 — The annotation layer does not need rewriting

**Question raised:** do we need to rewrite the annotation layers?

**Evidence says no.** The write path already constructs arbitrary annotation dictionaries through
pdf-lib — `save-pdf.ts` builds `/Text`, `/Ink`, `/Square`, `/Circle`, `/Line`, `/Stamp`, `/Form`,
sets `/IRT` and `/RT` for reply threading, and writes custom keys (`GenOfficeFormField`,
`GenOfficeStaticFormFills`). Anything expressible as a PDF annotation is reachable.

Two specific extension points, both additive:

- `MARKUP_TYPE_BY_ANNOT` / `toSavedNote` in `annotation-catalog.ts` are the **read** filter. Widening
  them admits ink and any other subtype.
- Custom `/GenOffice*` keys are the precedent for carrying our own payload on an annotation —
  a `self_ref` anchor, a recognition result, a crop id — without inventing a sidecar format.

The place that *will* need real work is **placement outside the page box**. `NoteMargin.tsx` proves
a virtual margin renders today, but a PDF annotation's `/Rect` lives in page space; a mark anchored
to a gap the reader opened has no page-space rect. That is the genuine design problem, and it is
about the layout host, not the annotation layer.

## What is actually missing — the honest list

Unchanged from the consolidation note, now with the wiring corrected:

| | gap | true size |
|---|---|---|
| G1 | math grounding on legacy-encoded PDFs | real; needs an eval corpus that is not Goodfellow |
| G2 | L1 document model with stable ids | real; nothing upstream has it |
| G3 | marks as a pipeline input | **smaller than stated** — marks are captured; the gap is export + anchor |
| G4 | map over a document | real; the engine has it, the seam does not exist |
| G5 | provenance on generated artifacts | real; `create_document` is terminal |
| G6 | **ink recognition + crop** | **smaller than stated** — capture and persistence ship; recognition does not |
| G7 | Docling as L1 producer for Office formats | real |
| G8 | **cross-document tools** | **much smaller than stated** — substrate and IPC ship; tools do not |
| G9 | displacement / reader-opened gaps | real, and the hardest: needs the outer layout question answered |

## Standing correction

`RETIRED.md` in both retired trees says displacement, the one-tree layout and ink capture were
"lost". **Ink capture was not lost.** Those files carry a forward pointer to this document rather
than being edited, per the append-only rule.

The deeper correction is to the sprint-01 framing: retirement moved *evidence*, and said nothing
about product scope. Nothing pdfbay wanted has been dropped. The list of things officebay intends to
build is the list above, and it is longer than sprint 01 implied.
