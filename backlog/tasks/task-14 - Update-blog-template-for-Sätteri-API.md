---
id: TASK-14
title: Update blog template for Sätteri-based notro API
status: To Do
assignee: []
created_date: '2026-06-07'
labels: [chore]
dependencies: [TASK-13]
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Update `templates/blog/astro.config.mjs` and related files to use the new Sätteri-based
`notro()` API introduced in TASK-13. Verify the full build and visual output.

## Changes

### `templates/blog/astro.config.mjs`

```js
// Before
import { rehypeMermaid } from 'rehype-beautiful-mermaid';

export default defineConfig({
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" },
      rehypePlugins: [
        [rehypeMermaid, { theme: "github-dark" }],
      ],
    }),
  ],
});

// After
import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';

export default defineConfig({
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" },
      hastPlugins: [
        satteriMermaidPlugin({ theme: "github-dark" }),
      ],
    }),
  ],
});
```

### `templates/blog/package.json`

No change needed — `rehype-beautiful-mermaid` is still a dependency (used via `/satteri` export).

### `templates/blank/astro.config.mjs`

The blank template doesn't use `rehypePlugins` — verify it still builds correctly with no changes.

## Acceptance criteria

- [ ] `templates/blog/astro.config.mjs` uses `satteriMermaidPlugin` instead of `rehypeMermaid`
- [ ] `pnpm run build` passes (all pages built)
- [ ] `pnpm --filter notro-blog run preview` — Mermaid diagrams render correctly
- [ ] `pnpm --filter notro-blog run preview` — code blocks are syntax-highlighted
- [ ] `templates/blank` still builds without changes
<!-- SECTION:DESCRIPTION:END -->
