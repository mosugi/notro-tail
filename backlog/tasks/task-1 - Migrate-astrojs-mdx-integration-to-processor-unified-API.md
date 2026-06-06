---
id: TASK-1
title: 'Migrate @astrojs/mdx integration to processor: unified() API'
status: Done
assignee: []
created_date: '2026-06-06 00:13'
updated_date: '2026-06-06 00:51'
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
    // explicit processor: unified() serves double duty:
    // 1. uses the non-deprecated API (remarkPlugins/rehypePlugins on mdx() are removed in Astro 8.0)
    // 2. guards against inheriting markdown.processor: satteri() from the user's Astro config —
    //    notro's pipeline requires remark/rehype plugins that Sätteri doesn't support
    processor: unified({
      remarkPlugins: [remarkNfm, ...remarkPlugins],
      rehypePlugins: allRehypePlugins,
    }),
    extendMarkdownConfig: false,
  })],
})
```

## Why both processor: unified() and extendMarkdownConfig: false

`@astrojs/mdx`'s `processor` option defaults to inheriting `markdown.processor` from the Astro config.
If a user sets `markdown.processor: satteri()` for `.md` files, MDX would also switch to Sätteri —
breaking notro because Sätteri doesn't support remark/rehype plugins.

`extendMarkdownConfig: false` prevents inheriting legacy `markdown.remarkPlugins` etc.,
while `processor: unified({...})` explicitly pins the MDX processor regardless of the user's
top-level `markdown.processor` setting.

## Acceptance criteria

- [x] `integration.ts` uses `processor: unified()` instead of deprecated top-level options
- [x] No deprecation warnings in `pnpm run build` output
- [x] `pnpm run build` passes
- [x] Comment added explaining why `processor: unified()` is explicit (not just default)
- [x] `NotroOptions` JSDoc updated to mention Sätteri incompatibility
- [x] Changeset added (patch for notro-loader)
<!-- SECTION:DESCRIPTION:END -->
