---
spec_id: 01-fork-foundation
status: CLOSED
closed_as: SHIPPED
since: 2026-09-11
until: 2026-09-11
epic: foundation
features: [evidence-consolidation, fork-provenance, steering-reset]
supersedes: []
superseded_by: null
depends_on: []
anchors: [product, tech, pillars]
---

# 01 · Establish officebay as a fork-and-improve product

# 1 · Requirements

## Introduction

officebay begins from genoffice's shipped applications and extends them. Earlier planning correctly
preserved the retired pdfbay/notebay evidence but then described the new product largely as a list of
systems yet to build. That framing risks replacing capabilities whose implementation, IPC, or tool
seams already exist.

This foundation sprint establishes durable provenance, preserves the useful archived evidence, and
rewrites steering around the whole fork. It writes no product code.

## Requirements

**R1 — Preserve provenance and evidence.** The fork records its upstream commit, licence, publication
model, and backup. Load-bearing pdfbay/notebay research remains available in the repo or verified
archive.

**R2 — Define product identity.** Product policy states that officebay is genoffice plus a narrowly
integrated document/artifact layer, not a greenfield office implementation.

**R3 — Account for inherited product health.** Pillars cover the complete shipped fork, including
format fidelity, agent composition, rebase sustainability, and release identity—not only new
packages.

**R4 — Classify gaps before building.** Technical policy distinguishes missing capability, exposure,
registration, and composition, and separates inherited contracts from planned components and
experiments.

**R5 — Retire premature sequencing.** Math grounding remains an evidence need, but no implementation
sprint starts until an inherited baseline and one end-to-end extension slice are selected.

## Out of scope

- Product code or changes under `apps/` and `packages/`.
- Selecting the first vertical slice.
- Activating a math, document-model, or artifact implementation sprint.
- Importing archived implementation choices such as EmbedPDF, Mastra, SurrealDB, or a PageSlice
  ProseMirror shell as officebay policy.

# 2 · Design

## Mental Model & Invariants

```
officebay = inherited genoffice product
          + narrow exposure and composition
          + genuinely missing document/artifact capabilities
```

- Inherited behavior is officebay behavior and must be protected.
- Missing agent access does not prove missing product capability.
- Archived projects supply requirements and evidence, not binding implementation architecture.
- `@picobay/engine` remains the transformation owner.
- Upstream edits stay narrow because snapshot rebases are part of the product cost.

## Deliverables

1. Upstream provenance and verified retirement archives.
2. `docs/steering/product.md` separating inherited baseline, settled policy, and hypotheses.
3. `docs/steering/pillars.md` describing health of the complete fork.
4. `docs/steering/tech.md` separating inherited contracts, extension seams, new boundaries, and
   experiments.
5. A successor DRAFT focused on baseline evidence and selecting one vertical slice.

# 3 · Tasks

- [x] Preserve upstream provenance and archive pdfbay/notebay with verified checksums.
- [x] Carry load-bearing research and the self-reference spike into the fork.
- [x] Correct the capability audit where absent wiring had been read as absent implementation.
- [x] Rewrite product policy around fork-and-improve ownership.
- [x] Rewrite pillars around whole-product health.
- [x] Rewrite technical policy around inherited contracts and narrow extension seams.
- [x] Replace the premature math implementation sprint with a fork-baseline successor.

# 4 · Checks

- [x] `references/genoffice.md` identifies the pinned upstream and backup.
- [x] `~/Projects/TBD/README.md` records verified archives and restoration.
- [x] Product policy explicitly classifies capability/exposure/registration/composition gaps.
- [x] Pillars include inherited format behavior and fork sustainability.
- [x] Technical policy labels math grounding and displacement as experiments rather than shipped
      architecture.
- [x] No product source files changed in this sprint.

# 5 · Close

Closed `SHIPPED` on 2026-09-11. The original retirement work and the steering correction form one
foundation unit: evidence is preserved, and the next sprint now starts from the actual fork rather
than an imagined blank implementation.
