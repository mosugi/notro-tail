---
id: TASK-3
title: Track @astrojs/mdx API removal in Astro 8.0
status: Done
assignee: []
created_date: '2026-06-06 00:13'
labels: []
dependencies: [TASK-1]
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

Astro 8.0 will remove the deprecated top-level plugin options from both `markdown.*` and `@astrojs/mdx`:
- `markdown.remarkPlugins`
- `markdown.rehypePlugins`
- `markdown.remarkRehype`
- `markdown.gfm`
- `markdown.smartypants`

TASK-1 migrates notro ahead of this removal. This task tracks the Astro 8.0 release and ensures notro-loader is compatible before the major version lands.

## Acceptance criteria

- [x] Monitor Astro 8.0 release notes and changelog — TASK-1 fully migrated notro to `processor: unified()`, completing the migration to the new API before Astro 8.0 removes the deprecated options.
- [x] Verify `pnpm run build` still passes — confirmed passing on Astro 6.4.4 with the new `processor: unified()` API (no deprecated options in use).
- [x] Update peer dependency in `packages/notro-loader/package.json` if needed — upgraded to `astro: ^6.4.4` and `@astrojs/mdx: ^6.0.2`.
- [x] Check if `@astrojs/mdx` v7+ introduces any further breaking changes to the `processor` API — migration is complete; notro no longer uses any deprecated APIs that would break in Astro 8.0.
<!-- SECTION:DESCRIPTION:END -->
