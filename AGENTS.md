# officebay — agent instructions

specs_root: .kiro/specs/

**This is a fork of `genspark-ai/genoffice` (Apache-2.0), not a new application.** Provenance,
pinned commit and the backup that protects against upstream withdrawal:
[`references/genoffice.md`](references/genoffice.md).

Upstream's own `CLAUDE.md` is theirs — theming rules, build gotchas, i18n sharding — and still
applies. **Do not edit it.** Project-level instruction belongs in this file, which upstream does
not have, so it never conflicts on a rebase.

## What officebay is

genoffice reads, edits and marks documents well. It has no derived-artifact layer: no document
model finer than a page, no provenance on generated files, no map over a document, no corpus.
officebay adds that layer, and consolidates three retired efforts into one product.

| layer | supplied by |
|---|---|
| read / edit / mark surface | this fork |
| transformation and artifact generation | `@picobay/engine` (Workflow IR over LangGraph.js) |
| ingestion | routing table — Mathpix or a frontier VLM for math PDFs, Docling for Office formats, pdf.js text for prose, platform OCR for scans |

The architecture assessment, the measured evidence, and what is genuinely left to build are in
`docs/research/2026-09-11-officebay-consolidation.md`.

## Fork discipline — this shapes how code is written

**Upstream `main` is a mirror, not the development tree.** Per its `CONTRIBUTING.md`, development
happens in a private repository and `main` advances through squashed `Sync snapshot (<date>)`
commits. So we **rebase onto snapshots**, never merge PR-by-PR.

That makes one rule load-bearing:

> **Keep our work in new packages and new files. Touch existing upstream files only in narrow,
> named edits.** A sprawling diff across `apps/pdf/src/renderer/App.tsx` (8,652 lines) makes every
> future snapshot painful; a new `packages/docmodel` costs nothing to carry forward.

**Check `ee/` on every rebase.** It is reserved for enterprise modules under a separate licence and
is empty of code at `d35d770`. If capabilities we depend on start landing there, the effective
licence of what we need has changed.

**Branding.** Apache-2.0 §6 does not license the GenOffice or Genspark marks. Anything we ship
carries its own name.

## Skills to load

- **`work-discipline`** — operating rules and engineering standards. Every task.
- **`spec-driven-dev`** — the sprint loop. `SPECS_ROOT` is `.kiro/specs/`.
- **`audited-ops`** — any ops, migration, or destructive work. Artifacts live in the investigation
  directory, never a temp path; irreversible actions stop and ask first.
- **`agentic-system-dev`** — when designing the agent/tool surface.

## Where truth lives

| path | holds |
|---|---|
| `docs/steering/pillars.md` | the dimensions this product succeeds or fails on |
| `docs/research/` | the evidence base, carried from the retired projects |
| `references/` | third-party provenance: upstream, version, date, licence |
| `.kiro/specs/` | sprints. Work the **ACTIVE** one; if none, the lowest-numbered DRAFT |

## Verified facts worth not re-deriving

- **All `packages/*` are Electron-free.** No package declares an `electron` dependency, so an
  online tier reuses the engine layer unchanged and replaces `apps/*/src/main` plus the shell.
  Electron is the desktop host, not the architecture.
- **Kuzu and LadybugDB are not storage-compatible.** A file written by one is unreadable by the
  other; the 4-byte header (`LBUG` / `KUZU`) decides, which is why the viewer carries two engines.
  Fork lineage buys source compatibility, not format compatibility.
- **Docling scores 0/70 on math assertions** — it emits `formula-not-decoded`. Use its *schema*
  (`DoclingDocument`) as the L1 contract; never as the math parser.
- **genoffice's PDF read path has no math handling at all.** Answers about equations on a
  legacy-encoded PDF are reconstructed from model priors, not extracted. On a modern Unicode-mapped
  PDF they are grounded. Nothing tells the reader which case they are in.
