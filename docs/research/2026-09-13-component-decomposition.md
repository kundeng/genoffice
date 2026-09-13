# Component decomposition: owners, seams, and where the ground moves

**Date:** 2026-09-13. **Status:** research, executes `.kiro/specs/02` T2 (capability / exposure /
registration / composition inventory). **Companion:** `2026-09-13-codebase-walk.md` explains the
architecture; this one inventories it.

Two readers, deliberately:

- **the operator**, deciding where officebay's work goes and what it will cost to carry;
- **the agent**, needing to know before an edit who owns a surface, what proves it, and whether
  upstream is about to move it.

Dependents and test coverage come from the CodeGraph index (2,244 files, 29,349 symbols, 147,983
edges), not from grep.

## The churn column, and why it exists

Standard inventories record owner, boundary and tests. This one adds **churn** — evidence that a
surface is about to move underneath us — because we rebase onto squashed upstream snapshots and a
moving surface costs us on every one.

| churn         | meaning                                                                      |
| ------------- | ---------------------------------------------------------------------------- |
| **declared**  | upstream has published intent to change it (a design note, a "phase 2" list) |
| **contested** | other active forks have edited it heavily, so it is a known conflict magnet  |
| **quiet**     | no evidence of upcoming movement                                             |

## Apps

| app          | LOC     | owns                                               | churn         | notes                                                                                                                                                                            |
| ------------ | ------- | -------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **sheets**   | 171,897 | .xlsx editing, Univer canvas, Rust recalc sidecar  | quiet         | largest app; only one with a native binary. Longest build.                                                                                                                       |
| **docs**     | 130,841 | .docx editing, Tiptap/ProseMirror                  | **contested** | `src/renderer/editor/` is the single highest-churn directory in the repo — all three active forks edited it heavily (see fork landscape). Edits here pay twice.                  |
| **slides**   | 102,729 | .pptx editing, Konva canvas, op executor           | **declared**  | upstream published `docs/slides-op-journal.md` naming `session-state.ts` and `slides-main.ts` as the attachment points for a future sync transport. See §"The op journal" below. |
| **pdf**      | 48,052  | pdf.js render, pdfium edit, annotations            | quiet         | `src/renderer/App.tsx` is 8,652 lines. officebay's reading surface lands near here.                                                                                              |
| **html**     | 21,285  | .html editing                                      | quiet         |                                                                                                                                                                                  |
| **shell**    | 20,611  | the window, `TabManager`, Home, lifecycle, updater | quiet         | the seam every new app registers through                                                                                                                                         |
| **markdown** | 17,221  | .md editing, mermaid                               | quiet         |                                                                                                                                                                                  |

## Packages

| package            | LOC    | owns                                          | churn        | proving tests                                    |
| ------------------ | ------ | --------------------------------------------- | ------------ | ------------------------------------------------ |
| **docx-engine**    | 45,051 | .docx read/write, byte preservation           | quiet        | golden files, 5 languages                        |
| **pptx-engine**    | 37,648 | .pptx read/write, `OpenedPptx`                | quiet        | fixture suite                                    |
| **pdf2docx**       | 31,800 | on-device PDF→Word, OCR helpers               | quiet        | golden files (en/ja/zh/ko/ar)                    |
| **pptx-render**    | 14,267 | slide render geometry                         | quiet        |                                                  |
| **ai-provider**    | 8,443  | 17 providers, `AiSettings`, protocol adapters | **declared** | `providers.test.ts`, `registry.test.ts`          |
| **html2docx**      | 5,322  | HTML→Word                                     | quiet        | `features.test.ts`                               |
| **ui**             | 3,317  | shared components, `tokens.css`               | quiet        | theme CI check                                   |
| **agent-core**     | 2,990  | `AgentLoop`, tool contracts                   | quiet        |                                                  |
| **electron-utils** | 2,673  | navigation guard, remote image                | quiet        |                                                  |
| **ai-search**      | 2,552  | **Genspark-hosted** search/generation/auth    | **declared** | `genoffice-auth.test.ts`                         |
| **project-store**  | 1,913  | project/file/chat state                       | quiet        | officebay's cross-document increment routes here |
| **font-metrics**   | 1,022  | advance caches                                | quiet        | `font-metrics` tests                             |
| **file-parse**     | 983    | flat text extraction                          | quiet        |                                                  |
| **i18n**           | 405    | 19-locale sharding                            | quiet        | `satisfies` type gate                            |

## Gap classification for officebay's candidate work

Per `tech.md` §1, classified before any implementation. "Missing agent access is not evidence of a
missing product capability" — two rows below are exactly that trap.

| candidate step                                    | existing owner                               | gap class                | evidence                                                                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slides multi-window / shared session              | `apps/slides/src/main/session-state.ts`      | **exposure**             | the capability is built and running (`scheduleDeckBroadcast` pushes to every attached webContents); the shell has no second window or split view to reach it. Not a capability gap. |
| Structural L1 for math PDFs                       | none                                         | **capability**           | measured: symbols extract cleanly, structure does not. See `2026-09-13-math-extraction-probe.md`.                                                                                   |
| Cross-document / project file access to the agent | `packages/project-store` + shell IPC         | **registration**         | APIs exist; a typed permission-aware tool registration is what is missing.                                                                                                          |
| Long transformation hosting                       | `@picobay/engine`                            | **composition**          | engine exists externally; the missing piece is a host adapter with typed source units and progress/cancellation.                                                                    |
| BYOK-only operation                               | `packages/ai-provider`, `packages/ai-search` | **capability (removal)** | 17 providers already exist; the work is cutting the hosted dependency and fixing the silent fallback. See below.                                                                    |

## Two surfaces that need care before anyone edits them

### The op journal (`apps/slides`)

Upstream shipped `docs/slides-op-journal.md` — an accurate design note, verified against source:
`OpLogEntry` at [session-state.ts:86](../../apps/slides/src/main/session-state.ts#L86), the
200-entry ring, the `journaledTxn` funnel at
[slides-main.ts:1120](../../apps/slides/src/main/slides-main.ts#L1120) with 23 call sites, and a
`reset` marker on snapshot restore.

Its "phase 2" list — ordering authority on a server, content-addressed assets, inverse ops — is a
published statement that `session-state.ts` and `slides-main.ts` **will change**. CodeGraph puts
`runTxn` ([ops/executor.ts:159](../../apps/slides/src/main/ops/executor.ts#L159)) at 9 callers
across 6 test files.

**Rule for officebay:** read from `journaledTxn`, do not modify how it produces. A consumer that
subscribes to applied ops is cheap and rebase-tolerant; anything that changes the production path
conflicts on every snapshot.

One documented gap: the note claims every non-dry `runTxn` goes through `journaledTxn`. The single
exception is transform _preview_ frames at
[slides-main.ts:1381](../../apps/slides/src/main/slides-main.ts#L1381), deliberately unjournaled so
preview gestures do not flood the ring.

### The hosted dependency (`packages/ai-search`, `packages/ai-provider`)

The shipped OSS app is a **client of Genspark's hosted service** in four places: `gsk.ts`
(`genspark.ai/api/tool_cli` for search, image search, slide generation, transcription),
`genoffice-auth.ts` (OAuth device flow, token on disk), `cloud-projects.ts` (project list sync),
and `slides:cloud-page-generate` (server-side deck generation). The README states it plainly:
"Sign in with Genspark and skip keys."

**The trap:** `activeProvider()` at
[providers.ts:274](../../packages/ai-provider/src/providers.ts#L274) falls back to `'genspark'`
whenever a provider config is incomplete — missing model, base URL or key. A half-configured
custom provider appears to work while talking to a different service. Any de-genspark work must fix
this fallback in the same change, and prove it with an egress test.

## For the agent working here

1. **Enter at a symbol, not a file.** `slides-main.ts` is 179 KB; `apps/pdf/.../App.tsx` is 8,652
   lines. Use `codegraph_explore` — it returns source plus callers plus the tests covering them.
2. **Check the churn column before proposing an edit.** A change in `apps/docs/src/renderer/editor/`
   or `apps/slides/src/main/` needs a justification that survives the next rebase.
3. **Prefer a new `apps/` directory or a new package.** WisWork demonstrated that a new app slots
   into `TabManager` cleanly; that is the cheap path, and `AGENTS.md` already requires it.
4. **Run the proving test named in the table**, not a new one, when touching a format engine. The
   golden files encode byte-preservation guarantees the product advertises.

## Not covered

- Runtime dependency shape between packages (the index has the edges; this pass reports owners).
- `apps/sheets` native sidecar internals (Rust, separate toolchain).
- e2e suite coverage mapping — 35 Playwright specs exist; which journeys they actually prove is
  unmeasured, and is spec 02 T1's job.
