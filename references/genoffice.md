# genoffice — vendored reference

| field | value |
|---|---|
| Upstream | `https://github.com/genspark-ai/genoffice.git` |
| Owner | Mainfunc, Inc. ("Genspark") |
| Licence | Apache-2.0, except `ee/` (GenOffice Enterprise Licence, empty of code today) |
| Backup clone | `~/projects/genoffice` — full clone, all refs |
| Pinned commit | `d35d77094854bd04c65c8f65133b24fc31be0964` |
| Commit date | 2026-09-10 19:59:38 +0530 |
| Subject | `feat(pdf): add print range dialog (all/current/custom) (#288)` |
| Refs at clone | 1 branch (`main`), 24 tags, 127 commits |
| Recorded | 2026-09-11 |

## Why it is backed up

GitHub `main` is a **mirror**, not the development tree: per `CONTRIBUTING.md`, development
happens in a private repository and `main` advances through squashed
`Sync snapshot (<date>)` commits. Nobody pushes to it directly, and external PRs are closed
rather than merged after being re-applied privately. That publication model means upstream
history can be rewritten or the mirror withdrawn without notice. The local clone in
`~/projects/genoffice` is the durable copy.

Trademark note: Apache-2.0 §6 does not grant use of the GenOffice or Genspark names and logos.
Any fork we ship carries its own branding.

## Verification

```
git -C ~/projects/genoffice fsck            # clean
git -C ~/projects/genoffice rev-list --count HEAD   # 127
du -sh ~/projects/genoffice/.git            # 41M
```

## What was read

`CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `packages/agent-core/src/{types,skill,loop}.ts`,
`packages/{ai-provider,project-store,pdf2docx}/src/`, `apps/pdf/src/`, `apps/markdown/src/`,
`apps/shell/src/main/tab-manager.ts`. Findings are in
`research/2026-09-11-pdfbay-inside-genoffice.md`.
