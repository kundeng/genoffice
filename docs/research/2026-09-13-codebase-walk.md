# genoffice: a code walk for a new developer

**Date:** 2026-09-13. **Status:** onboarding reference. **Audience:** a developer who knows
programming and basic TypeScript, has never opened this codebase, and needs to reach the point of
making a change and seeing it run.

Everything below was executed on this machine (macOS, Apple Silicon, Node 24.12) on 2026-09-13.
Commands that failed are recorded with the failure, because four of them fail in ways that look
like something else.

## 1 · Get it running first

```bash
npm install                 # ~1.0 GB into node_modules
npm run fixtures            # generates .docx test fixtures (one-time)
npm run build:all           # builds all 7 apps + the Rust sidecar
env -u ELECTRON_RUN_AS_NODE npx electron apps/shell
```

That last line is not the documented one. `CONTRIBUTING.md` says `npm run shell`. Both work, but
the `env -u` prefix matters — see §1.2.

For iterating on renderer code, `npm run dev` runs six Vite dev servers (ports 5173–5178) with the
shell pointed at them, so renderer edits hot-reload. Main-process edits never hot-reload.

### 1.1 Four traps, all encountered on a clean setup

**`install-electron` fails silently.** The `postinstall` step downloads the Electron binary
separately from the npm packages. It aborted mid-extract, and npm still reported success. The
symptom appears much later as a launch failure. Check and fix:

```bash
ls node_modules/electron/dist/Electron.app/Contents/MacOS/Electron   # must exist
npx install-electron                                                # re-run if missing
```

**`cargo --version` can lie.** CONTRIBUTING says the prerequisite is "a Rust toolchain (`cargo` on
PATH)". On this machine `cargo --version` answered `1.96.0` and `rustc --version` answered `1.96.0`,
while `rustup toolchain list` said **"no installed toolchains"** — those were rustup shims with
nothing behind them. The build then dies deep inside `serde_derive` with missing
`libcore-*.rlib`, which reads like a corrupt dependency rather than a missing toolchain. The real
check and fix:

```bash
rustup toolchain list       # "no installed toolchains" = broken, regardless of cargo --version
rustup default stable
```

**`ELECTRON_RUN_AS_NODE=1` in the environment breaks the app.** This variable makes the Electron
binary behave as plain Node, so every Electron API is undefined. The app crashes at startup with:

```
TypeError: Cannot read properties of undefined (reading 'on')
    at .../apps/shell/out/main/index.js:89829
```

That line is `ipcMain.on(...)`, and `ipcMain` is undefined because there is no Electron runtime.
Nothing in the message says so. Launch with `env -u ELECTRON_RUN_AS_NODE`, or unset it in your
shell profile.

**There is no root `out/`.** Each app writes its own `apps/<name>/out`. A `ls out/` at the repo
root returns nothing and looks like the build failed. After a successful `build:all`:

| app      | built size |
| -------- | ---------- |
| sheets   | 38 MB      |
| docs     | 26 MB      |
| slides   | 18 MB      |
| shell    | 17 MB      |
| markdown | 11 MB      |
| pdf      | 9.8 MB     |
| html     | 8.2 MB     |

### 1.2 What a successful run looks like

One window titled "GenOffice", three renderer helper processes, a Home screen offering six editors
(Docs, Sheets, Slides, Markdown, HTML, PDF) plus "Open Local File", and "Sign in" at the bottom
left. If the window is blank, the preload is stale — rebuild.

## 2 · The shape of the thing

671,000 lines of TypeScript/TSX across **7 apps** and **14 packages**, npm workspaces.

```
apps/
  shell/      the window, the tab strip, the Home screen, app lifecycle
  docs/       .docx editor      (Tiptap/ProseMirror)
  sheets/     .xlsx editor      (Univer + a Rust recalc sidecar)
  slides/     .pptx editor      (Konva canvas)
  pdf/        PDF viewer/editor (pdf.js + pdfium WASM)
  markdown/   .md editor
  html/       .html editor
packages/
  docx-engine, pptx-engine, pptx-render, pdf2docx, html2docx   format engines
  agent-core, ai-provider, ai-search                           the AI layer
  project-store, file-parse, font-metrics, electron-utils, ui, i18n
```

**There is exactly one window.** The shell owns a single `BrowserWindow`; every open document is a
`WebContentsView` child of it, and only the active one is visible. Home has no view of its own —
hiding every other tab reveals the shell window's own content. This lives in
[tab-manager.ts:69](../../apps/shell/src/main/tab-manager.ts#L69).

The consequence worth internalizing: the editors are not separate applications at runtime. They
are sibling views inside one process tree, and `TabManager` imports directly from each app's main
module ([tab-manager.ts:1-46](../../apps/shell/src/main/tab-manager.ts#L1-L46)). Adding an editor
means adding a `createXView` / `requestXClose` pair and a `TabKind`.

## 3 · Three processes — the concept that decides where your code goes

Electron splits every app into three JavaScript contexts. Almost every "where do I put this?"
question in this repo resolves to which of the three you need.

| context      | runs                          | can it touch the filesystem?             | in this repo           |
| ------------ | ----------------------------- | ---------------------------------------- | ---------------------- |
| **main**     | Node.js, one per app          | yes — full Node                          | `apps/*/src/main/`     |
| **preload**  | a bridge script, one per view | no, but it can _expose_ main's abilities | `apps/*/src/preload/`  |
| **renderer** | Chromium, React, sandboxed    | **no**                                   | `apps/*/src/renderer/` |

The renderer is sandboxed (`contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true` — see [index.ts:2339-2344](../../apps/shell/src/main/index.ts#L2339-L2344)). It
cannot open a file. When the Slides renderer needs the deck, it asks main over IPC.

The flow, concretely:

1. **Renderer** calls a method on `window.desktop` (or a similar injected object).
2. **Preload** defined that method with `contextBridge.exposeInMainWorld`, and its body is
   `ipcRenderer.invoke('slides:open-path', path)`.
3. **Main** registered a handler: `ipcMain.handle('slides:open-path', async (e, path) => {...})`.
   It reads the file, parses it, returns a plain object.
4. The object is structured-cloned back across the boundary.

**Anything crossing that boundary must be serializable.** No class instances, no functions, no
`Map` with live references. This is the most common newcomer bug.

### 3.1 The typed contract in `src/shared/`

Each app has a `src/shared/ipc.ts` — the type definitions _both sides_ import. This is how the
three contexts stay in agreement despite being separate bundles. From
[tabs-api.ts](../../apps/shell/src/shared/tabs-api.ts):

```typescript
export type TabKind = 'home' | 'docs' | 'sheets' | 'slides' | 'pdf' | 'markdown' | 'html'

export interface TabsApi {
  list(): Promise<TabSummary[]>
  activate(id: string): Promise<void>
  close(id: string): Promise<void>
  onChanged(handler: (tabs: TabSummary[]) => void): () => void
}

export const TABS_CHANNELS = {
  list: 'tabs:list',
  activate: 'tabs:activate',
  // ...
} as const
```

Three TypeScript idioms in that snippet, since they recur constantly here:

- **String-literal union** (`TabKind`). Not an enum — a closed set of allowed strings. The compiler
  rejects `'word'`, and a `switch` over it can be checked for exhaustiveness.
- **`interface` as a cross-process contract.** `TabsApi` has no implementation in that file. The
  preload implements it; the renderer consumes it; both type-check against the same declaration.
- **`as const`** freezes the channel-name object so the keys are literal types rather than
  `string`, which keeps a typo from compiling.

You will also meet `satisfies Record<keyof typeof zh, string>` in the i18n shards — it checks that
a translation file has exactly the keys the Chinese one defines, turning a missing string into a
compile error. And `import type { … }` appears everywhere: it imports only the type and vanishes at
runtime, which matters because importing a main-process module into renderer code would otherwise
drag Node into a sandboxed bundle.

## 4 · One trace, end to end

Opening a `.pptx` from Finder, because it crosses every boundary above.

1. **macOS** sends `open-file` to the app. If Electron is not ready yet, the path is stashed in
   `pendingLaunchPath` — the event fires before `ready`
   ([index.ts:4204](../../apps/shell/src/main/index.ts#L4204)).
2. **Shell main** calls `revealShellWindow()`, then `openDocumentPath(filePath)`.
3. **`TabManager`** creates a `WebContentsView` for the Slides renderer and makes it the active tab.
4. **Slides renderer** mounts and calls `slides:consume-pending-open` over IPC.
5. **Slides main** parses the `.pptx` (via `@genoffice/pptx-engine`), builds a `Session` holding the
   parsed deck, and returns render-ready slide data — not the file, not the parser objects.
6. **Renderer** draws it on a Konva canvas.

The document's source of truth stays in the main process, in that `Session`. The renderer holds a
derived view. Every edit is an IPC round-trip that mutates the main-process deck and pushes fresh
render state back.

## 5 · Where does my change go?

| you want to                      | put it in                                         | note                            |
| -------------------------------- | ------------------------------------------------- | ------------------------------- |
| change what a button looks like  | `apps/*/src/renderer/`                            | hot-reloads under `npm run dev` |
| add a new IPC call               | all three: `shared/ipc.ts`, `preload/`, `main/`   | types first                     |
| change file parsing/writing      | `packages/*-engine/`                              | has real unit tests; run them   |
| change AI tool behavior          | `apps/*/src/renderer/ai/` + `packages/agent-core` |                                 |
| add a menu item, window behavior | `apps/shell/src/main/`                            | rebuild the shell               |

### 5.1 Build gotchas that cost real time

From the repo's own `CLAUDE.md`, confirmed while building:

- **App main-process code compiles into the _shell_ build.** Editing `apps/slides/src/main/*` and
  rebuilding only Slides does nothing. Rebuild the shell.
- **A stale preload leaves the renderer blank** in dev mode. Rebuild.
- **A workspace package in an app's `dependencies` must also be in the `externalizeDepsPlugin`
  `exclude` list**, or the packaged app crashes at launch while dev mode works fine.

### 5.2 Checks before you push

```bash
npm run typecheck     # tsc --noEmit across every workspace
npm run lint          # 0 errors required
npm test              # unit tests incl. the Rust sidecar
npm run format:check
```

## 6 · How to answer your own questions about this code

The repo is indexed with CodeGraph (`.codegraph/`, gitignored, 2,244 files / 29,349 symbols /
147,983 edges). One query returns the source of the relevant symbols _plus_ their callers and
tests, which beats a grep-and-read loop:

```
codegraph_explore("journaledTxn runTxn journalOps", projectPath="/Users/kundeng/Projects/genoffice")
```

It answers "what calls this and what breaks if I change it" directly — the blast-radius section
names the callers and the test files covering them. Use it before editing any shared symbol.

Re-index after a rebase: `codegraph init`.

## 7 · The AI layer, and how to point it somewhere other than Genspark

Provider settings live in `<userData>/ai-settings.json`. The dev build uses a **separate** userData
directory from the installed app (`GenOffice Dev` vs `GenOffice`), so a dev configuration cannot
disturb an installed copy — the split comes from `GENOFFICE_USER_DATA` in
[index.ts](../../apps/shell/src/main/index.ts).

Seventeen providers are defined in
[providers.ts:28](../../packages/ai-provider/src/providers.ts#L28). The `custom` one takes any
OpenAI-compatible endpoint:

```json
{
  "provider": "custom",
  "providers": {
    "custom": { "apiKey": "…", "model": "…", "baseUrl": "http://host:port/v1" }
  },
  "gskToolsEnabled": false
}
```

**One behavior to know about:** `activeProvider()` at
[providers.ts:274](../../packages/ai-provider/src/providers.ts#L274) returns `'genspark'` whenever
the selected provider's config is incomplete — a missing model, a missing base URL, a missing key
all silently route back to Genspark rather than failing. A half-configured custom provider looks
like it is working while talking to a different service.

## 8 · What is genuinely hard here

Honest notes for someone deciding where to spend their first week:

- **`slides-main.ts` is 179,105 bytes** and `apps/pdf/src/renderer/App.tsx` is 8,652 lines. These
  are not files to read top to bottom; use CodeGraph to enter at a symbol.
- **Sheets is the largest app** (171k LOC) and the only one with a native sidecar, so it has the
  longest build and the most moving parts.
- **The format engines are where correctness lives.** `docx-engine` (45k LOC), `pptx-engine`
  (37.6k), `pdf2docx` (31.8k) carry the byte-preservation guarantees the product advertises. They
  have golden-file tests in five languages; respect them.
