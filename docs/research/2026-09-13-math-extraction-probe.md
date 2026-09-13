# Probe: what genoffice actually recovers from a math-heavy PDF

**Date:** 2026-09-13. **Status:** measurement, run on this machine against the built app's own
extraction path. **Question:** if a reader asks for a markdown summary of chapter 2 of a
mathematics book, does the inherited product extract the original symbols, and what does it
produce?

This is the first executed instance of `.kiro/specs/02` R5 ("measure ingestion sufficiency"). It
measures extraction, which is the input to any summary — a summary cannot contain notation the
extractor never recovered.

## The document

`~/Dropbox/book/refs/matrix differential.pdf` — Magnus & Neudecker, _Matrix Differential Calculus
with Applications in Statistics and Econometrics_. 468 pages, PDF 1.5, **Type1 fonts only**,
**encrypted** (`/Encrypt`, `/P -3388` — extraction and printing permitted, modification denied,
empty user password so it opens without a prompt).

Chosen deliberately: `docs/steering/tech.md` §6 records that "legacy CM/Type1 PDFs can drop
operators and return draw order instead of reading order". A Type1 mathematics text is the hard
case, not the easy one. Chapter 2 — "Kronecker products, the vec operator and the Moore-Penrose
inverse", pages 49–64 — is dense with ⊗, primes, Greek indices and matrix layouts.

## Method

Read through the same `pdfjs-dist` path the PDF app uses (`getDocument` → `getTextContent`), so the
numbers describe the product's behavior rather than a separate tool's.

## Result: symbol recovery is good, layout recovery is not

Across pages 49–64 (19,943 characters):

| measure                                          | value                        |
| ------------------------------------------------ | ---------------------------- |
| mathematical glyphs recovered                    | 12 distinct, 386 occurrences |
| `′` (prime/transpose)                            | 198                          |
| `⊗` (Kronecker product)                          | 94                           |
| `×`, `Λ`, `⇒`, `λ`, `μ`, `∑`, `α`, `⊂`, `∈`, `≥` | 92 combined                  |
| U+FFFD replacement characters                    | **0**                        |
| newlines recovered                               | **0**                        |

**The symbols survive.** Zero replacement characters and 94 correct `⊗` glyphs means the Type1
encoding tables resolve properly on this document. The fear recorded in `tech.md` §6 — that legacy
Type1 drops operators — **does not hold for this PDF.** That is a measured correction to a stated
assumption, and it narrows the case for a raster/VLM path: at least some legacy math PDFs extract
their notation cleanly.

**The structure does not survive.** What comes back is one unbroken character stream. Real output
from page 49:

```
CHAPTER 2Kronecker products, the vecoperator and theMoore-Penrose inverse1 INTRODUCTIONThis
chapter develops some matrix tools that will prove useful to us later.
```

Three failures visible in that one line:

1. **Word joins at layout boundaries** — `vecoperator`, `theMoore-Penrose`, `2Kronecker`,
   `inverse1 INTRODUCTION`. Line-break positions carry no space.
2. **Headings are indistinguishable from body text.** "CHAPTER 2" and "1 INTRODUCTION" are inline
   with the prose. Nothing marks them as headings.
3. **Display equations become inline runs.** From page 50:

```
(A ⊗ B)(C ⊗ D) = AC ⊗ BD, (4)
```

The symbols are right, but the fact that this was a centred, numbered display equation is gone.
Equation number `(4)` is just more text.

Worse, on page 49 a matrix collapses entirely:

```
a11B . . . a1nB... ...am1B . . . amnB (1)
```

That is a 2-D bracketed matrix with ellipses flattened into a line. The row structure — the actual
mathematical content — is unrecoverable from this stream.

## What this means for a "summarize chapter 2" request

An agent receiving this text can write an accurate prose summary: the topic words, theorem
statements and inline relations are all present and correct. What it cannot do is **reproduce the
mathematics faithfully**, because:

- it cannot tell a display equation from a sentence, so it cannot render `$$…$$` correctly;
- it cannot reconstruct matrix layout, so any matrix it emits is invented, not extracted;
- heading structure must be guessed from content, so section boundaries in the summary are the
  model's inference rather than the document's fact.

The output would look plausible and be subtly wrong in exactly the places a mathematician checks.

## The gap this identifies, in the project's own vocabulary

Per `tech.md` §1 this is a **capability** gap, not exposure or registration — but a _narrower_ one
than previously assumed:

| assumed gap                                        | measured gap                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| "genoffice cannot see math symbols in legacy PDFs" | symbols extract correctly (0 U+FFFD, 94 ⊗)                                                      |
| —                                                  | **structure** is absent: no lines, no headings, no display/inline distinction, no matrix layout |

The missing layer is a structural L1 — reading order, block typing, equation regions — not a better
glyph decoder. `tech.md` §4 already names that layer ("typed structural items in reading order").
This probe is evidence for building it and evidence _against_ reaching first for Mathpix or a VLM
on the grounds of symbol loss, at least for Unicode-mapped Type1 documents like this one.

The comparison corpus is already on this machine: `~/Projects/mathpix_home` holds 292 `.mmd`
(Mathpix Markdown) files plus 11,716 page images — extracted output, not source. That is the
ground truth to diff a future structural extractor against.

## Reproducing this

The measurement script is `tools/probe-math-extraction.mjs`. Run:

```bash
env -u ELECTRON_RUN_AS_NODE node tools/probe-math-extraction.mjs <pdf-path> <first-page> <last-page>
```

## Not yet measured

- The full round-trip through the app's AI panel (extraction → model → markdown). This probe stops
  at extraction because extraction is the binding constraint; a better prompt cannot recover
  structure that is absent from the input.
- `pdf2docx`, the on-device PDF→Word path, which does its own layout analysis via pdfium and may
  recover more structure than the raw text layer. **This is the next thing to measure** — if it
  already reconstructs blocks, part of the L1 layer may be inherited rather than built.
- Non-Type1 and scanned math documents.
