# officebay — Pillars

The dimensions on which the whole fork succeeds or fails. Inherited behavior counts as officebay
behavior: a sprint may add no replacement code and still advance a pillar by exposing, connecting,
protecting, or verifying what genoffice already supplies.

## P1 · Office surface and format fidelity

**What it means.** People can read, edit, mark, save, reopen, navigate, and print real documents
across the inherited applications without officebay degrading those workflows.

**Healthy when.** Representative PDF, document, spreadsheet, slide, Markdown, and HTML journeys pass
end to end; saves preserve expected content and format behavior; annotations and authored edits
survive reopen; loading, empty, error, and accessibility states remain usable.

**Current state.** **Inherited and substantial, incompletely baselined.** genoffice ships six format
applications plus a shell. PDF selection, highlights, typed notes, ink capture and persistence,
virtual margins, editing, and print exist. officebay has not yet recorded a compact regression
baseline for the inherited journeys it intends to carry across upstream rebases.

**Known gaps.** Ink subtype 15 is omitted from the agent read-back catalog. Dragged-apart placement
and shared read-only projection surfaces do not ship. Branding remains an officebay release concern.

## P2 · Agent and workflow composition

**What it means.** Existing document tools, the shared agent loop, project APIs, and
`@picobay/engine` compose into complete user workflows instead of parallel subsystems.

**Healthy when.** The agent can invoke existing capabilities through narrow registrations; long work
runs by explicit units with resume and coverage; results return through existing format write
primitives; provider errors, cancellation, cost, and partial failure remain visible.

**Current state.** **Strong parts, missing composition.** genoffice ships the agent runtime and
per-format tools. `project-store` and relevant IPC already supply project-file listing and timeline
data. `@picobay/engine` supplies mapped transformation, caching, guards, and fan-out. The engine host,
project tool registrations, and a proven end-to-end transformation journey do not yet exist.

## P3 · Document identity, anchors, and lineage

**What it means.** Source structure, authored state, and generated artifacts have identities that can
be followed across parse, edit, move, and transformation.

**Healthy when.** A structural unit has typed identity and provenance into its source; anchors point
down into source/document layers; stale, moved, removed, and rewritten states are distinguishable;
every generated artifact identifies its source units and workflow.

**Current state.** **Partial substrates, shared contract absent.** PDF page coordinates,
ProseMirror mapping, annotation dictionaries with custom keys, project/file identity, and
cross-process file-change checks already exist. There is no shared cross-format L1 contract, no
settled identity behavior under source edits, and no generated-artifact lineage.

## P4 · Grounded ingestion and retrieval

**What it means.** officebay extracts enough trustworthy structure and content from whatever arrives,
and clearly signals when it cannot.

**Healthy when.** The system uses the cheapest sufficient existing path, escalates based on measured
need, preserves source evidence for uncertain content, and never presents reconstructed mathematics
as extracted fact. Retrieval returns inspectable source anchors across the open document and project.

**Current state.** **Symbols recover; structure does not.** Existing parsers cover PDF and Office
formats for current application needs; platform OCR rescues scans; pdf.js works well on
Unicode-mapped prose and mathematics. Docling is useful as a structural schema/producer for Office
formats but measured unsuitable as the mathematics parser. Existing project storage is not yet an
agent-visible corpus tool.

**Measured 2026-09-13** on an encrypted Type1 mathematics text (Magnus & Neudecker, ch. 2, 16
pages): glyph recovery is clean — 386 mathematical glyph occurrences including 94 `⊗`, and zero
U+FFFD replacement characters. Structure recovery fails — zero line breaks, 40 word joins fused
across layout boundaries, display equations flattened into prose, matrix layout destroyed. So the
binding constraint on a grounded mathematics answer is the **absence of a structural layer**
(reading order, block typing, equation regions), not glyph loss. This narrows the earlier
expectation that legacy CM/Type1 documents silently drop operators: on this document they do not.
Evidence and reproduction: `docs/research/2026-09-13-math-extraction-probe.md`,
`tools/probe-math-extraction.mjs`.

**Open evidence need.** Whether page raster input improves answer accuracy—not merely
transcription—has not been measured on a corpus controlling for model priors. Separately, whether
`packages/pdf2docx` already reconstructs block structure via its pdfium layout analysis is unmeasured
and would change what the L1 layer must build versus inherit.

## P5 · Work-anchored creation

**What it means.** Reading state can drive editable production without turning the product into an
automatic summarizer or detached pipeline workbench.

**Healthy when.** A reader can select or mark source material, invoke an intentional transformation,
inspect coverage and provenance, edit the result, and navigate back to the supporting source. Real
use shows marks reduce context reconstruction rather than being ignored.

**Current state.** **Hypothesis with most pieces disconnected.** Marks and notes ship; write
primitives ship; mapped transformation ships externally. Exporting anchored marks as pipeline input
and returning a provenance-bearing artifact do not. This pillar remains unproven until one vertical
slice is used on real work.

## P6 · Fork sustainability and release identity

**What it means.** officebay remains economically rebaseable, legally distinct, testable, and
shippable as upstream changes.

**Healthy when.** New behavior lives in new packages/files where practical; every upstream edit is
small and named; snapshot rebases include capability and `ee/` audits; regression evidence covers
changed journeys; distributed surfaces use officebay branding; provenance and licence records are
current.

**Current state.** **Policy established, operational proof pending.** The fork is pinned and backed
up, upstream snapshot behavior is documented, and current officebay commits are additive. No
upstream rebase has yet exercised the policy, and no officebay-branded release has been produced.

**Measured churn map.** Rebase cost concentrates in two surfaces, and a sprint proposing to edit
either owes a justification that survives the next snapshot:
`apps/docs/src/renderer/editor/` (every active fork edited it heavily) and
`apps/slides/src/main/session-state.ts` + `slides-main.ts` (upstream published its intent to change
them). Evidence: `docs/research/2026-09-13-fork-landscape.md`,
`docs/research/2026-09-13-component-decomposition.md`.

## P7 · Operational independence and product identity

**What it means.** officebay runs, and can be shipped, without depending on a service owned by
upstream. The suite reaches the user under officebay's own name, keys, and update channel.

**Healthy when.** Every AI capability works against a user-supplied or self-hosted provider; no code
path silently redirects to a host we do not control; the marks, icons, package scope, and update feed
are officebay's; an automated check fails if a build can still reach the upstream service.

**Current state.** **Dependency mapped, removal not started.** The inherited app is a client of
Genspark's hosted service in four places — `packages/ai-search/src/gsk.ts` (search, image search,
slide generation, transcription), `packages/ai-search/src/genoffice-auth.ts` (OAuth device flow and
stored token), `apps/shell/src/main/cloud-projects.ts` (project list sync), and
`slides:cloud-page-generate` (server-side deck generation). Seventeen providers already exist, so
bring-your-own-key operation is inherited capability, not new work.

**Known trap.** `activeProvider()` in `packages/ai-provider/src/providers.ts` falls back to
`genspark` whenever a provider configuration is incomplete, so a half-configured custom provider
appears to work while talking to upstream's service. Cutting the dependency without fixing that
fallback converts a silent redirect into a crash; both belong in the same change.

**Precedent.** `besliky/airy` has already done this and ships it: the Genspark login, provider,
`gsk` backend, `@genspark/cli` dependency, auto-updater and analytics are removed, AI is
bring-your-own-key only, and `tools/check-no-genspark.mjs` fails the build if any genspark endpoint
or dependency returns. Verified by fetching their tree — `gsk.ts`, `genoffice-auth.ts` and
`cloud-projects.ts` are absent. Their guard is Apache-2.0 and adoptable rather than something we
design from scratch. A second fork (`ghostship25`, rebranded KARYA) reached the same place by adding
Ollama and key-less providers. P7 is the normal first move for anyone shipping this code, not an
unusual requirement. Detail: `docs/research/2026-09-13-fork-landscape.md`.

## Balance rule

A sprint must name the pillars it advances and must not silently regress another. In particular:

- P5 work cannot bypass P1's inherited editing and reading quality.
- P4 ingestion work must feed P3 identity rather than create an isolated parse cache/schema.
- P2 composition should precede replacement infrastructure.
- Every sprint touching upstream files must report its P6 rebase footprint.
- P2 and P4 work must not add a caller to the hosted-service path P7 exists to remove; new AI
  capability targets the provider abstraction in `packages/ai-provider`.
