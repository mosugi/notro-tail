---
id: TASK-1
title: 'Migrate @astrojs/mdx integration to processor: unified() API'
status: To Do
assignee: []
created_date: '2026-06-06 00:13'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

Astro 6.4 deprecated the top-level `remarkPlugins` / `rehypePlugins` options on `@astrojs/mdx`. These will be removed in Astro 8.0.

The new API wraps plugins inside `processor: unified({ remarkPlugins, rehypePlugins })`.

## Current code (packages/notro-loader/src/integration.ts:149)

```ts
updateConfig({
  integrations: [mdx({
    remarkPlugins: [remarkNfm, ...remarkPlugins],  // deprecated
    rehypePlugins: allRehypePlugins,               // deprecated
    extendMarkdownConfig,
  })],
})
```

## Target

```ts
import { unified } from '@astrojs/markdown-remark';

updateConfig({
  integrations: [mdx({
    processor: unified({
      remarkPlugins: [remarkNfm, ...remarkPlugins],
      rehypePlugins: allRehypePlugins,
    }),
    extendMarkdownConfig: false,
  })],
})
```

## Acceptance criteria

- [ ] `integration.ts` uses `processor: unified()` instead of top-level options
- [ ] No deprecation warnings on `pnpm run build`
- [ ] `pnpm run build` passes
- [ ] Changeset added (patch for notro-loader)
<!-- SECTION:DESCRIPTION:END -->
