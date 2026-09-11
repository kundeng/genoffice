---
audience: an external designer or a design-capable model (Claude Design, v0, etc.)
self_contained: yes — assumes no access to this repository
deliverable: mockups and/or prototype code for the reading surface
---

# Design brief — officebay reading surface

## 0. How to use this brief

You need no repository access. Everything required is below. Where a thing **already exists** it is
marked ✅ — do not redesign it; design the things marked ❌ and 🟡, and show how they sit beside
what exists.

Target: **Electron desktop app, React 19, macOS and Windows.** Dense, keyboard-driven, professional
— closer to a code editor or Preview.app than to a consumer web app. Long sessions, hours at a time.

---

## 1. What the product is

A desktop document reader with an AI that is **anchored to what the reader marked**, not to a chat
box.

The user is a student or a worker reading something hard — a textbook chapter, a spec, a paper, a
60-page draft. They highlight, they write margin notes, sometimes they draw with a pen. Then they
want to *do* something: understand a passage, produce a cheatsheet, rewrite a section.

**The core bet:** what the reader marked is the best input to what the reader produces. Marks
encode attention; a generator cannot fabricate them.

**The anti-goal, and it is the sharpest constraint in this brief:** the app must not make *asking*
faster than *reading*. If the fastest path is typing into a chat box, the reader stops reading and
starts querying, which destroys the comprehension the product exists to support. Chat exists and
must be excellent — but it is not the default and not the centre.

---

## 2. The screen that matters

One window, one document open, agent available. Three zones, and the proportions are a design
question:

```
┌──────────────────────────────────────────────────────────────────────┐
│  tab bar — several documents open at once                     ✅     │
├────────────┬───────────────────────────────────┬────────────────────-┤
│            │                                   │                     │
│  outline / │        THE PAGE                   │   MARK SURFACE      │
│  sections  │                                   │   notes, ink,       │
│            │   continuous vertical scroll      │   AI replies        │
│  ✅ exists │   ✅ renders, selectable text     │   🟡 partial        │
│            │                                   │                     │
└────────────┴───────────────────────────────────┴─────────────────────┘
```

Currently the right zone is a **chat panel**. That is the thing most in question: it should become
a surface of *anchored work*, with conversation as one kind of entry among several.

---

## 3. The four renderings of a mark — the heart of the brief

"Margin" is a metaphor, and it has been taken too literally. It does not mean the strip at the edge
of the page. It means **anywhere in the workspace, anchored to the reader's work.** Four renderings,
and a design that only produces the sidenote column has solved one quarter of the problem.

### 3.1 Overlay ✅ *(exists — do not redesign, but show it in context)*

On the page itself: a highlight over a span, ink drawn in place, a note pin.

### 3.2 Virtual margin ✅ *(exists — improve, do not replace)*

A column outside the page's own box — a margin the page never had. Cards stack; each wants to sit
level with its anchor; collisions push neighbours down; a **leader line** runs from the pin on the
page to the card.

**Design the hard states:** twelve marks on one page (cards cannot all sit level); a card whose
anchor scrolls off-screen; two marks three lines apart; a very long note.

### 3.3 Dragged-apart ❌ *(new — the hardest and most distinctive)*

The reader opens a **gap inside the page flow**. Content below shifts down; the gap holds their
work — a derivation, an expansion, a worked example, a translation.

The page is no longer a fixed rectangle: it is a **stream that can be pushed apart**.

Design questions you are being asked to answer:
- How does a reader *open* a gap? A gesture, a drag on a page break, a keystroke on a selection?
- What does the seam look like, so it reads as *inserted* rather than as *part of the original*?
  This matters: the reader must never confuse their own content with the source.
- What happens at a page boundary when the gap pushes content past it?
- How does it collapse? Does it leave a visible scar, so the reader knows something is folded there?
- How does printing or export handle it?

### 3.4 Floating 🟡 *(partial — a panel exists but does not follow its anchor)*

A panel that follows the anchor without taking page space. Overlaps content, so it needs a dismissal
model and a collision model.

---

## 4. The interactions to design

### 4.1 The anchored ask ✅→🟡

Selecting text pops a small "ask" affordance. It works today, **but the answer goes to the chat
panel and is never tied back to the selection.** Design the return path: the answer becomes a
durable thing attached to that passage, revisitable tomorrow.

### 4.2 Marks → artifact ❌ *(the thesis, made concrete)*

> "Make a cheatsheet **from my highlights** in chapter 19."

Not from the chapter — from *what the reader marked in it*. Design:
- How does a reader select a set of marks? (a chapter? a colour? a date range? drawn-around?)
- How do they see what will be used **before** committing?
- Where does the result go — new tab, new document, side-by-side with the source?
- How does the result show which mark produced which part?

### 4.3 Long-running work over a whole document ❌

> "Humanize this 60-page document."

This is a **job**, not a chat turn: minutes long, hundreds of units, resumable. Today the existing
app runs until a turn budget expires and offers a *Continue* button with no record of what was done —
coverage is unverifiable.

Design the job surface: progress over *units* not percent; which units are done, running, failed,
skipped; how to pause, resume, and inspect one unit's before/after; how to reject a single unit's
result without discarding the run.

### 4.4 Trust signals on generated content ❌ *(a correctness requirement, not decoration)*

Some documents can be read accurately and some cannot, and **the system can sometimes tell**.

Concretely: on a modern PDF the AI reads equations correctly. On a 2016-era LaTeX textbook the Σ is
simply **missing** from the extracted text, so the AI *reconstructs* the formula from memory. It is
usually right about famous equations and unconstrained about novel ones — **and the output looks
identical in both cases.**

Design a signal for "this answer rests on a degraded reading of the page" that a tired reader
actually notices at 1am, without turning the interface into a wall of warnings. This is the hardest
visual-language problem in the brief.

### 4.5 Stale anchors ❌

Documents get edited; sources get replaced by new versions. A mark can become: *source changed*,
*moved*, *text under it rewritten*, or *target gone*. Four states, needing four distinguishable
treatments — and none of them should look like an error the reader caused.

---

## 5. Ink

Pen strokes are captured and saved today ✅. What is missing is what happens **after**: a hand-written
formula or note is currently just pixels.

Design: how a reader asks for a stroke to be recognised; how the recognition is shown beside the
original (both must remain visible — a wrong recognition must be recoverable, never silently
replacing the ink); how handwritten notes flow into 4.2.

---

## 6. States to cover

Not decoration — each of these is where this kind of app usually fails:

| state | why it matters |
|---|---|
| empty (no marks yet) | the first-run moment must teach the loop without a tour |
| a page with 12 overlapping marks | the realistic case, not the demo case |
| anchor scrolled off-screen | where do its card and leader line go? |
| job running 4 minutes | the reader must be able to keep reading meanwhile |
| degraded-source reading | 4.4 |
| stale anchor, 4 kinds | 4.5 |
| scanned document, OCR text | text exists but is imperfect; should the reader be told? |
| a 900-page book | outline, scroll, position memory at scale |

---

## 7. Constraints

- **Electron desktop**, React 19. Not a web page: no cookie banners, no hero sections, no marketing.
- **Dense and quiet.** Content is the interface. Chrome recedes.
- **Keyboard-first** for everything frequent.
- **Light and dark**, both first-class. Long night sessions are the norm.
- **The page is sacred.** The reader's own content must never be mistakable for the source, and the
  source must never be visually degraded by our additions.
- **Local-first.** Documents never leave the machine; only AI calls do.
- **Accessibility is not optional**: keyboard reachable, screen-reader sane, and colour is never the
  only carrier of meaning — this matters doubly for 4.4 and 4.5.

---

## 8. Deliverables

In priority order:

1. **The reading surface at rest** — page, outline, marks, with the virtual margin working under
   realistic density (10+ marks).
2. **Dragged-apart (3.3)** — the distinctive one. Open, filled, collapsed, and at a page boundary.
3. **Marks → artifact (4.2)** — selection of marks, preview, result, provenance back to marks.
4. **Trust signals (4.4)** — a visual language for degraded readings, shown across 3–4 severities.
5. **Job surface (4.3)** — a long run in progress, with per-unit state.

Static mockups are useful. **Prototype React code is more useful**, because the interaction
questions in 3.3 and 4.3 cannot be judged from a still image.

---

## 9. Explicitly not wanted

- A chat-centric layout with the document as a preview pane.
- Auto-generated summaries appearing without being asked for.
- A "pick an artifact type" menu as the primary entry point.
- Onboarding carousels, feature tours, empty-state illustrations with mascots.
- Anything that makes asking faster than reading (§1).
