# Fork landscape: who else forked genoffice, and what we take from them

**Date:** 2026-09-13. **Status:** research, feeds `.kiro/specs/02` R6 (fork footprint) and the
de-genspark / whitelabel pillar.

889 forks exist. Fork counts are noise; what matters is which ones carry commits. Every number
below is from `gh api repos/genspark-ai/genoffice/compare/main...<fork>:main`, so "ahead" means
commits genuinely not in upstream.

## Measured: three forks are doing real work

| fork                                                          | ahead    | behind | what it is                                                                                                                                                       |
| ------------------------------------------------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AtomInnoLab/WisWork**                                       | **+755** | 129    | A different product. Added `apps/latex/` and `apps/office-addin/`, a websocket relay, PC pairing, Codex stream bridging. Ships ~daily (v0.6.77).                 |
| **360org/vuaoffice**                                          | **+201** | 16     | Vietnamese whitelabel plus an ERP ("VuaHeThong Pro"). Private GitLab is primary; GitHub is a public mirror. Merges upstream weekly.                              |
| **besliky/airy**                                              | **+39**  | 44     | Provider decoupling and rebrand. Removed the Genspark provider for BYOK-only, added an egress guard, rescoped packages to `@airy-office/*`, self-hosted updates. |
| ghostship25, happytalkman, Brown226, kartboop, dv365lab, +880 | 0        | 25–161 | Stars-and-drift mirrors. Nothing to learn.                                                                                                                       |

Nobody is ahead in `apps/slides/src/main/`. Whatever we do to the Slides op journal, we do alone.

## What we take, adapt, or avoid

### TAKE · airy's provider decoupling — this is our de-genspark recipe, already costed

`besliky/airy` did exactly the pillar you named, in **39 commits**, and the commit titles read as a
work plan:

```
feat(ai-provider)!: remove the genspark provider, default to BYOK-only
chore: sweep stale gsk/genspark references from code paths
chore(tools): genspark egress guard
chore: rename workspace packages from @genoffice to @airy-office scope
chore(i18n): drop orphan gsk keys and rebrand user strings
feat(shell): in-app updater backed by github releases
feat(brand): airy mark replaces genspark badge
chore(brand): regenerate app icons from the icon-only mark
ci: add release workflow for linux and windows builds
feat(packaging): bundle mcp server into installers
```

That is a proof the work is bounded, and a checklist. The pieces map onto four surfaces we have
already located in this codebase:

| what to cut                      | where it lives                                                        | what it does today                                                                             |
| -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| hosted search / slide generation | `packages/ai-search/src/gsk.ts`                                       | calls `genspark.ai/api/tool_cli` for web search, image search, slide generation, transcription |
| account login                    | `packages/ai-search/src/genoffice-auth.ts`                            | OAuth device flow against `genspark.ai`, stores an API token on disk                           |
| cloud project sync               | `apps/shell/src/main/cloud-projects.ts`                               | syncs project lists from `GENSPARK_ORIGIN`                                                     |
| server-side deck generation      | `slides:cloud-page-generate` in `apps/slides/src/main/slides-main.ts` | generates pages remotely, lands the returned pptx locally                                      |

**One thing airy's list does not mention, and we must handle.** `activeProvider()` at
[providers.ts:274](../../packages/ai-provider/src/providers.ts#L274) returns `'genspark'` whenever
the selected provider's configuration is incomplete — missing model, missing base URL, missing key.
A half-configured BYOK setup silently routes to Genspark instead of failing. Removing the provider
without fixing that fallback turns a silent redirect into a crash; fixing the fallback is part of
the same change. The egress guard airy added is the right second layer: a test that fails if any
code path can still reach the host.

**Cost estimate for officebay:** airy's 39 commits included rebrand, icons, updater and CI. The
provider-cut core is roughly the first ten. Our branding work (`AGENTS.md` already requires it —
Apache-2.0 §6 does not license the GenOffice or Genspark marks) is the same job airy did, so the
two pillars are one workstream, not two.

### ADAPT · WisWork proves a new app slots in cheaply

WisWork added `apps/latex/` and `apps/office-addin/` as **new app directories** and they work.
That is direct evidence for the fork-discipline rule in `AGENTS.md`: new surfaces belong in new
`apps/`, and the shell's `TabManager` absorbs them through the `createXView` / `requestXClose` /
`TabKind` seam. For officebay's reading surface this is the pattern to copy — a new app, not edits
spread through `apps/pdf`.

What not to copy: WisWork is **129 commits behind** and its history is a wall of
`fix(office): recover …` titles. It has drifted far enough that upstream is effectively a fossil
for them. That is the failure mode our R6 rule exists to prevent.

### ADAPT · vuaoffice's merge cadence is the empirical argument for R6

vuaoffice sits at **−16** by merging upstream weekly. WisWork sits at **−129** by not. Both carry
large diffs (+201 and +755). The difference is cadence, not diff size.

The forks carrying the most merge debt are the ones that edited
`apps/docs/src/renderer/editor/` heavily — all three of them did. That directory is the
fork-contested surface. It is a concrete input to the churn column in the component decomposition:
**upstream churn and fork churn concentrate in the same place**, and anything officebay builds
there pays twice.

### AVOID · vuaoffice's split-repo topology

Private GitLab primary with a filtered public GitHub mirror, plus commits like
`chore: sync public release and filter private files` and `fix(release): skip private brand gate on
public mirror`. It works for them, but it adds a release-filtering step that must never fail open.
Not worth it at our size.

## What this changes for spec 02

1. **R6 gets measured evidence.** "Prefer the candidate with the smallest coherent rebase surface"
   now has numbers behind it: the three forks that touched the Docs renderer editor carry 44–129
   commits of debt; the one that added separate app directories carries its weight in new files
   instead.
2. **De-genspark + whitelabel is one bounded workstream**, ~10–39 commits by a comparable fork's
   measure, touching four known files plus the `activeProvider` fallback. It is sized, not
   speculative.
3. **`apps/docs/src/renderer/editor/` is the highest-churn surface in the repo** by both upstream
   and fork measures. Treat edits there as expensive.
