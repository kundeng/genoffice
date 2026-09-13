# Fork landscape: what the serious forks are actually doing

**Date:** 2026-09-13. **Status:** research, feeds `.kiro/specs/02` R6 (fork footprint) and pillar P7
(operational independence and product identity).

**Method.** Enumerate a fork's branches before comparing — work often sits outside `main`, and a
`compare/main...<fork>:main` alone reports such a fork as empty. Compare each branch via
`gh api repos/genspark-ai/genoffice/compare/main...<fork>:<branch>`, then read the fork's README and
fetch the files a claim depends on. Commit subjects state intent, not outcome; a removal is
confirmed by the file being absent from the tree.

## The shape of the population

889 forks by GitHub's count, 885 enumerable. The overwhelming majority carry zero commits. Of the
sampled set, four carry real work, and **every one of them rebrands**. That is the population's
defining behavior, and the reason is structural: genoffice is Apache-2.0, so the code is free to
take, while Apache-2.0 §6 does not license the marks — a redistributor _must_ rename to ship. Every
serious fork is therefore a whitelabel by necessity, and the interesting question is what each one
builds on top of that.

## The three that matter

### 1 · AtomInnoLab/WisWork — +755 / −129 — channel play into Microsoft Office

**Thesis:** ship the suite under its own brand, then reach into the Microsoft install base.

Its README is genoffice's text with the name swapped, and it contains **no attribution to genoffice
or Genspark anywhere** — no "fork of", no upstream link. Signed macOS and Windows installers, a
YouTube demo, v0.6.101, releases through "the AtomInnoLab release pipeline".

What it added, by files changed: `apps/docs` (118), **`apps/latex` (83)**, **`apps/office-addin`
(60)**, `apps/markdown` (27).

`apps/office-addin` is the significant one: `@wiswork/office-addin`, a _"confirmation-first WisWork
Agent task pane for Word, Excel, and PowerPoint"_. It is not a competitor to Word; it puts their
agent inside Word, with the open-source suite as the engine supply.

#### How it reaches into Office

Nothing is patched or injected. It is an **Office.js add-in** — Microsoft's supported extension
platform. Office embeds a browser, and an add-in is a web page Office loads into a side panel and
hands a document API to. The entry point is a manifest the user sideloads:

```xml
<!-- apps/office-addin/public/manifest.xml -->
<OfficeApp xsi:type="TaskPaneApp">
  <Hosts>
    <Host Name="Document" />      <!-- Word -->
    <Host Name="Workbook" />      <!-- Excel -->
    <Host Name="Presentation" />  <!-- PowerPoint -->
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="https://localhost:3000/taskpane.html?v=0.3.42" />
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
</OfficeApp>
```

Word reads it, loads the page beside the document, and grants `ReadWriteDocument`. From there the
pane calls `Office.context.document` like any web app.

The work is split across two processes because the pane runs in Office's sandbox and cannot safely
hold a long-lived credential:

```
┌─ Microsoft Word (real Word, the user's machine) ─────────┐
│                                                          │
│   the .docx         ┌── task pane (WisWork) ──────────┐  │
│        ▲            │  taskpane.html + React          │  │
│        │ Office.js  │  agent/     tool definitions    │  │
│        └────────────┤  relay/     LLM session         │  │
│         read/write  │  pc-bridge/ desktop link        │  │
│                     └───────┬─────────────────────────┘  │
└─────────────────────────────┼────────────────────────────┘
                              │ HTTP, 127.0.0.1 only
                              │ /v1/office/pairings, /v1/office/messages
                              ▼
              ┌─ WisWork desktop app (the fork) ─┐
              │  holds the account credentials   │
              │  @wiswork/agent-core             │
              │  @wiswork/ai-provider ──► LLM    │
              └──────────────────────────────────┘
```

`src/pc-bridge/session.ts` refuses any endpoint that is not loopback, so the bridge cannot be
pointed at a remote host:

```typescript
function validateEndpoint(value: string): string {
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.href !== `http://127.0.0.1:${url.port}/` ||
    !url.port
  )
    throw new Error('invalid_bridge_endpoint')
  return url.origin
}
```

The pane finds the desktop app by probing localhost ports in batches of 8 with a 400 ms timeout
against `/v1/office/health`, then pairs with a verification code the user approves on the desktop
side. Status walks `offline → connecting → pending → connected`, with `rejected` and `expired` as
terminal refusals.

#### One edit, end to end

```
 1. pane    → bridge      POST /v1/office/messages {prompt, host:'word'}
 2. bridge  → desktop     credentials attached, LLM called via ai-provider
 3. LLM     → desktop     tool call: write_document{mode:'replace', markdown}
 4. desktop → pane        tool frame returned over the bridge
 5. pane    → Office.js   READ first (get_document_text)
 6. pane                  render confirmation card: title, impact, before/after
                          return `awaiting_user_confirmation`
    ─────────────────── nothing written yet ───────────────────
 7. user                  clicks Confirm
 8. pane    → Office.js   ONE atomic OOXML replacement
 9. pane    → Office.js   re-read; compare normalized text and structure
10. on mismatch           restore the range and prove recovery, else
                          terminal `office_recovery_failed`
```

Two design choices worth borrowing. A write is a **proposal**, not an action — step 6 returns
success while having changed nothing. And the mutation is **one transaction**: Markdown converts to
OOXML in the pane and lands in a single Office.js call. Lists fail closed rather than use
non-transactional multi-batch numbering APIs, so a half-applied list is impossible. `execute_office_js`
does not evaluate JavaScript despite its name — it accepts a JSON declarative program of at most 32
allowlisted operations.

**Read across:** the packages were rescoped `@genoffice/*` → `@wiswork/*`, which is what lets a
surface that is not the suite consume the same engines.

### 2 · besliky/airy — +39 / −44 — the agent-tooling thesis, and our P7 already executed

**Thesis, in their words:** "an open-source office suite with a built-in **MCP copilot**" —
`packages/mcp-server` exposes the document engines to Claude Code and other MCP clients, headless,
so a coding agent can open and edit real `.docx`/`.xlsx` with no GUI, or edit the document open in
the running app through a local socket bridge.

This is the only fork that is honest about its lineage — a "What is different from upstream"
section naming GenOffice and linking it.

**Their three divergences, verified against the repo:**

| claim                                                                                        | verification                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genspark login, provider, `gsk` backend, `@genspark/cli`, auto-updater and analytics removed | `packages/ai-search/src/gsk.ts`, `packages/ai-search/src/genoffice-auth.ts` and `apps/shell/src/main/cloud-projects.ts` all return **404** in their tree                                                                                                                                                                                             |
| `tools/check-no-genspark.mjs` guards regression                                              | fetched and read; scans `apps`, `packages`, `tools`, `scripts` for genspark.ai/.com domains, the retired device-code/`api_tokens`/`office_addin_auth` endpoints, and `@genspark/` dependencies in manifests, lockfiles and module specifiers. Documentation provenance is deliberately excluded from the scan so NOTICE/README attribution survives. |
| `packages/mcp-server` added                                                                  | present in their package list                                                                                                                                                                                                                                                                                                                        |

**This is P7, already done, by someone who published the guard.** The egress check is Apache-2.0 and
directly adoptable rather than something to design. Its exclusion rule is the part to keep: scan
code, spare the attribution docs, so the guard cannot pass by deleting a NOTICE.

**Sizing caveat.** Their 39 commits also carried rebrand, icons, updater and CI, so the number is
not the cost of provider removal alone.

### 3 · 360org/vuaoffice — +201 / −16 — localization and vertical expansion

**Thesis:** a Vietnamese-market office suite for one corporation ("360 CORP"), stated openly in the
README as built on GenOffice under Apache-2.0 — correct attribution, unlike WisWork.

It follows the same six apps and adds a **seventh: VuaOffice Mail**, described as an AI-integrated
email and calendar client _"thay thế Microsoft Office 365 Outlook"_ — replacing Outlook. Plus an
ERP ("VuaHeThong Pro"), a 360 CORP account system, and its own AI Router.

Its README carries a section on **conflict-handling procedure when pulling from upstream**, with
mandatory steps so brand and AI-provider customizations are not overwritten. That is the discipline
behind its −16: the process is written down and enforced, not incidental.

## What we take

| from          | take                                                           | why it is credible                                                                      |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **airy**      | `tools/check-no-genspark.mjs`, adapted                         | Apache-2.0, read in full, already solves the attribution-vs-code scanning distinction   |
| **airy**      | the de-genspark file list as a checklist                       | the three files verified absent in a shipping fork — the removal is provably survivable |
| **vuaoffice** | a written upstream-merge procedure in the repo                 | −16 vs WisWork's −129, with the procedure as the visible difference                     |
| **WisWork**   | new capability as a new `apps/` directory                      | three added apps work through the shell's `TabManager` seam                             |
| **WisWork**   | package rescoping makes the engines reusable outside the suite | `@wiswork/*` let them build an Office task pane on the same engine layer                |

## What we avoid

- **WisWork's attribution posture.** Apache-2.0 §4 requires retaining notices; shipping upstream's
  README as your own with no credit is at best poor practice. officebay attributes.
- **WisWork's −129 drift**, whose history is a wall of `fix(office): recover …`.
- **vuaoffice's split-repo topology** (private GitLab primary, filtered public mirror) — a release
  filter that must never fail open, not worth it at our size.

## The strategic read

Nobody forks this to build something unrelated. The four active forks each take the same engine
layer and point it at a distribution they can own: WisWork at Microsoft Office users, airy at coding
agents, vuaoffice at a Vietnamese corporate market, KARYA at local-first/Ollama users. officebay's
own thesis — a derived-artifact layer over reading and marking — is the same move aimed at a
different surface, which makes these forks peers rather than competitors, and their solved problems
directly reusable.

**Two of them independently removed the Genspark dependency** (airy fully; KARYA via key-less
providers and Ollama). P7 is not an unusual requirement — it is what everyone shipping this code
does first.

## Method and limits

Comparisons via `gh api repos/genspark-ai/genoffice/compare/main...<fork>:<branch>`; file existence
via the contents API; READMEs and the egress guard fetched and read.

**Not covered:** 873 unsampled forks; whether any fork's added code is worth importing at the
source level (only structure and intent were assessed); WisWork's relay/pairing infrastructure;
whether airy's MCP server duplicates what officebay needs or could be adopted outright — **that
last one is worth a dedicated look**, since it overlaps officebay's agent-facing ambitions
directly.
