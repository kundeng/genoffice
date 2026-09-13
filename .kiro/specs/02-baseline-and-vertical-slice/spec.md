---
spec_id: 02-baseline-and-vertical-slice
status: DRAFT
closed_as: null
since: null
until: null
epic: foundation
features: [inherited-journey-baseline, extension-inventory, vertical-slice-selection]
supersedes: []
superseded_by: null
depends_on: [01-fork-foundation]
anchors: [product, tech, pillars]
---

# 02 · Baseline the fork and select one vertical slice

# 1 · Requirements

## Introduction

Before officebay adds a document model, math path, corpus store, or generalized pipeline host, it
must prove what the inherited product already does and select one user journey that forces the
minimum additions to compose.

This sprint is analysis and executable baseline work. It may add small tests or fixtures, but it
does not implement the selected product slice. Its output is the grounded design for sprint 03.

## Requirements

**R1 — Baseline inherited journeys.** Record and run representative journeys for the inherited
capabilities officebay is most likely to touch: PDF read/mark/save/reopen, document edit/write,
agent tool invocation, project-file access, and generated-file creation.

**R2 — Inventory owners and seams.** For each candidate step in the officebay journey, identify the
existing implementation owner, process boundary, callers, tests, and whether the gap is capability,
exposure, registration, or composition.

**R3 — Select one real vertical slice.** Choose one reader-initiated workflow that starts from a real
document interaction and ends in an editable, inspectably source-linked result. The choice must be
small enough for one implementation sprint and useful without generalized infrastructure.

**R4 — Derive contracts from the slice.** Define only the document identity, anchor, engine-host,
write-back, and lineage fields required by the selected workflow.

**R5 — Measure ingestion sufficiency.** Run the selected workflow against representative source
material. Open a separate ingestion experiment only if current extraction demonstrably prevents the
workflow from producing a grounded result.

**R6 — Price the fork footprint.** Name every expected edit to an upstream-owned file and explain why
it cannot be isolated behind a new adapter/package. Prefer the candidate with the smallest coherent
rebase surface when user value is comparable.

## Out of scope

- Implementing the selected vertical slice.
- A generalized L1 schema beyond fields exercised by the slice.
- New corpus, vector, or graph storage.
- Mathpix integration or default raster attachment.
- Displacement, projection, or wholesale renderer changes.
- Branding and distribution work beyond noting affected surfaces.

# 2 · Design

## Candidate slices to compare

At minimum, compare these against the requirements rather than choosing from intuition:

1. **Highlight/note → focused transformation → new editable document with source links.**
2. **Project files → agent-visible listing → source selection for an existing operation.**
3. **Ink read-back → recognition/crop → anchored agent context.**

The first is the strongest test of officebay's combined thesis but may require more contract work.
The second is likely the cheapest useful registration slice. The third closes a conspicuous read-back
gap but may not exercise artifact lineage.

## Baseline matrix

For each journey record:

| Field                           | Evidence                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| user action and expected result | exact reproducible steps                                                                                                                                                                                                 |
| existing owner                  | file/module and process                                                                                                                                                                                                  |
| persisted state                 | source of truth and reopen behavior                                                                                                                                                                                      |
| agent/tool boundary             | current schema and registration                                                                                                                                                                                          |
| failure behavior                | visible error, silent degradation, or unsupported                                                                                                                                                                        |
| proving artifact                | existing/new test, fixture, or captured run                                                                                                                                                                              |
| upstream footprint              | files likely to require narrow edits                                                                                                                                                                                     |
| churn                           | `declared` (upstream published intent to change it), `contested` (active forks edit it heavily), or `quiet` — a rebase-cost input to R6, recorded per component in `docs/research/2026-09-13-component-decomposition.md` |

## Selection rule

Select the smallest candidate that proves a distinct officebay product claim end to end. Do not
select a cheap registration-only slice if it cannot produce or validate a meaningful user outcome;
do not select the full marks-to-artifact slice if a narrower version can prove the same contract.

## Expected output

A sprint-03 spec with:

- exact user journey and acceptance check;
- existing owners reused at every step;
- minimum typed boundary schemas;
- failure, cancellation, and persistence behavior;
- integration and journey-level verification;
- named upstream edits and rebase footprint;
- explicit decision on whether math grounding is a dependency, follow-up experiment, or unrelated.

# 3 · Tasks

- [ ] **T1 — Run and record inherited journey baselines.** Partial (2026-09-13): the suite builds
      from source on macOS/arm64 and launches, with four setup traps recorded in
      `docs/research/2026-09-13-codebase-walk.md` §1.1. No journey has been run end to end yet.
- [x] **T2 — Build the capability/exposure/registration/composition inventory.** (2026-09-13)
      `docs/research/2026-09-13-component-decomposition.md` — 7 apps, 14 packages, owners, proving
      tests, gap class per candidate step, plus a churn column. Two candidate steps reclassified:
      Slides multi-window is **exposure**, not capability; BYOK-only is **capability (removal)**.
- [ ] **T3 — Trace and compare the three candidate slices.**
- [ ] **T4 — Exercise candidates on representative real documents.** Started (2026-09-13):
      `docs/research/2026-09-13-math-extraction-probe.md` measures extraction on an encrypted Type1
      mathematics text — symbols recover cleanly, structure does not. Reproduce with
      `tools/probe-math-extraction.mjs`.
- [ ] **T5 — Select the vertical slice and derive minimum contracts.**
- [ ] **T6 — Write sprint 03 and reconcile product/tech/pillar claims against evidence.**
      Partial: P4's legacy-Type1 claim and P6's churn map corrected against measurement; P7 added.

# 4 · Checks

| Check                | Expected                                                            |
| -------------------- | ------------------------------------------------------------------- |
| inherited baseline   | each selected journey run or an exact observed failure recorded     |
| seam inventory       | owner, boundary, gap class, and proof for every slice step          |
| candidate comparison | at least the three named candidates assessed by one selection rule  |
| ingestion dependency | measured on selected workflow, not assumed from parser benchmarks   |
| fork footprint       | every expected `apps/` edit named and justified                     |
| successor            | one implementation-ready DRAFT sprint, no product code started here |

**Stopping condition.** Sprint 03 contains one bounded vertical slice grounded in executed inherited
journeys, and every proposed new component is justified by a proven capability gap rather than
missing wiring.

# 5 · Next action

Run T1 against the current pinned fork before changing product code.
