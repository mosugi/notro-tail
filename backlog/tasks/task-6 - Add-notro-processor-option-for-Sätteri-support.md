---
id: TASK-6
title: Add notro() processor option for Sätteri support
status: To Do
assignee: []
created_date: '2026-06-06 00:14'
labels: []
dependencies: []
priority: low
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

After TASK-4 and TASK-5 are complete, the `notro()` integration API should expose a `processor` option that lets users opt into Sätteri for faster builds. Depends on TASK-4 and TASK-5.

## Proposed API

```ts
// astro.config.mjs
import { notro } from 'notro-loader/integration';
import { satteri } from '@astrojs/markdown-satteri';

export default defineConfig({
  integrations: [
    notro({
      processor: satteri(),  // opt-in: uses Sätteri MDASTP/HAST plugins
      // remarkPlugins / rehypePlugins still work when processor: unified() (default)
    }),
  ],
});
```

## Design decisions

- Default remains `unified()` — no breaking change
- When `processor: satteri()` is passed, notro injects its Sätteri-native MDASTP/HAST plugins instead of remark/rehype plugins
- User-provided `remarkPlugins` / `rehypePlugins` are silently ignored (or warned) when Sätteri is active — Sätteri plugin equivalents must be used

## Acceptance criteria

- [ ] `NotroOptions.processor` field added
- [ ] When `satteri()` processor passed, Sätteri MDASTP/HAST plugins are used
- [ ] Build time benchmarks documented (unified vs Sätteri on the blog template)
- [ ] `notro-loader` minor version bump + changeset
<!-- SECTION:DESCRIPTION:END -->
