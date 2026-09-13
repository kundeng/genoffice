# Fork landscape: what the serious forks are actually doing

**Date:** 2026-09-13, **revised** the same day after the first version was found shallow.
**Status:** research, feeds `.kiro/specs/02` R6 (fork footprint) and pillar P7 (operational
independence and product identity).

## What the first version got wrong

Recorded so the same mistakes are not repeated, not as narrative:

1. **Only `main` was compared.** `compare/main...<fork>:main` misses work on other branches.
   `ghostship25/my_genoffice` was reported as "0 ahead, nothing to learn"; it has
   `feature/local-first-ai` at +6 with Ollama support, a local RAG workspace, key-less provider
   gating and a rebrand to KARYA. Branch enumeration is part of the method now.
2. **Commit subjects were read instead of code.** "Removed the Genspark provider" was repeated from
   a commit title. It is now verified by fetching the files.
3. **"A different product" was asserted from a diffstat.** WisWork's README is genoffice's README
   with the name replaced — same six apps, same feature list, same byte-preserving pitch. It is a
   rebranded redistribution with additions, not a different product. A fork of a 671k-LOC office
   suite does not set out to become something unrelated; it sets out to _own a distribution channel_
   for the same thing.
4. **12 of 885 forks were sampled.** Still true below, but now stated rather than implied.

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
Agent task pane for Word, Excel, and PowerPoint"_ — a task pane inside **real Microsoft Office**,
reusing `@wiswork/agent-core` and `@wiswork/ai-provider`. They are not competing with Word; they are
putting their agent inside it, with the open-source suite as the engine supply.

**Read across:** the packages were rescoped `@genoffice/*` → `@wiswork/*`, which is what makes the
suite a reusable engine layer for a surface that is not the suite.

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

**This is P7, already done, by someone who published the guard.** Their egress check is the artifact
I previously proposed we design; it is Apache-2.0 and directly adoptable, and its exclusion rule —
scan code, spare attribution docs — is the detail we would have gotten wrong first time.

**What it does not tell us:** their 39 commits also carried rebrand, icons, updater and CI. The
provider-removal core is a subset, not the whole 39, and the count should not be quoted as the cost
of de-genspark alone.

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
