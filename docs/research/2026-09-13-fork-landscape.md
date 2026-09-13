# Fork landscape: what the three active forks built, and how

**Date:** 2026-09-13. **Status:** research, feeds `.kiro/specs/02` R6 (fork footprint) and pillar P7
(operational independence and product identity).

**Method.** Clone each fork shallow and read the source locally; branch listings and commit subjects
state intent, not outcome. Compare package and app inventories against our pinned baseline
(`d35d770`) to find real additions and removals. Verify a claimed removal by the file's absence from
the tree, and a claimed capability by the code that implements it. GitHub's `compare` ahead/behind
counts are a starting filter only — they count commits, including commits that delete the product.

## Baseline for comparison

|                                 | apps                                             | packages                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **genoffice (ours, `d35d770`)** | docs, html, markdown, pdf, sheets, shell, slides | agent-core, ai-provider, ai-search, docx-engine, electron-utils, file-parse, font-metrics, html2docx, i18n, pdf2docx, pptx-engine, pptx-render, project-store, ui |

## 1 · AtomInnoLab/WisWork — a platform rebuild, not a rebrand

**What it is.** The largest divergence by far: 8 apps, 22 packages. It keeps genoffice's six editors
and adds `apps/latex` and `apps/office-addin`, but the real work is in ten new packages totalling
~35,000 LOC — and it _drops_ `html2docx` and `pdf2docx`, so the local PDF→Word conversion genoffice
advertises is gone.

| new package                 |    LOC | what it does                                                                                                              |
| --------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------- |
| `codex-bridge`              | 15,574 | drives OpenAI's **Codex app-server** over JSON-RPC: process manager, tool router, dynamic MCP gateway, protocol recording |
| `latex-project`             |  5,542 | LaTeX project model                                                                                                       |
| `latex-compiler`            |  4,485 | LaTeX compilation                                                                                                         |
| `agent-runtime`             |  1,972 | agent execution layer above `agent-core`                                                                                  |
| `office-bridge`             |  1,929 | the Word/Excel/PowerPoint transport                                                                                       |
| `presentation-verification` |  1,823 | post-edit deck verification                                                                                               |
| `presentation-ops`          |  1,597 | deck operation model                                                                                                      |
| `auth`                      |  1,476 | **their own OIDC identity provider**                                                                                      |
| `agent-harness`             |    638 | agent test harness                                                                                                        |
| `pdf-viewer`                |    419 | extracted PDF view                                                                                                        |

**Their own identity system**, in `packages/auth/src/config.ts`:

```typescript
authorizationEndpoint:        'https://auth.wispaper.ai/oidc/auth',
authorizationResponseIssuer:  'https://auth.wispaper.ai/oidc',
callbackEndpoint:  'https://gateway.wispaper.ai/api/v1/auth/user/callback',
refreshEndpoint:   'https://gateway.wispaper.ai/api/v1/auth/user/refresh',
```

They removed Genspark's account system and built a replacement — OIDC with issuer validation, a
gateway, refresh flow. That is not rebranding; it is standing up the same class of service under
their own domain.

### The Office add-in is unreleased development work

**It does not ship.** The v0.6.77 release contains `WisWork-0.6.77-arm64.dmg`, the matching `.zip`
and `latest-mac.yml` — no manifest, no add-in bundle, nothing installable into Word.
`electron-builder.cjs` does not package it (only `office-bridge`, the socket code, is a shell
dependency), its manifest carries a `<!-- DEVELOPMENT-ONLY MANIFEST -->` marker, and reaching it
requires cloning the repo, running `npm run dev:office` on `https://localhost:3000`, and sideloading
XML by hand. The README names it once in a table of repo directories and never in Features or
Download.

So what WisWork ships is what upstream ships: one Electron office suite, rebranded, plus LaTeX
editing and the Codex bridge. Treat the directory below as an in-progress experiment visible only
because the repo is public — its write path is worth reading, its distribution strategy does not
exist yet.

### How it works, for the write path alone

`apps/office-addin` is an **Office.js add-in** — Microsoft's supported extension platform, nothing
patched or injected. Office embeds a browser; an add-in is a web page Office loads into a side panel
and grants a document API. The development manifest:

```xml
<OfficeApp xsi:type="TaskPaneApp">
  <Hosts>
    <Host Name="Document" /><Host Name="Workbook" /><Host Name="Presentation" />
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="https://localhost:3000/taskpane.html?v=0.3.42" />
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
</OfficeApp>
```

**The agent loop runs in the desktop app; the pane is a tool provider.** This is the part that
determines the whole design. `Office.context.document` exists only inside Office's embedded browser,
so the desktop process cannot reach the open `.docx`. Credentials cannot live in the sandboxed pane.
So the loop and the document are in different processes, and tool calls travel between them:

```
   WisWork PC (desktop)                     task pane (inside Word)
   ─────────────────────                    ───────────────────────
   agent-runtime + agent-core               toolHandler()
   ai-provider ──► LLM                      Office.js: getOoxml / insertOoxml
           │                                        ▲
           │  relay.tool_call                       │  office.tool_result
           │  {turn_id, call_id, generation,        │  {call_id, output, is_error}
           │   tool_name, input}                    │
           └──────────────► Relay (WSS) ◄───────────┘
                    wss://office.8-216-134-194.sslip.io/office-relay
```

Frame directions confirm the flow: the pane **receives** `relay.start`, `relay.tool_call`,
`relay.chunk`, `relay.done`; it **sends** `office.request`, `office.tool_result`, `office.cancel`.
One user prompt is one `office.request`; the agent then fires many tool calls back into the pane
before streaming the answer.

**Why a server at all:** both ends are behind NAT. Office's sandboxed browser cannot listen, and the
desktop app opens no inbound port, so two outbound WSS connections meet at a rendezvous. The Relay
matches `session_id` and forwards opaque frames. A loopback transport exists
(`VITE_WISWORK_OFFICE_TRANSPORT=loopback`, `127.0.0.1` only) but is **rollback-only and never
selected automatically**.

Every inbound tool call is validated against local state before executing — `exactKeys` rejects any
frame with extra or missing fields, a replayed `call_id` is refused, and a call from a stale
`generation` is refused.

**OOXML access is real, at two depths.** Word goes through Office.js: `body.getOoxml()` and
`body.insertOoxml(xml, 'Replace')`, parsed with DOM over the `w:` namespace. PowerPoint goes deeper —
`powerpoint-package.ts` uses JSZip plus fast-xml-parser to open the `.pptx` **zip container** and
swap parts by path (`slide`, `chart`, `master`), with the parser set `preserveOrder: true,
processEntities: false, trimValues: false` so untouched parts round-trip unchanged.

**OneNote is not supported** — the manifest declares only Word/Excel/PowerPoint, and `onenote`
appears nowhere in the repo. It also could not use this design: OneNote has no OOXML, so
`getOoxml`, package editing and OOXML fingerprinting have no counterpart there.

### The write path — the pattern worth stealing

```
1. snapshot   original = body.getOoxml();  beforeFingerprint = fingerprint(original)
2. build      target = buildDocumentWriteOoxml(original, write)   // markdown → w:p/w:tbl
3. confirm    render card; return `awaiting_user_confirmation`    // nothing written yet
4. write      body.insertOoxml(target, 'Replace'); await sync()   // ONE atomic call
5. converge   readUntilConverged(accept: fingerprint(v) !== before
                                      && verifyNativeDocumentWrite(original, v, write))
6. adjudicate read failed     → office_state_uncertain
              not verified    → restore original, prove recovery
              unprovable      → office_recovery_failed (terminal)
```

Three decisions worth borrowing. The write is **one** `insertOoxml` over the whole body, so Word
sees a single change and the user gets one undo step — which is why lists _fail closed_ rather than
use non-transactional multi-batch numbering APIs. The accept predicate needs **both** "something
changed" and "changed correctly", because either alone accepts the user's own concurrent typing or a
stale read. And `office_state_uncertain` is a distinct outcome from failure: when the write threw
_and_ the read-back failed, it reports not knowing rather than guessing.

**Licensing and posture.** Apache-2.0, `ee/` deleted entirely, no billing or quota code anywhere.
Its README is genoffice's text with the name swapped and **no attribution** — no "fork of", no
upstream link — though the repo `homepage` field still points at `genspark.ai`, unscrubbed. The
monetizable position is the Relay and `wispaper.ai` identity, neither of which Apache-2.0 obliges
them to publish.

## 2 · besliky/airy — agent tooling, and P7 already executed

**What it is.** The smallest real divergence and the most disciplined. Same 7 apps as ours, 15
packages: ours minus nothing, plus **`packages/mcp-server`** (8,481 LOC).

It exposes the document engines to coding agents over MCP — `open_document`, `read_document`,
`apply_ops`, `insert_content`, `save_document`, `close_document`, `undo`, plus a **`live_*`** family
(`live_apply_ops`, `live_get_context`, `live_status`, `live_undo`) that edits the document open in
the running desktop app.

**The live bridge is genuinely local** — no server, unlike WisWork:

```typescript
// Airy live bridge wire protocol (client side): FIFO NDJSON over a Unix domain
// socket (linux/mac) or a Windows named pipe. Lightweight twin of
// apps/shell/src/main/bridge/protocol.ts — duplicated on purpose so the MCP
// package never imports app (Electron-adjacent) sources.
export const BRIDGE_PROTOCOL_VERSION = 1
```

That comment states a boundary rule we should adopt directly: the headless package never imports
Electron-adjacent sources, and the protocol is deliberately duplicated to keep it that way.

Its error codes are a domain model worth copying — `not_docs_tab`, `no_active_document`,
`tab_closed`, `stale_document`, `nothing_to_undo` — each naming a real failure of editing a document
a human is also using.

**De-genspark, verified.** `packages/ai-search/src/` retains only `index.ts`, `media-tools.ts`,
`search-tools.ts`, `shared.ts` — `gsk.ts` and `genoffice-auth.ts` are gone, as is
`apps/shell/src/main/cloud-projects.ts`. The regression guard is `tools/check-no-genspark.mjs` (126
lines), wired as `check:no-genspark` in `package.json`. It scans `apps`, `packages`, `tools`,
`scripts` for genspark domains, the retired device-code/`api_tokens`/`office_addin_auth` endpoints,
and `@genspark/` dependencies in manifests, lockfiles and module specifiers — while **excluding
documentation**, so NOTICE and README attribution survive rather than being deleted to pass the gate.

Packages were rescoped `@genoffice/*` → `@airy-office/*`. The README has a "What is different from
upstream" section naming GenOffice and linking it — the only fork of the three that attributes
correctly.

## 3 · 360org/vuaoffice — a release channel, not a source fork

**What its GitHub repository actually contains: 48 files and no source code.** No `apps/`, no
`packages/` — 18 webp images, 5 workflow files, 4 markdown documents, a LICENSE and a NOTICE. The
most recent commit, `2994fb9 chore: sync public release and filter private files`, deletes the
entire codebase.

Its `.githubignore` strips only secrets (`.env`, `credentials/`, `*.pem`, backups, logs), so the
missing source is a separate, deliberate decision: development happens on private GitLab and GitHub
carries branding, documentation and the release pipeline.

**So its "+201 ahead" counts commits that remove the product.** Ahead/behind numbers cannot
distinguish that from 201 commits of features, which is the reason this pass reads trees rather than
counts.

What can still be read: the README (Vietnamese, correctly attributing GenOffice under Apache-2.0)
describes seven apps — the six inherited plus **VuaOffice Mail**, an AI email/calendar client
explicitly positioned as replacing Outlook — plus an ERP ("VuaHeThong Pro"), a 360 CORP account
system, and their own AI Router. Whether that code is good is unknowable from here.

## What we take

| from        | take                                                               | why                                                                                                                                  |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **airy**    | `tools/check-no-genspark.mjs`, adapted                             | Apache-2.0, 126 lines, CI-wired, and its scan/exclude split (code yes, attribution docs no) is the detail a first attempt gets wrong |
| **airy**    | the de-genspark removal set                                        | three files verified absent from a shipping fork — the removal is survivable                                                         |
| **airy**    | protocol duplicated rather than imported across the Electron line  | `tech.md` §7 already requires `packages/*` to stay Electron-free; airy pays for it by duplicating the bridge protocol module         |
| **airy**    | the live-bridge error vocabulary                                   | `stale_document`, `not_docs_tab`, `no_active_document` name failures officebay's write-back path will hit                            |
| **WisWork** | the confirm → atomic write → fingerprint-verify → restore sequence | the template for mutating a document a human is editing, including `office_state_uncertain` as a distinct outcome from failure       |
| **WisWork** | fail-closed over partial application                               | lists refuse rather than use non-transactional APIs                                                                                  |
| **WisWork** | a new capability as a new `apps/` directory                        | two added apps work through the shell's `TabManager` seam                                                                            |

## What we avoid

- **WisWork's scale.** 35,000 LOC of new packages, a second identity provider, a relay service, and
  a Codex bridge is a platform rebuild with a permanent rebase cost (129 behind).
- **WisWork's attribution posture.** Apache-2.0 §4 requires retaining notices; shipping upstream's
  README as your own with no credit is not a model to copy. officebay attributes.
- **Dropping `pdf2docx` / `html2docx`** as WisWork did — those are capabilities our P4 depends on.
- **vuaoffice's split-repo topology.** A public mirror with the source filtered out means the
  release pipeline must never fail open, and nothing is externally reviewable.

## What this says about rebranding

All three rebrand, because Apache-2.0 gives the code and withholds the marks (§6) — renaming is the
entry fee for shipping, not a strategy. The strategy is what each one does _after_:

- **WisWork** rebuilt the hosted layer under its own domains (`wispaper.ai` identity, their Relay)
  and added LaTeX plus a Codex bridge. Maximum ambition, maximum carrying cost. Its Office add-in is
  unreleased, so no Microsoft-channel strategy is in evidence — only an experiment in the tree.
- **airy** removed the hosted layer entirely and made the engines callable by coding agents. Minimum
  surface, cleanest rebase position, and the only one that documents its lineage honestly.
- **vuaoffice** kept the product private and used GitHub purely as a distribution channel.

officebay's P7 sits closest to airy: cut the hosted dependency, keep the engines, add a layer
upstream does not have. Their egress guard, package rescoping and attribution section are directly
reusable, and their MCP server overlaps officebay's agent-facing ambitions enough to merit a
dedicated decision — adopt, or build alongside.

## Limits

Read: package/app inventories, the Office add-in transport and write path, airy's MCP server surface
and bridge protocol, WisWork's auth config, and both forks' de-genspark state. **Not read:** the
quality of WisWork's LaTeX packages, `codex-bridge`'s internals beyond its shape, airy's MCP tool
implementations, and any of vuaoffice's code (unavailable). 885 forks exist; three carry real work
and were examined here.
