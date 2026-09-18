# Handwriting 1.4.19 — measured, not read

**Date:** 2026-09-17. **Status:** evidence.
**Relation:** corrects three claims in
[references/handwriting.md](../../references/handwriting.md) and supplies one model correction to
[PLAN-2026-09-17-markdown-layers.md](../steering/PLAN-2026-09-17-markdown-layers.md) §M1. Does not
supersede either.

Every other finding about Handwriting in this repo is second-hand from the plugin's own
`docs/storage.md` and source comments. This one is from its output: 23 strokes (826 points) drawn
by pen on an ordinary note in a live vault, with the sidecar hashed before and after a text edit.

---

## 1. A stroke, as stored

```json
{
  "id": "91be9b22-3b29-421a-980e-97e4844c4abf",
  "tool": "pen",
  "color": "#2f6de0",
  "width": 2.2,
  "createdAt": 1789679657559,
  "pressureProfile": "exp7",
  "pts": [78.41, 495.32, 0.128, 0,  77.41, 495.32, 0.128, 8,  76.91, 495.32, 0.128, 15, …]
}
```

Flat quads: `[x, y, pressure, t, …]`, document-space px, pressure 0–1, `t` in ms from stroke start,
~120 Hz. No `bbox` — recomputed on load. **Seven fields, no anchor, no `layerId`.**

## 2. A text edit does not move it

Seven blank lines inserted at the top of the note:

```
sha256 before   2fc9aed71aa23f6ebdeccf822d2516333a160591b5996fa622e89f5b04ef1daf
sha256 after    2fc9aed71aa23f6ebdeccf822d2516333a160591b5996fa622e89f5b04ef1daf
bbox  unchanged x 71.9..407.9   y 374.6..603.8
```

Byte-identical; the sidecar's mtime predates the edit, so it was not rewritten and not read. The
plugin's manual states it as policy: *"Markdown reflows wherever it wants. Your ink stays where you
put it."*

**This is correct behaviour and is the intended product behaviour**, confirmed by the owner. It is
not a limitation to design around.

## 3. Scroll is a different motion, and costs nothing

`data.json` → `"cameras": {}`. The inline surface **persists no camera**. It reads the host editor's
scroll offset each frame. There is no second scroll position, so there is nothing to synchronise and
nothing that can drift.

> **For M3/M4: a layer record must not carry a viewport.** Storing one reintroduces exactly the
> reconciliation problem the working implementation avoids by construction.

## 4. Identity write, and save cadence

The note gained `handwriting-page-id` in frontmatter, *then* the sidecar appeared, within one second
— the id write is **awaited**, because a sidecar keyed to an id cannot exist before the id does. A
note never inked on is never modified.

```
17:14:19    871 B    page created
17:14:21   6579 B    +2 s
17:14:25  17868 B    +4 s   ← the 5-second ceiling firing mid-burst
17:14:27  22728 B    +2 s
```

700 ms after the last change, under a 5 s ceiling that later changes do not reset. Confirms the
policy M5 proposes to adopt.

---

## 5. Model correction for M1: it is canvas identity, not block identity

M1 takes its mechanism from `remapSlides` and calls the missing primitive *block identity*. Two
things about that.

**`remapSlides` is not an ink-anchoring mechanism.** Ink is anchored to a canvas by absolute
coordinates and never moves. `remapSlides` re-identifies *which canvas* a stored stroke set belongs
to after the deck is re-split. The FNV hash identifies the canvas; the ink is untouched.

**A canvas needs an id only where it has no natural one:**

| surface | the canvas | its id | stable? |
|---|---|---|---|
| a note | the note's document space (origin: document top + text-column left) | `handwriting-page-id` in frontmatter | **yes** — survives rename and move |
| a markdown presentation slide | that slide's logical deck space, 960×700 | the slide **index** | **no** — one inserted `---` shifts every later index. Hence the hash. |
| a PDF page | page-local px at scale 1 | page number, inside a file id = SHA-256 of first 64 KiB + byte length | yes |

So the inline surface has no anchors **and needs none**: the note *is* the canvas, and it already
has a stable id. Content-hash identity is proven at slide granularity, where a canvas is coarse and
has no id of its own. Generalising it to paragraphs is a different claim, and this project's own
prior research flagged the failure mode:

> Reader-authored blocks cannot be content-addressed. […] Under content addressing its ID changes on
> every keystroke, so anything anchored to it orphans continuously.

**Suggested reframing:** M1 supplies *canvas identity* — required where a canvas has no natural id —
and text-attached marks (comments, highlights) get a separate mechanism, a range plus a quote for
re-anchoring. Two mechanisms for two things, rather than one stretched over both.

A consequence for ordering: **ink needs none of M1.** It is complete today with a page id, one
origin and absolute coordinates. Whether it should therefore come earlier than M5 is a scheduling
call, not an architectural one, but it should be a deliberate call rather than a side effect.

## 6. Scope note on M5

M5 says *"Four unrelated `InkStroke` shapes already exist in this repo … Consolidating them is part
of this milestone."* Three of those four live in `apps/docs`, `apps/slides` and `apps/pdf`, which
the plan's own out-of-scope list excludes. If officebay is markdown editors and the extensions
around them, that consolidation is out of scope and M5 should say so.

## 7. A test harness that needs no fork

From the vendored storage extract, which this measurement confirms:

> **Unknown fields survive.** Anything Handwriting does not recognise, at the top level or on an
> individual stroke or box, is preserved verbatim through a load and save.

So an anchor can be written onto a real stroke and the shipping plugin round-trips it untouched
while continuing to draw at the stored coordinates. **M1's resolution rules can be exercised against
live sidecars from a working implementation** — no fork, no licence exposure, no reimplementation of
ink capture. It also makes the format extension backward-compatible: a stroke with no anchor is
canvas-anchored and fixed, which is §2.

---

## Method

Drawn in Obsidian 1.13.x with Handwriting 1.4.19 on a pen tablet; sidecar snapshotted on every byte
change; note edited in the editor; sidecar re-hashed. Settings read from
`.obsidian/plugins/handwriting/data.json`. Source read from the upstream clone at the pinned commit.
