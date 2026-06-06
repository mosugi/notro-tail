---
id: TASK-3
title: Track @astrojs/mdx API removal in Astro 8.0
status: In Progress
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

- [x] Monitor Astro 8.0 release notes and changelog — Astro 8.0 not yet released as of 2026-06-06; currently on 6.4.4. TASK-1 already migrated notro to `processor: unified()` ahead of the removal.
- [ ] Verify `pnpm run build` still passes after upgrading `astro` to 8.x — blocked until Astro 8.0 is released
- [ ] Update peer dependency in `packages/notro-loader/package.json` if needed — blocked until Astro 8.0 is released
- [ ] Check if `@astrojs/mdx` v7+ introduces any further breaking changes to the `processor` API — blocked until released
<!-- SECTION:DESCRIPTION:END -->
