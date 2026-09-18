# Handwriting (Obsidian plugin) — vendored reference

| field | value |
|---|---|
| Upstream | `https://github.com/ellimist-afk/handwriting.git` |
| Author | Alan Liu |
| Licence | **CC BY-NC-ND 4.0** — noncommercial use and sharing with attribution; no distribution of modified versions |
| Trademark | `TRADEMARKS.md`: no registered mark claimed; forks are asked to use distinct branding and not imply endorsement |
| Working clone | `~/Projects/_refs/handwriting` (depth 50, outside this repo) |
| Pinned commit | `fbc81280b6252ddc9c2799fe9e85ce56351a6472` |
| Commit date | 2026-09-14 11:17:24 -0500 |
| Subject | `1.4.19` |
| Size at clone | 581 files, ~161k lines TS, 28 tags |
| Recorded | 2026-09-17 |

## Why it is here

It is the working implementation of the thing officebay's markdown layer stack has to do: ink on
an ordinary markdown file, on desktop and tablet, where the file stays markdown. Assessed on
2026-09-17 as the best available reference for that mechanism.

(An earlier draft said "where the ink follows the text." It does not, and §Limits below says so —
ink is fixed to the canvas and text reflows underneath it. Corrected against measurement, 2026-09-17.)

Two designs are taken from it, both as design facts rather than code:

1. **Sidecar plus frontmatter id.** Ink lives in `.handwriting/<page-id>.json`, never in the
   markdown. The markdown gets one line, `handwriting-page-id`, written on the first stroke and
   never again. Keying the sidecar on the id rather than the filename is what makes rename and
   move free.
2. **Content-hash section identity.** Presentation ink stores `{index, hash}` per slide, because
   "the index alone is not an identity — inserting one `---` above the first slide shifts every
   later index by one." `remapSlides` re-attaches by hash, keeps the stored index when the hash
   matches nothing, and never merges two stored slides onto one section.

Its limits are as informative as its designs. Inline ink is anchored to a single origin — the
document top and the text column's left edge — so it scrolls perfectly and does **not** survive a
reflow above it; the "insert space" tool is the manual compensation. And it has no layer concept at
all: every one of the 219 occurrences of `layer` in the source is a render layer, and no stroke
carries a layer id.

## Corrected by measurement, 2026-09-17

The extracts below are Handwriting's own `docs/storage.md` and source comments, vendored verbatim.
That file's own header says: *"Where this document and the code disagree, the code is right."*
Three places where it does, established by reading live sidecars the plugin had just written —
23 strokes on a note in a working vault. Evidence:
[docs/research/2026-09-17-handwriting-measured.md](../docs/research/2026-09-17-handwriting-measured.md).

| claim in the extracts | measured |
|---|---|
| a stroke is `id, tool, color, width, createdAt, and points`; no pressure field recorded | every stroke also carries `pressureProfile: "exp7"`, and **pressure is stored** — the third element of every point quad, real values 0.128–0.889 at ~120 Hz |
| ink lives in `.handwriting/` at the vault root | the folder is the **`inkFolder` setting**. `DEFAULT_INK_FOLDER = ".handwriting"`, `SYNCED_INK_FOLDER = "handwriting"`. The measured vault uses the latter, because Obsidian Sync ignores dot-folders |
| "…and points" | `pts` is a **flat `[x, y, pressure, t, …]` array**, and `bbox` is not serialised at all |

The folder correction is the one with teeth: any code assuming a fixed `.handwriting/` path is wrong
on a synced vault, which is the only kind that matters. Handwriting itself had to add
`adoptInkFolder()` — which sniffs for a folder *holding live pages*, excluding `.conflict-` and
`.damaged-` residue — after a second device read nothing and wrote a duplicate sidecar per page id.

The rule that follows: **the location of the layer store must travel with the document, not live in a
settings file.**

## On reuse

The licence permits use and sharing for noncommercial purposes with attribution. It does not permit
selling it, using it commercially, or distributing a modified version. Mechanisms and design
decisions are not covered by copyright and are what this project takes; the source is not a place
to copy code from into a shipped officebay. If a code-level dependency ever looks worthwhile, the
licence says to ask, and the author invites that.

## Verification

```
git -C ~/Projects/_refs/handwriting log -1 --format=%H   # fbc81280b625...
git -C ~/Projects/_refs/handwriting ls-files | wc -l     # 581
head -9 ~/Projects/_refs/handwriting/LICENSE             # CC BY-NC-ND 4.0
```

## What was read

`manifest.json`, `README.md`, `LICENSE`, `TRADEMARKS.md`, `docs/storage.md`, `docs/manual.md`
(`## slides`, :396-424), `src/model/PageData.ts`, `src/inline/DocumentTop.ts`,
`src/inline/ContentOrigin.ts`, `src/inline/FoldOrderControl.ts`, `src/slides/SlidesInkSurface.ts`
(header S1-S5, `sectionHash`, `remapSlides`).

Vendored excerpts, so the findings are checkable without the clone:

- [extracts/handwriting-docs-storage.md](extracts/handwriting-docs-storage.md) — the storage model, verbatim
- [extracts/handwriting-manual-slides.md](extracts/handwriting-manual-slides.md) — the `## slides` manual section
- [extracts/handwriting-source-excerpts.md](extracts/handwriting-source-excerpts.md) — the quoted source spans
- [extracts/handwriting-LICENSE.txt](extracts/handwriting-LICENSE.txt)

Findings are in
[docs/research/2026-09-17-markdown-block-model-and-layer-anchoring.md](../docs/research/2026-09-17-markdown-block-model-and-layer-anchoring.md).
