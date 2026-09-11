---
spec_id: 01-consolidate-and-retire
status: CLOSED
closed_as: SHIPPED
since: 2026-09-11
until: 2026-09-11
epic: foundation
features: [evidence-consolidation, project-retirement, fork-hygiene]
supersedes: []
superseded_by: null
depends_on: []
anchors: [pillars]
---

# 01 · Consolidate the evidence, retire pdfbay and notebay

# 1 · Requirements

## Introduction

Three efforts converge on this fork. Two of them are being retired, and **everything that survives
them is documentation and measurement, not code** — pdfbay is docs plus one spike, notebay is 3,944
lines of mostly fixtures and config. The risk of retirement is therefore not lost code; it is
**lost evidence**, and evidence that is still cited after its source directory is archived.

This sprint moves what is load-bearing into the fork, backs both projects up where they can be
recovered, and leaves a marker at each old location so a future reader is not misled by an
unmarked, frozen tree.

It writes **no product code**. That is deliberate: every later sprint cites measurements taken in
those two repos, and a citation whose target has moved is a broken citation.

## Glossary

- **Load-bearing evidence** — a document later sprints cite for a number or a ruling. Landscape
  surveys and superseded steering are not load-bearing; measured results and the component map are.
- **Retired** — the working tree is frozen, backed up, and carries a `RETIRED.md` naming its
  successor. Not deleted.
- **TBD folder** — `~/Projects/TBD/`, the owner's holding area for retired work.

## Requirements

**R1 — Evidence survives the move.** WHEN a document in pdfbay or notebay is cited by the officebay
research note or by `pillars.md`, THEN it exists in this fork under `docs/research/` and every
relative link inside it resolves from its new location.

**R2 — The pdf-to-md-benchmark stays live.** It is the scorer for the ingestion sprint, is not being
retired, and must **not** be copied into the fork. Its location is recorded so citations resolve.

**R3 — Both projects are backed up before anything is frozen.** WHEN the backup completes, THEN a
checksummed archive of each project exists under `~/Projects/TBD/`, and the archive has been
**verified by listing its contents**, not by exit code.

**R4 — Each retired project carries a forward pointer.** WHEN a reader opens `pdfbay/` or
`notebay/`, THEN `RETIRED.md` tells them the date, the successor, what moved, and what did not.

**R5 — Nothing is deleted.** The source trees stay on disk, frozen. Retirement is a marker plus a
backup, never an `rm`.

**R6 — Fork hygiene is in place before product work.** WHEN sprint 02 opens, THEN `AGENTS.md`,
`references/genoffice.md` and `docs/steering/pillars.md` exist, and the rebase rule (new packages;
narrow, named edits to upstream files) is written down where an agent will read it.

## Out of scope — and this line is what stops the sprint growing

- **No product code.** No `packages/docmodel`, no tool changes, no `apps/` edits.
- **No `selfref.mjs` extension.** The heading-edit case is real and parked; it belongs with the
  sprint that builds L1.
- **No Synology/backup automation.** Separate concern, separate machine.
- **No upstream `CLAUDE.md` edits.** It is theirs; ours is `AGENTS.md`.

---

# 2 · Design

## 2.1 What moves, and what does not

The test is **"does a later sprint cite it for a number or a ruling?"** Surveys and superseded
steering fail that test and stay in the backup.

| source | → fork | why |
|---|---|---|
| `notebay/research/bays-component-map.md` | `docs/research/` | defines the L0–L3 IR and the *anchors point down, never up* rule. P2 rests on it |
| `notebay/research/docling-spikes-2026-09-09.md` | `docs/research/` | the MLX VLM measurements, the Mathpix-as-Docling-backend proof, and the finding that Docling's markdown backend produced **0 formula items from 218 `$$` blocks** |
| `notebay/research/docling-pipeline-and-fallbacks.md` | `docs/research/` | format routing and the OCR/native-text merge — the basis of P4's routing table |
| `pdfbay/research/2026-09-11-officebay-consolidation.md` | `docs/research/` | this fork's architecture assessment |
| `pdfbay/references/genoffice.md` | `references/` | upstream provenance and the mirror-withdrawal risk |
| `pdfbay/spikes/docmodel/selfref.mjs` | `spikes/docmodel/` | the runnable check that a citation survives a re-parse |
| `pdfbay/docs/design/*`, `docs/steering/*` | **stays** | written against an architecture this fork does not have (EmbedPDF, PageSlice, one-tree ProseMirror). Moving them imports rulings we have not made |
| `pdfbay/research/2026-08…`, `2026-09-01…`, `2026-09-04…` | **stays** | landscape surveys. Superseded by the consolidation note, which cites them by date |
| `notebay/docs/`, `apps/`, `packages/` | **stays** | Tauri + PocketBase + Plate scaffold for an architecture we rejected |
| `pdf-to-md-benchmark` | **stays, live** | R2 — still the scorer |

## 2.2 Link integrity is the part that silently breaks

Moved documents contain relative links written for their old home. `bays-component-map.md` points at
`../../pdfbay/docs/steering/product.md` and `~/Projects/picobay-engine/specs/…`; the consolidation
note points at `../references/genoffice.md` and `../pdf-to-md-benchmark/analysis/report.md`.

Copying is the easy half. **A link that resolved in pdfbay and silently 404s in the fork is the
failure this sprint exists to prevent**, so the check is mechanical: extract every relative link
from the moved files and test it against the new location. A link into a retired tree gets
rewritten to the archive path or demoted to prose naming the source — never left dangling.

## 2.3 Backup shape

Two projects, 644 K and 14 M, no `node_modules`. Small enough that compression and rotation are
not worth designing.

```
~/Projects/TBD/
  2026-09-11-pdfbay-retired.tar.gz          + .sha256
  2026-09-11-notebay-retired.tar.gz         + .sha256
  README.md                                 what these are, why, how to restore
```

`tar` preserves the `.git` in notebay (4 commits, uncommitted work included) and the whole tree in
pdfbay, which is not a git repo at all — so the tarball is pdfbay's **only** history.

**Verify by listing, not by exit code.** `tar tzf | wc -l` against the source file count, plus a
`shasum -c`. An archive that writes successfully and contains nothing is the failure mode being
guarded; `tar` exits 0 on an empty archive.

## 2.4 Why freeze rather than delete

`work-discipline` Rule 2 and `audited-ops` both say the same thing from different directions:
wrongness is recorded by a later node, never by mutating an earlier one. A deleted project cannot
be checked when a citation is questioned. Cost of keeping: 15 MB.

---

# 3 · Tasks

- [x] **T1 — Back up both projects to `~/Projects/TBD/`.**
      **Observed:** pdfbay 37 source files → 37 archived; notebay 372 → 372. `shasum -c` `OK` twice.
      217 KB and 10.8 MB.

- [x] **T2 — Write `~/Projects/TBD/README.md`.**
      **Observed:** the restore command run verbatim produced 37 files, and
      `selfref.mjs` executed *from the restored copy*. The archive is proven usable, not merely
      present. Scratch removed.

- [x] **T3 — Copy the six load-bearing artifacts.**
      **Observed:** all six landed; spike prints `ok`.

- [x] **T4 — Fix relative links in the moved documents.**
      **Observed:** the pass found four genuine breaks — `../references/genoffice.md` ×2 (wrong
      depth from the new location) and `../../pdf-to-md-benchmark/analysis/report.md` (points
      outside the fork). The first two were rewritten to `../../references/`; the benchmark link was
      demoted to prose naming its absolute path, per R2. Remaining hit is
      `![alt](assets/fig-6-1.png)` inside backticks in a table — an illustration of the markdown
      form, not a link.

- [x] **T5 — Write `RETIRED.md` in `pdfbay/` and `notebay/`.**
      **Observed:** both exist and name the archives T1 produced. Each states what moved, what did
      not, and why. pdfbay's records that displacement, the one-tree layout and ink capture were
      **lost**, with the condition that would reverse the decision.

- [x] **T6 — Commit the fork scaffold on a branch.**
      **Observed:** `6e77e70` on `officebay/main`. `git diff main --diff-filter=M` is **empty** —
      9 additions, 0 upstream files modified. Worktree clean.

---

# 4 · Checks

| check | expected |
|---|---|
| `tar tzf ~/Projects/TBD/2026-09-11-pdfbay-retired.tar.gz \| wc -l` | non-zero, ≈ source file count |
| `shasum -a 256 -c` on both `.sha256` | `OK` twice |
| `node spikes/docmodel/selfref.mjs` | `ok — self_ref is stable across re-parse…` |
| relative-link pass over moved docs | zero unresolved |
| `git diff main --stat` | zero upstream files touched |
| `ls pdfbay/RETIRED.md notebay/RETIRED.md` | both present |

**Stopping condition.** All six pass and the scaffold is committed to `officebay/main`. Then this
spec closes `SHIPPED` and 02 opens.

**Stop-and-ask.** Nothing here deletes, but T5 writes into two directories outside the fork. Per
`audited-ops` that is a state change on paths this sprint does not own: it is reversible
(`rm RETIRED.md`), blast radius is two new files, and no existing file is modified — so it proceeds
and is recorded rather than gated.

---

# 5 · Next action

**Closed `SHIPPED` 2026-09-11.** All six checks observed green (§4). Nothing carried forward,
nothing dropped.

**What this sprint proved, beyond its own tasks.** T4 justified the sprint: three links that
resolved in their old homes broke silently on the move, including one into a repo deliberately left
outside the fork. Copying the files would have produced a tree that looked complete and cited
nothing. The link pass is the reusable part.

**Next sprint — open `02` before writing product code.** The candidates, in the order the
consolidation note ranks them:

| candidate | why it might go first |
|---|---|
| **math grounding (G1)** | the flagship claim, and the cheapest experiment: `agent-core` already carries images end-to-end and the PDF app simply never passes them. Needs an eval corpus that is **not** Goodfellow — that is the baseline's best case and would falsely kill it |
| **L1 section index (G2)** | upstream of G3 and G5; `selfref.mjs` is already here, and its heading-edit tradeoff is the first thing that sprint must resolve |

**Parked, with a home named.** The `selfref.mjs` heading-edit case — a content-addressed
`self_ref` survives a re-parse but dies when the heading text is edited, while a body edit leaves
the ref valid and the cited quote stale. One id cannot carry both properties. It belongs to the
sprint that builds L1, not to this one.
