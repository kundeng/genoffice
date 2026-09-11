# officebay — Product

## 1. The thesis

**Comprehension, not artifacts.**

A document carries working state across sessions — marks, ink, notes, open questions, reading
position — and the reader returns to it. The scoping test, inherited from pdfbay and unchanged:

> *If the AI produced a perfect artifact and the human never read the document, did it work?*
> **No.** A feature that answers yes is out of scope.

But comprehension is not the whole product, and this is where officebay differs from pdfbay.
Workers and students do not only read; they **produce** — a cheatsheet before an exam, a writeup
from a chapter, a rewrite of a 60-page draft. The second half of the thesis:

> **What the reader marked is the best input to what the reader produces.**

Those two halves are why this is one product rather than two. A reading tool with no output is a
viewer. A generator with no reading is a summariser, and the evidence says answer-seeking
substitution is exactly what destroys comprehension. **Marks are the bridge**: they are made while
reading, they encode attention, and they are the one input a generator cannot fabricate.

## 2. Who it is for

**Workers and students of all kinds.** This is a constraint, not a demographic note. It means:

- **The corpus is whatever arrives** — modern Quarto and LaTeX output, 2016-era textbooks, scanned
  photocopies, Word exports, slide decks. No assumption about input quality is available.
- **The user cannot be asked which kind they have.** Any design that needs the reader to know
  whether their PDF is Unicode-mapped or CM-encoded is invalid. The system must detect, or degrade
  loudly, or work on everything.
- **Failure must be visible.** A confident wrong answer is worse than a refusal, because the reader
  is using this precisely where their own judgement is weakest.

## 3. What officebay is, concretely

A fork of **genoffice** — a shipped, six-app Electron office suite with an agent in every document —
extended with the layer it does not have.

genoffice reads, edits and marks documents well. What it lacks is everything **downstream of a
mark**: no document model finer than a page, no provenance on generated files, no map over a
document, no corpus the agent can see.

```
        what genoffice ships                 what officebay adds
   ┌───────────────────────────────┐   ┌──────────────────────────────────┐
   │ read · edit · mark · chat     │   │ L1 document model (stable ids)   │
   │ 6 apps, 1 shell, 1 agent loop │ + │ marks → pipeline input           │
   │ byte-preserving save          │   │ map over a document (the engine) │
   │ pdfium/pdf.js/Tiptap          │   │ provenance on every artifact     │
   └───────────────────────────────┘   │ math grounding · corpus tools    │
                                       └──────────────────────────────────┘
```

## 4. The four surfaces a mark can render on

"Margin" is a metaphor and it has been read too literally. It does not mean the strip at the edge
of the page. It means **anywhere in the workspace, anchored to the reader's work**. Four renderings,
all in scope:

| rendering | what it is | genoffice today |
|---|---|---|
| **overlay** | on the page — highlight, inline ink, a note pinned to a span | ✅ ships |
| **virtual margin** | a column outside the page's own box, which the page never had | ✅ ships (`NoteMargin.tsx`, leader lines to pins) |
| **dragged-apart** | a gap opened *inside* the page flow, content below shifting down | ❌ the hard one — needs the outer layout |
| **floating** | a panel that follows the anchor without occupying page space | 🟡 partial (AI panel is not anchor-following) |

A design that only builds the sidenote column has built one quarter of the thesis.

## 5. The work-anchored principle

**Opening a document lands the reader in the document, not in a chat box.** The reader's own marks
are the primary AI surface; chat is first-class and must be excellent, but it is not the default.

This is not a preference. Chat-first makes the fast path *asking* rather than *reading*, which is
the substitution the thesis exists to prevent. Anchored interaction makes the fast path
"I marked this, now do something with it."

genoffice already has the right instincts here — `AiAskPopover` on selection in both PDF and
Markdown, and a queue of anchored edits in Markdown that survives editing. What it lacks is the
return path: an anchored ask produces chat, never a durable artifact tied to that anchor.

## 6. What is deliberately not built

- Automatic summaries on import.
- A "generate one of N artifact types" menu.
- Podcast/audio output; agent swarms.
- Any output the reader did not ask for, at a place they were not looking.
- **Answer-seeking substitution** — a UI whose fastest path is asking instead of reading.

## 7. Build order

Ordered by what unblocks what, not by visibility.

1. **Math grounding** — the reader must be able to trust what the agent says about an equation.
   Today the answer is reconstructed from model priors on legacy PDFs and nothing signals it.
2. **L1 document model** — a section is an object with an id, a level, a page and a span.
   Everything downstream anchors into it; provenance cannot be finer than a page without it.
3. **Marks as artifact input** — the thesis, made mechanical.
4. **Map over a document** — chapter → cheatsheet, and the 60-page rewrite, with provable coverage.
5. **Provenance and corpus** — what produced this, and what else do I have.
6. **Displacement** — reader-opened gaps. Last because it decides the rendering architecture and
   is the only item that may require touching the page surface deeply.

## 8. Where this product can lose

Stated up front so it stays falsifiable.

- **If math grounding does not measurably improve answers**, the flagship claim is dead and the
  product is a reorganisation of existing parts.
- **If marks-as-input is not actually used** — if the owner reads, marks, and then still types a
  prompt from scratch — the bridge in §1 is imaginary and this is two products.
- **If displacement proves impossible** on the page-fixed surface, one of the four renderings in §4
  is permanently out, and the "margin is a metaphor" claim narrows.
- **If upstream diverges faster than we can rebase**, the fork becomes a snapshot and we inherit
  maintenance of a six-app office suite, which is not a business we want.
