# officebay — consolidating pdfbay, notebay and the artifact pipeline onto genoffice

**Date:** 2026-09-11. **Status:** research, feeds an owner decision on retiring two projects.

**Supersedes** two earlier drafts of this note. The first framed the question as "where does
pdfbay's product get built" and answered with a port plan — wrong question. The second asserted
that genoffice "cannot see math" and proposed Docling-as-parser as a mistake to avoid — **both
wrong**, corrected in §3 and §4. Corrections came from the owner testing the product and from
probes run for this note.

**Audience constraint, stated once because it decides several sections:** officebay is for
**workers and students of all kinds**. The document corpus is therefore *whatever arrives* —
modern Quarto and LaTeX output, 2016-era textbooks, scanned photocopies, Word exports, slide
decks. No assumption about input quality is available, and any design that needs the user to
know which kind they have is invalid.

**Evidence read directly for this note:**

| source | at |
|---|---|
| genoffice | `~/projects/genoffice` @ `d35d770`, 2026-09-10 — [`references/genoffice.md`](../../references/genoffice.md) |
| source-to-artifact | `~/.agents/skills/source-to-artifact` — `SKILL.md`, `scripts/run.ts`, `pipelines/lecture-notes.yaml` |
| picobay-engine | `~/Projects/picobay-engine` — `package.json`, `src/`, `specs/07` (CLOSED / SHIPPED 2026-09-10) |
| parser measurements | `../pdf-to-md-benchmark/analysis/report.md` §2–§4.8 |
| the layered IR | `../notebay/research/bays-component-map.md` |
| live probes | `/tmp/pdfjs-probe/` — `read_pages` reproduction and a failed degradation detector (§4.2) |

---

## 1. The proposal and the verdict

> Retire pdfbay and notebay. Build **officebay** = forked genoffice, with **Docling for the
> various document formats and VLM or Mathpix for math PDFs**, LangGraph.js IR for transformation
> and artifact generation, and custom JS for the display/review/markup layer. An online platform
> later starts from the same code.

**Sound. It is the first architecture in this family with no redundant part.** The ingestion
routing is right — the earlier draft argued against a strawman ("Docling as *the* parser") and
that section has been replaced by §4.

The three layers map onto three things that already exist and do not overlap:

| layer | supplied by | state |
|---|---|---|
| read / edit / mark surface | genoffice fork | shipped, 6 apps, Electron shell |
| transformation and artifact generation | `@picobay/engine` + `source-to-artifact` | shipped 2026-09-10, on LangGraph.js |
| ingestion | routing table, §4 | partly shipped, partly to build |

### 1.1 The online claim is verified, not aspirational

Checked rather than assumed: **no package under `packages/*` declares an `electron` dependency.**
All thirteen are pure TypeScript; only `ai-provider/src/codex-app-server.ts` touches `node:`
builtins. `@picobay/engine` ships a `./browser` entry and is Apache-2.0.

**Electron is the desktop host, not the architecture.** A web platform reuses `agent-core`,
`ai-provider`, `project-store`, `pdf2docx`, the docx/pptx engines and the entire engine layer
unchanged, and replaces `apps/*/src/main` plus the shell. This also resolves the Python question
in §4.3: an online tier can run Docling; a desktop tier cannot.

---

## 2. Can pdfbay and notebay be retired?

**Yes, both. Neither retirement loses a measurement, a decision, or a line of working code.**

### 2.1 pdfbay

Docs only. The sole runnable artifact is `spikes/embedpdf/spike.mjs`. Both specs are DRAFT and
never started; `03-document-surface-spike`, which `tech.md` §3.10 treats as the deciding sprint,
**was never written**. P1 is ❌ not started.

| pdfbay decision | fate under officebay |
|---|---|
| Electron + TypeScript, two processes | **inherited** — genoffice is exactly this |
| EmbedPDF on pdfium | **partly inherited** — `@embedpdf/pdfium` for content-stream edits, pdf.js for render |
| Mastra, not LangGraph | **void** — the no-Python-on-desktop argument dies once the pipeline is LangGraph.js |
| Zero Python on the desktop | **preserved as a tier rule**, not an absolute — see §4.3 |
| Mathpix ingestion | **preserved**, and already implemented in s2a's `src/mathpix.ts` |
| Ink keeps strokes + recognition + pixels | **deferred** — genoffice cannot see ink at all (§5, A1) |
| Marks are the only non-reproducible state | **preserved** — becomes officebay's L2 durability rule |

Genuinely lost, and it should be stated rather than glossed: **displacement** (reader-opened gaps
in page flow), the **one-tree ProseMirror outer layout**, and **ink capture**. These were
pdfbay's differentiators and none survives the move. §8 makes that falsifiable.

The thesis survives in better shape than the repo did: *the reader's own marks are the primary
signal*. genoffice already feeds highlights and typed notes to the agent verbatim. What it does
not do is let marks **produce** anything — §6, G3.

### 2.2 notebay

3,944 lines of TypeScript across 73 files, most of it fixtures and config; one commit; 21
modified and 29 untracked files. Its steering still specifies Tauri + PocketBase + Plate.js while
its own research note records the owner correcting the shell to Electron "repeatedly".

Its value is two research notes, both already consumed here: `bays-component-map.md` (the L0–L3
IR and the anchors-point-down rule) and `docling-spikes-2026-09-09.md`. Its designed pipeline
layer is not a gap — `@picobay/engine` **shipped it** (spec 07, CLOSED, 2026-09-10). notebay's
roadmap describes software that now exists elsewhere.

**Retire both. Keep the research notes; move the two carrying measurements into
officebay's `references/`.**

---

## 3. What genoffice does with math — corrected

The earlier draft claimed the agent "cannot see math." **That is false**, and the correction is
load-bearing because it changes what ingestion has to solve.

### 3.1 The owner's test

Asked "can you see the math under section 5.4.1" on a Quarto-produced lecture PDF
(`tsa-ch05-v17-lecture-ch4.pdf`), with `openrouter/auto`, the agent called `get_outline` →
`search_text("5.4.1")` → `read_pages(3-5)` and returned correct, well-formed LaTeX for equations
(5.4) and (5.5), plus an accurate account of which definitions carry displayed math and which do
not.

**No PDF bytes and no page image were sent.** Verified three ways: `packages/ai-provider`
contains no document-part code (`application/pdf`, `input_file`, `file_id` — no matches); the
Anthropic protocol handles only text and `type: 'image'` blocks; and `AiPanel.tsx:504` calls
`loop.run(instruction)` with no images argument. The model saw text from
`getTextContent()` and nothing else.

### 3.2 Why it worked — the document class

Reproducing `read_pages` exactly (`/tmp/pdfjs-probe/readpages.mjs`) on that page:

```
𝐾(𝑡1, 𝑡2, … , 𝑡𝑛) = E[
𝑛
∏
𝑖=1
(𝑋(𝑡𝑖) − 𝜇(𝑡𝑖))] (5.4)
…
𝑓𝑋(𝑡1),…,𝑋(𝑡𝑛)(𝑥1, … , 𝑥𝑛) = 𝑓𝑋(𝑡1+ℎ),…,𝑋(𝑡𝑛+ℎ)(𝑥1, … , 𝑥𝑛). (5.5)
```

The ∏ is present, its bounds are present, the variables arrive as Unicode mathematical italic,
and (5.5) is **complete and in reading order**. Producing `$$…$$` from this is transliteration,
not reconstruction. The answer was grounded.

### 3.3 Why the other class fails, silently

The same probe on Goodfellow p.76 (2016 LaTeX, Type1/Computer Modern):

```
P , , P , P ,(a b c) = (a b| c) (b c)
Ex∼P [ ( )] =f x 
x
P x f x ,( ) ( ) (3.9)
```

Two distinct defects. Glyphs arrive in **draw order**, not reading order — the real equation is
$P(a,b,c) = P(a \mid b,c)P(b,c)$. And the **Σ is gone**: the raw item is
`{"str":"", "font":"g_d0_f12", "w":18.97}` — a 19-point-wide glyph that produced no text.
Mathpix on the same page returns the full `\begin{aligned}` block.

A frontier model handed this will often still emit correct LaTeX, because it recognises the chain
rule of probability. **That is reconstruction from priors, not extraction** — and it is right
about canonical results and unconstrained about anything else: a novel equation, a non-standard
index range, a document-specific coefficient, a sign or transpose the glyph stream dropped. The
output is well-formed LaTeX either way, so **the failure is silent**.

### 3.4 The honest generalisation

| PDF class | `read_pages` yields | math QA |
|---|---|---|
| **modern Unicode-mapped** (Quarto, recent LaTeX, Typst) | complete, linearised | **works, grounded** |
| **legacy CM / Type1** (older textbooks and papers) | operators dropped, draw-order scrambled | reconstruction — silent failure risk |
| **scanned** | platform OCR text, no notation | no |

For workers and students, **all three classes appear in the same library**, and nothing in the
product tells the user — or the model — which one is on screen.

---

## 4. Ingestion: the routing table

The design is right: **Docling for the breadth of document formats, VLM or Mathpix for math
PDFs.** Three facts shape how it lands.

### 4.1 genoffice already parses the formats — but only to flat text

`packages/file-parse` handles `docx`, `doc`, `pptx`, `ppt`, `xlsx`, `pdf`, `txt`, `md`, `csv`
with zero Python, shipped today. But `parseFileToText` is built for **chat attachments**: it
returns `{ kind: 'text', text }`. No structure, no headings, no provenance, no L1.

So Docling's value is **not** format coverage, which exists. It is that Docling emits a
**structured `DoclingDocument`** — typed items in reading order, stable `self_ref`, `level`,
`prov{page_no, bbox, charspan}` — which is exactly the L1 the artifact pipeline and
provenance-bearing citations need. That is a real gap and Docling genuinely fills it.

### 4.2 Detection of a degraded page is unsolved — and this is the key finding

The obvious design is: detect a degraded text layer, route those pages to Mathpix or a VLM, leave
the rest alone. **Three attempts at a detector failed** (`/tmp/pdfjs-probe/detect.mjs`):

| signal | why it failed |
|---|---|
| math font names (`CMEX`, `CMSY`) | pdf.js reports subsetted fonts as opaque ids (`g_d0_f12`), never `CMEX10` |
| empty `str` with a glyph box | `getTextContent()` reports `height: 0` on every empty item, including the dropped Σ |
| empty `str` with width > 5 | inter-word spacing runs swamp it — the **clean** Quarto page scored 15, the **degraded** Goodfellow page 6 |

A reliable detector needs operator-level work (comparing the text layer against a render, or
against the content stream) that cannot be assumed cheap.

**Consequence: routing cannot be conditional on cheap per-page detection.** The viable designs
are to route on **document class** (cheap signals: producer metadata, font encoding tables,
whether any page needed OCR) or to route on **cost** (parse everything with the good parser).
This inverts the earlier draft's M1 and is the single most useful thing these probes produced.

### 4.3 The routing table, with the Python question answered by tier

| input | parser | why | tier |
|---|---|---|---|
| `docx` `pptx` `xlsx` `epub` `html` — **structure wanted** | **Docling** | native Office parsing, no OCR, emits `DoclingDocument` with provenance | online; desktop via optional sidecar |
| same — **text only** | `file-parse` (shipped) | zero Python, already there | both |
| **PDF, math-dense** | **Mathpix** or **frontier VLM on the page raster** | Mathpix is the reference at ~3.1 s/page, ~$0.005/page. VLM scored **88.8%** (Opus 5) / **87.1%** (Gemini 3.6 Flash) with **no parser at all** (report §4.6) | both |
| **PDF, prose** | pdf.js text layer (shipped) | free, instant, adequate | both |
| **scanned** | platform OCR (shipped) — macOS Vision / Windows.Media.Ocr | local, free, already wired; fires when `isScannedText()` is true | both |
| web page | Readability + Turndown | s2a already implements it | both |

**Docling's math score is 0/70 assertions and 0/16 pages** — it emits `formula-not-decoded`
(report §2.5, §4). That is not an argument against Docling; it is the reason the math row routes
elsewhere. Docling does the formats, Mathpix/VLM does the math, and each is used where it wins.

**The Python constraint becomes a tier rule rather than an absolute.** pdfbay decision 7 ("zero
Python on the desktop") was correct for a desktop-only product. officebay has an online tier by
design (§1.1), so Docling runs there without qualification, and the desktop either ships it as an
optional sidecar or falls back to `file-parse` plus our own L1 producer. This is the same split
`report.md` §5 already ruled for parsers, applied to a container.

### 4.4 The VLM raster arm is nearly free and should be measured first

`agent-core` supports images end to end: `AgentImage`, Anthropic `type: 'image'` blocks, and the
markdown app already passes them. **The PDF app simply never does** — `loop.run(instruction)`,
one argument. Passing a page raster is close to a one-line change, needs no new dependency, no
API account, and no Python, and our own benchmark puts that arm within two points of Mathpix.

Given §4.2 — that detection is hard — an arm that costs one argument is the right first
experiment, ahead of a Mathpix integration.

### 4.5 On an AI cache layer

**A cache already exists, with better discipline than I would have proposed.** s2a's `cachedAsk`
(`run.ts:260`) keys `sha256(model + image fingerprint + prompt)` and runs its guards **before the
write**, because the key is the prompt and a cached bad reply is permanent:

| guard | evidence |
|---|---|
| empty reply refused | `repair` returned `''` and `write: draft: ${output}` erased a finished 100 KB draft, while reviews reading another channel reported nothing wrong |
| truncated stop reason refused | re-asks once |
| degeneracy refused below 0.35 distinct-lines | measured across 111 replies: degenerate 0.015, lowest healthy 0.753. One `generate` emitted the same two bibliography titles **1,266 times**, 143 KB, and it was cached |
| `policy.drift` — discard a repair diverging >5% | a repair came back 1,100 words longer with the defect its own rules name still present |

**Do not build a second cache.** The only addition is a **parse cache** — Mathpix/VLM results
content-addressed by `sha256(bytes) + parser + version` — and that is the L1 store, not a layer
in front of one: writing L1 to disk under a content hash *is* the cache.

---

## 5. What genoffice does not have — verified in code

| # | absence | evidence |
|---|---|---|
| A1 | **Ink is invisible to the agent.** Not degraded — absent | `MARKUP_TYPE_BY_ANNOT` (`edit-state.ts:10`) is `{9: highlight, 10: underline, 12: strikeout}`; `toSavedNote` accepts only `annotationType === 1`. **Ink is subtype 15, in neither table** |
| A2 | No cross-document tool | no `open_document` / `list_project_files` in any app's tool set |
| A3 | `project-store` invisible to the agent | projects, files, per-file chat JSONL — UI only. `apps/pdf/package.json` doesn't declare it; the panel reaches `window.projectApi` via shell IPC |
| A4 | Ingestion is eager, twice | `buildSearchIndex` calls `getTextContent()` on every page before any tool runs; the auto-OCR effect calls it again (`App.tsx:1778`, `:1794`). Kept in a `useRef`, discarded on close |
| A5 | No retrieval beyond substring | no embeddings / LanceDB / sqlite-vec / cosine anywhere |
| A6 | **No L1** — nothing names "§19.1" as an object with id, level, page and span | provenance is page-grained by construction |
| A7 | Generated artifacts carry no provenance | `create_document` takes content already in context and writes a file. Terminal |
| A8 | **No map over a document** | §5.1 |

### 5.1 The 60-page rewrite, traced

Asked to humanize a 60-page doc, genoffice does **not** chunk. Each turn `buildDocContext` gives
the model a skeleton — one line per block, preview clipped to 60 chars, list capped at 8,000. At
~1,500 blocks that overflows, so previews drop to 20 chars, then the middle is elided
(`protocol.ts:556-575`):

```
…(1180 blocks elided here; numbering is continuous, extrapolate indexes if needed)…
```

The model is shown both ends and told to **extrapolate indexes for 1,180 blocks it cannot see**.
Nothing schedules ranges; `replace_blocks` may change the block count and renumber everything
after it. At `DEFAULT_MAX_TURNS = 100` the run returns `turnLimit: true` and the UI offers a
**Continue** button sending 11 lines of "finish only the outstanding work" — against a history
whose earlier tool outputs `squashStaleToolOutputs` has already truncated. **Coverage is
unverifiable.**

Same absence as chapter→cheatsheet from the other side. Both are *map over a document*: genoffice
has the per-unit **write** primitives and no **map**. The engine is the map.

---

## 6. What is actually left to build

| # | gap | why it matters |
|---|---|---|
| **G1** | **Math-grounding for degraded PDFs.** Route the page to a VLM raster or Mathpix; §4.2 says routing cannot rely on cheap detection | silent wrong LaTeX on legacy documents, which students and workers hold in quantity |
| **G2** | **L1 for PDF and Markdown.** DoclingDocument-shaped items, content-addressed `self_ref` | provenance finer than a page, surviving re-parse |
| **G3** | **Marks as a pipeline input.** Highlights + typed notes (+ later ink) as a source the engine consumes | *the* pdfbay thesis, and the one thing nothing in this family does. s2a ingests a **source** and has no notion of your marks |
| **G4** | **Engine host inside the fork.** A tool handing a block range + job spec to `@picobay/engine`, results written back through existing ops | closes chapter→cheatsheet and the 60-page rewrite at once |
| **G5** | **Provenance on generated artifacts.** `create_document` gains `sources: [{fileRef, self_ref[]}]` | "what produced this paragraph?" |
| **G6** | **Ink into the loop.** Add subtype 15; strokes + recognition + raster crop | pdfbay rule 7; the only item with no partial answer anywhere |
| **G7** | **Docling as an L1 producer for Office formats** | `file-parse` gives text; the pipeline needs structure |

---

## 7. Implementation sequence

**M0 — Backup and fork hygiene.** *Done.* `~/projects/genoffice`, full clone, `fsck` clean, 127
commits, 24 tags, pinned `d35d770`. [`references/genoffice.md`](../../references/genoffice.md)
records the mirror-publication risk: upstream `main` advances by squashed `Sync snapshot` commits
from a private tree, so history can be rewritten without notice.

**M1 — The VLM raster arm, measured *(G1)*.** Pass the page image alongside `read_pages` text;
`agent-core` already supports it, so this is one argument, no dependency, no account. Then
measure. **Eval design matters more than the code:**

- **Not Goodfellow alone.** It is canonical textbook mathematics — the baseline reconstructs most
  of it from priors, the measured difference would be small, and M1 would be falsely killed.
- **Both classes, labelled**: modern Unicode-mapped (Quarto/Typst, where the baseline is already
  correct — the arm must not *regress* it) and legacy CM (where it drops operators).
- **Equations priors cannot supply**: non-canonical indices, document-specific coefficients,
  novel results.
- **Score silent disagreement**, not just agreement: confident, well-formed LaTeX that does not
  match the page. That is the actual product risk and nothing measures it today.

> **Lazier:** system-prompt the model that math may be garbled and it should say so. Free, honest,
> proves nothing, and does not help a student who cannot tell either.

**M2 — L1 for PDF and Markdown *(G2)*.** `packages/docmodel`: DoclingDocument-subset types plus
two pure functions — build from pdf.js outline + the existing `PageEntry` index, and resolve a
`self_ref` to page + rect. `get_outline` returns `self_ref`; citations become
`[§19.1, p.28](pdfnav://ref/…)`; `read_annotations` reports the containing `self_ref` beside
`[Page N]`.

> **Lazier:** have `get_outline` emit `page` per entry and keep using `search_text`. About a day,
> leaves provenance page-grained, closes none of G3/G5.

**M3 — Engine host *(G4)*.** One tool handing a block range plus a job spec to `@picobay/engine`,
which already has the cache, the guards and the fan-out. Results land through `replace_blocks` /
`create_document`. The fork contributes write primitives and provenance; the engine contributes
map, resume and coverage.

> **Lazier:** prompt "work in ranges of 20 blocks and report the last index done". An hour, and it
> still cannot prove coverage because nothing verifies the claim. That is the ceiling.

**M4 — Marks as a pipeline input *(G3)*.** Export marks + notes anchored by `self_ref` as an
engine source. "Cheatsheet from **my highlights** in chapter 19" becomes a run.

**M5 — Docling as an L1 producer *(G7)*, online tier first.** Office formats to
`DoclingDocument`. Desktop falls back to `file-parse` plus our own producer until a sidecar is
justified.

**M6 — Provenance on artifacts *(G5)*.**

**Deferred deliberately:** retrieval beyond substring (A5) — indexing before the block model
exists indexes the wrong unit. Ink (G6) — needs a spike. Lazy ingestion (A4) — a known cost, not
yet a felt one.

---

## 8. What would kill this

- **If M1 shows no difference on legacy-class documents**, the math-grounding gap is smaller than
  believed and ingestion drops down the order — the consolidation then rests on the artifact
  layer alone, which is still sound but is a different argument.
- **If M1 *regresses* modern-class documents** (raster answers worse than the clean text layer),
  routing becomes mandatory and §4.2's unsolved detection becomes a blocker rather than a caveat.
- **If the owner rules displacement or ink is required before the artifact layer**, genoffice's
  page-fixed PDF app is disqualifying — retrofitting a ProseMirror outer layout into an
  8,652-line `App.tsx` is a rewrite, not an edit.
- **If M2 cannot land as one new package plus narrow, named edits** to
  `apps/pdf/src/renderer/ai/{tools.ts,pdf-skill.ts,pdf-nav.ts}`, the fork is not absorbing work
  cleanly and rebase cost onto each upstream snapshot will compound.
- **If upstream's `ee/` begins absorbing capabilities we depend on**, the effective licence of
  what we need changes. Empty of code at `d35d770`. **Check on every rebase.**

---

## 9. Naming and retirement mechanics

`officebay` fits the family (picobay, notebay, pdfbay, browserbay, stackbay). Apache-2.0 §6 does
not license the GenOffice or Genspark marks, so **a fork must carry its own branding** — the name
is a requirement, not a flourish.

1. Move `bays-component-map.md` and `docling-spikes-2026-09-09.md` into officebay's `references/`.
2. Move `pdf-to-md-benchmark` as-is; it is M1's scorer and stays live.
3. Archive `pdfbay/` and `notebay/` with a one-line `RETIRED.md` pointing here.
4. `pdfbay/spikes/docmodel/selfref.mjs` moves with M2 — the runnable check that a citation
   survives a re-parse. `/tmp/pdfjs-probe/` moves with M1 as the baseline harness.
