# officebay — Technical policy

Binding decisions and the stack. Every claim here was read from source or measured; where something
is undecided it says so rather than guessing.

## 1. The stack, and who supplies each part

```
┌─ shell ────────────────────────────────────────────────────────────┐
│ Electron 43 · WebContentsView tabs · electron-vite · React 19      │  upstream
│ apps/{shell,docs,sheets,slides,pdf,markdown,html}                  │
├─ document engines ─────────────────────────────────────────────────┤
│ pdf.js (render+text) · pdfium wasm (content-stream edit)           │  upstream
│ pdf-lib (assembly) · Tiptap/ProseMirror · Rust xlsx sidecar        │
├─ agent ────────────────────────────────────────────────────────────┤
│ @genoffice/agent-core  ReAct loop, compaction, guards, snapshots   │  upstream
│ @genoffice/ai-provider anthropic · gemini · openai-compatible      │
├─ officebay additions ──────────────────────────────────────────────┤
│ packages/docmodel      L1: DoclingDocument-subset, stable self_ref │  NEW
│ packages/marks         marks → anchored, exportable pipeline input │  NEW
│ engine host tool       hands a block range to @picobay/engine      │  NEW
│ ingestion routing      Mathpix · VLM raster · pdf.js · platform OCR│  NEW
├─ transformation ───────────────────────────────────────────────────┤
│ @picobay/engine        Workflow IR → LangGraph.js, Apache-2.0      │  existing, external
│                        cache · drift/degeneracy guards · fan-out   │
└────────────────────────────────────────────────────────────────────┘
```

## 2. Settled decisions

1. **Electron + TypeScript.** Inherited. Not Tauri — upstream is Electron and rewriting the shell
   forfeits the reason to fork.
2. **The fork is additive.** New packages; narrow, named edits to upstream files. Upstream `main`
   advances by squashed `Sync snapshot` commits, so we **rebase onto snapshots**, never merge
   PR-by-PR. A sprawling diff into `apps/pdf/src/renderer/App.tsx` (8,652 lines) makes every future
   snapshot painful.
3. **`@picobay/engine` for transformation, not Mastra and not a new orchestrator.** It shipped the
   map-over-a-document problem on 2026-09-10 (spec 07) with guards measured against real failures:
   prompt cache keyed `sha256(model+images+prompt)` with guards *before* the write, degeneracy
   refused below 0.35 distinct-lines, `policy.drift` discarding a >5% divergent repair.
4. **DoclingDocument as the L1 *schema*, never as the math parser.** Docling scores 0/70 on math
   assertions — it emits `formula-not-decoded`. Borrow `self_ref`, `label`, `level`, `prov`;
   write our own producer. No Python on the desktop.
5. **Zero Python on the desktop; Python allowed on the online tier.** Verified: no `packages/*`
   declares an `electron` dependency, so the engine layer runs anywhere Node runs. Electron is the
   desktop host, not the architecture — which is what makes a web tier real rather than aspirational.
6. **Kuzu and LadybugDB are not storage-compatible.** The 4-byte header (`LBUG`/`KUZU`) decides;
   a file written by one is unreadable by the other. Any store tooling asserts the magic.
7. **Ink keeps strokes + recognition + raster crop together**, so a wrong recognition is recoverable
   rather than invisible. Strokes and persistence already ship (§4).

## 3. Ingestion — a routing table, not a parser choice

No single parser wins, and the reader cannot be asked which kind of document they have.

| input | parser | evidence |
|---|---|---|
| PDF, prose | pdf.js text layer | free, instant, adequate |
| **PDF, math-dense** | **Mathpix** or **frontier VLM on the page raster** | Mathpix ≈ reference, 3.1 s/page, ~$0.005/page. VLM: **88.8%** (Opus 5), **87.1%** (Gemini 3.6 Flash) with *no parser at all* |
| scanned | platform OCR (macOS Vision / Windows.Media.Ocr) | ships; fires when `isScannedText()` — under 8 non-whitespace chars |
| docx/pptx/xlsx, structure wanted | Docling → `DoclingDocument` | native Office parsing, real L1 |
| docx/pptx/xlsx, text only | `packages/file-parse` | ships, zero Python |
| web page | Readability + Turndown | implemented in `source-to-artifact` |

### 3.1 The unsolved part: detection

Routing wants to send *only* degraded pages to the expensive path. **Three detectors were tried and
all failed:**

| signal | why it failed |
|---|---|
| math font names (`CMEX`, `CMSY`) | pdf.js reports subsetted fonts as opaque ids (`g_d0_f12`), never `CMEX10` |
| empty `str` with a glyph box | `getTextContent()` reports `height: 0` on every empty item, including the dropped Σ |
| empty `str`, width > 5 | inter-word spacing swamps it — the *clean* page scored 15, the *degraded* page 6 |

So **routing cannot depend on cheap per-page detection.** The viable designs are routing on
*document class* (producer metadata, font encoding tables, whether any page needed OCR) or routing
on *cost* (send everything to the good path). This is an open question, not a solved one.

### 3.2 What `read_pages` actually does today

`getTextContent()` — the glyph/text stream, concatenated in **draw order**. No rasterisation, no
`page.render()`. Two failure classes follow:

- **Legacy CM/Type1**: unmapped glyphs yield `str: ""`. Goodfellow eq. 3.9's Σ arrives as
  `{"str":"", "font":"g_d0_f12", "w":18.97}` — 19 points wide, zero text, silently gone.
- **Draw order ≠ reading order**: `P(a,b,c)=P(a|b,c)P(b,c)` arrives as `P , , P , P ,(a b c) = …`.

A frontier model often still emits correct LaTeX — **reconstruction from priors, not extraction**.
Right on canonical results, unconstrained on novel ones, and **well-formed either way**, so the
failure is silent.

### 3.3 Caching

`@picobay/engine` already caches prompts with guards. **Do not build a second cache.** The one
addition is a **parse cache**: Mathpix/VLM results content-addressed by
`sha256(bytes) + parser + version` — and that *is* the L1 store, not a layer in front of one.

## 4. The annotation layer — extend, do not rewrite

The write path already constructs arbitrary annotation dictionaries through pdf-lib: `/Text`,
`/Ink`, `/Square`, `/Circle`, `/Line`, `/Stamp`, `/Form`, `/IRT` reply threading, and custom keys
(`GenOfficeFormField`, `GenOfficeStaticFormFills`). That last is the precedent for carrying our own
payload — a `self_ref`, a recognition result, a crop id — without inventing a sidecar format.

**Ink already works**: `DrawLayer.tsx` captures strokes as `paths: number[][]` in PDF page space;
`save-pdf.ts:297` writes real `/Ink` annotations with appearance streams. The gap is
`MARKUP_TYPE_BY_ANNOT = {9,10,12}` — subtype 15 absent, so the app cannot read back ink it wrote.
**One map entry**, then recognition and the crop.

The genuine problem is **placement outside the page box**: an annotation's `/Rect` is page space,
so a mark anchored to a reader-opened gap has no rect. That is the outer-layout question, not the
annotation layer.

## 5. Anchoring and staleness — the open design question

Anchors point **down**: L2 (marks, notes) references L1 ids and L0 page coordinates; nothing in L0
or L1 knows L2 exists. Re-deriving L1 leaves L2 intact and *flags* what no longer resolves.

pdfbay could assume "the PDF is never modified." **officebay cannot — genoffice is an editor.**

| what changed | `self_ref` | anchor state |
|---|---|---|
| re-parse with a better parser | stable | fine — proven in `spikes/docmodel/selfref.mjs` |
| heading text edited | **changes** | orphaned, though the section still exists |
| body edited under a heading | stable | valid ref, **stale quote** |
| page inserted | stable | ref fine, citation page wrong |

A content-addressed id survives re-parse and dies on a heading edit; an assigned id does the
reverse. **One id cannot carry both** — resolving this is the first task of the L1 sprint.

Cheap mechanism, no new subsystem: an anchor stores `{self_ref, sourceHash, quote}`. Hash mismatch →
"source changed"; ref gone → orphaned; ref present but quote absent → "text under this anchor
changed". That distinguishes *outdated*, *moved*, *removed* and *rewritten* with a hash compare and
a substring check.

Two mechanisms already ship and should be the model: ProseMirror `DecorationSet` anchors
(`aiQueueAnchors.ts`) that map through every edit and **collapse when their text dies**, and
`isExternallyModified` (`{mtime, size, hash}`) for cross-process change.

## 6. Licensing

Apache-2.0 throughout, **except `ee/`**. Audited 2026-09-11: `ee/` contains **LICENSE and README
only — no code**, is reserved for "private deployment and offline license verification", takes no
external contributions (CODEOWNERS), and has **zero hooks anywhere in the codebase**.

Nothing we depend on is behind that boundary, and its stated scope is deployment/licensing rather
than document capability. **Re-check on every rebase**: if capabilities we rely on start landing
there, the effective licence of what we need has changed.

Apache-2.0 §6 does not license the GenOffice or Genspark marks — anything shipped carries its own
branding.

## 7. Open questions

1. **Ingestion routing** (§3.1) — route on document class, or on cost? Detection is unsolved.
2. **Anchor identity** (§5) — content-addressed, assigned, or an alias table carrying both?
3. **Displacement** — can a reader-opened gap exist on a page-fixed surface, or does it require
   replacing the outer layout? This decides whether §4's four renderings are all reachable.
4. **Does a page raster improve *answers*, not just transcription?** The benchmark measured
   transcription. The product claim is QA. Roughly one argument to `loop.run()` to test.
