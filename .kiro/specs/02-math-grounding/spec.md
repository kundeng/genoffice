---
spec_id: 02-math-grounding
status: DRAFT
closed_as: null
since: null
until: null
epic: ingestion
features: [vlm-raster-arm, answer-accuracy-eval, degraded-source-signal]
supersedes: []
superseded_by: null
depends_on: [01-consolidate-and-retire]
anchors: [product, tech, pillars]
---

# 02 · Math grounding — does a page image improve *answers*?

# 1 · Requirements

## Introduction

On a modern Unicode-mapped PDF the agent reads equations correctly. On a legacy CM/Type1 PDF the
operator is **dropped from the text layer entirely** — Goodfellow eq. 3.9's Σ arrives as
`{"str":"", "font":"g_d0_f12", "w":18.97}`, 19 points wide and zero characters — and glyphs arrive
in draw order rather than reading order.

A frontier model handed that soup often still emits correct LaTeX, because it **recognises the
mathematics**. That is reconstruction from priors, not extraction: reliable on canonical results,
unconstrained on novel ones, and **well-formed either way**, so the failure is silent.

`pdf-to-md-benchmark` §4.6 established that a page raster beats the text layer for **transcription**
(88.8% Opus 5, 87.1% Gemini 3.6 Flash, with no parser at all). **It did not test question
answering**, which is the product claim. This sprint tests that.

The arm is nearly free: `agent-core` already supports images end-to-end (`AgentImage`, Anthropic
`type:'image'` blocks) and the markdown app passes them. `apps/pdf` calls `loop.run(instruction)`
with **no images argument**. That is the change.

## Requirements

**R1 — The PDF agent can be given the page raster.** WHEN a question concerns a page, THEN the
renderer may pass that page's PNG alongside the text, through the existing `AgentImage` path. No new
dependency, no new provider code.

**R2 — Answer accuracy is measured, not transcription accuracy.** WHEN the eval runs, THEN it scores
*answers to questions about equations*, with the model held constant and only the input varying.

**R3 — The corpus spans both document classes.** WHEN pages are selected, THEN both
Unicode-mapped (Quarto/Typst/modern LaTeX) and legacy CM/Type1 pages are present and labelled. A
result on one class only is not a result.

**R4 — Priors are controlled for.** WHEN questions are written, THEN a subset must concern
equations a model **cannot** reconstruct from memory — non-canonical indices, document-specific
coefficients, novel results. Goodfellow alone would measure recall, not reading.

**R5 — Silent disagreement is counted separately.** WHEN an answer is scored, THEN confident,
well-formed output that contradicts the page is recorded as its own category. This is the product
risk; overall accuracy hides it.

**R6 — No regression on the good class.** WHEN the raster arm runs on Unicode-mapped pages, THEN it
must not score below the text-only baseline. If it does, routing becomes mandatory — and routing
detection is unsolved (`tech.md` §3.1).

## Out of scope

- Mathpix integration. Decide after the cheap arm is measured.
- Routing/detection. Blocked on this result.
- Any UI for trust signals — that needs design (`docs/design/BRIEF-…` §4.4).
- L1, marks, provenance. Later sprints.

---

# 2 · Design

## 2.1 The three arms

Model held constant; only the input varies.

| arm | input to the model |
|---|---|
| **A — baseline** | `read_pages` text, i.e. `getTextContent()` in draw order |
| **B — raster** | the page PNG at 200 DPI, no text |
| **C — both** | text + PNG together |

C is the likely product configuration and the one the benchmark never tested.

## 2.2 Corpus — four cells, and R4 is the one that matters

|  | canonical maths | non-canonical maths |
|---|---|---|
| **Unicode-mapped** | cell 1 | cell 2 |
| **legacy CM/Type1** | cell 3 | **cell 4 — the decisive cell** |

Cell 3 is where priors rescue a degraded reading; cell 4 is where nothing can. **A large A-vs-B gap
in cell 4 and a small one in cell 3 is the expected shape** — and if cell 4 shows no gap, the whole
premise is wrong and this closes `RETRACTED`.

Sources: Goodfellow (legacy, canonical) already rendered at 200 DPI in the benchmark; a Quarto
lecture PDF (Unicode, both kinds); recent arXiv papers for non-canonical content.

## 2.3 Questions, not transcriptions

Each page gets 3–5 questions answerable **only from the page**, with a human-written expected
answer — e.g. *"In equation 5.4, what is the index range of the product?"*,
*"What does the subscript on the second term refer to?"*

Scoring is 3-way and the third category is the point:

| | |
|---|---|
| **correct** | matches the page |
| **refused** | says it cannot read it — *acceptable*, not a failure |
| **silently wrong** | confident, well-formed, contradicts the page — **the product risk** |

## 2.4 Implementation

One argument, one renderer function.

```
apps/pdf/src/renderer/ai/AiPanel.tsx      loop.run(instruction)  →  loop.run(instruction, images)
apps/pdf/src/renderer/<new>.ts            renderPageToPng(pageIndex, dpi) via the existing canvas
```

Both are narrow, named edits per `AGENTS.md`. The eval harness lives in `pdf-to-md-benchmark`
(already the scorer, deliberately not vendored) so it is reusable and not carried in the fork.

---

# 3 · Tasks

- [ ] **T1 — Corpus and question set.** 20–30 pages across all four cells of §2.2, labelled by
      class; 3–5 questions each with expected answers.
      **Check:** every cell has ≥5 pages; cell 4 has ≥8 questions no model could answer from memory.

- [ ] **T2 — `renderPageToPng(pageIndex, dpi)`** in the PDF renderer, reusing the existing pdf.js
      canvas path. 200 DPI to match the benchmark.
      **Check:** output is byte-comparable in size/dimensions to `runners/render_pages.py` for a
      known page.

- [ ] **T3 — Pass images through `loop.run`.** One argument at the call site; the transport already
      handles it.
      **Check:** a request carries an `image` content block, confirmed at the provider boundary.

- [ ] **T4 — Run all three arms**, model held constant, over the T1 corpus.
      **Check:** 3 arms × full corpus, no missing cells.

- [ ] **T5 — Score 3-way and report per cell.**
      **Check:** a table of correct / refused / **silently wrong** per arm per cell.

- [ ] **T6 — Decide and record.** The result either justifies the raster arm as default, justifies
      it only for a routable class, or kills it.
      **Check:** the decision is written into `docs/steering/tech.md` §3 with its evidence.

---

# 4 · Checks

| check | expected |
|---|---|
| corpus covers 4 cells | ≥5 pages each; cell 4 ≥8 prior-proof questions |
| all 3 arms complete | no missing cells |
| **cell 4, A vs B** | **the decisive number** |
| cell 1/2 (Unicode), A vs B | B must not regress (R6) |
| silently-wrong count | reported separately, per arm |

**Stopping condition.** T5's table exists and T6's decision is recorded in `tech.md`.

**What would close this `RETRACTED`:** no measurable difference in cell 4. Then the degraded-reading
problem is smaller than believed, ingestion drops down the order, and the product rests on the
artifact layer alone — still sound, but a different argument.

---

# 5 · Next action

**T1** — build the corpus. It is the long pole and the only task that cannot be automated: the
questions must be written by someone who can read the equations and judge whether a model could
answer from memory rather than from the page.
