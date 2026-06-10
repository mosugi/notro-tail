---
id: TASK-20
title: Align monorepo docs and comments with Sätteri-first architecture
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [docs, satteri]
dependencies: [TASK-18, TASK-19]
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

The Sätteri migration changed the architecture, but several docs and code comments still describe the old remark/rehype pipeline. After TASK-18 (remark-nfm restructure) and TASK-19 (mermaid Sätteri-only) land, do a single alignment pass so every description matches the new structure.

## Known stale references (verify against post-TASK-18/19 state)

### CLAUDE.md

- Package table: `remark-nfm` described as "Pure remark plugin … notro-loader uses remark-nfm internally" — rewrite for the string-first three-layer design from TASK-18
- Package table: `rehype-beautiful-mermaid` described as "Rehype plugin" — now a Sätteri HAST plugin (TASK-19)
- "MDX Compile Pipeline" section: confirm the two-pipeline description (string-level runtime path vs Sätteri static path) matches the final import paths and entry points
- "Markdown Preprocessing" section: fix table lists only Fix 0–9; the core now has Fix 0–19 — regenerate the table from the final implementation
- "Package Publishing" / "Changeset Proposal" tables: update package names if TASK-18/19 renames happen

### Code comments in `packages/notro-loader`

- `src/loader/loader.ts` (~line 286): claims "remarkNfm in the MDX compile pipeline (compile-mdx.ts) runs preprocessNotionMarkdown() at parse time" — remarkNfm no longer runs in that pipeline
- `src/utils/default-components.ts` (~line 37): "callout is created by remarkNfm (a remark-level plugin via data.hName)" — callouts now come from string preprocessing / `notroCalloutPlugin`
- `src/utils/compile-mdx.ts` and `notion-preprocess.ts` headers: update "replaces the following pipeline" wording to reference the new package layout after the move in TASK-18

### docs/ (Starlight site)

- Grep for `remarkPlugins`, `rehypePlugins`, `remark-nfm`, `rehype-beautiful-mermaid` usage examples and update to the Sätteri-first API (`mdastPlugins`, `hastPlugins`, `shikiConfig`)

## Acceptance criteria

- [ ] `grep -rn "remarkNfm\|rehypePlugins\|remarkPlugins"` over `CLAUDE.md`, `docs/`, and `packages/*/src` returns only intentionally-historical references (e.g. changelogs)
- [ ] CLAUDE.md package table, pipeline sections, and preprocessing fix table match the shipped implementation
- [ ] Notion content pages on the blog template still build (`pnpm run build`) — docs-only task, but verify nothing was accidentally touched
- [ ] No changeset needed (docs/comments only) unless package READMEs change in ways worth a patch release
<!-- SECTION:DESCRIPTION:END -->
