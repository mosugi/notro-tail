---
id: TASK-4
title: Port remarkNfm to Sätteri MDASTP plugin
status: To Do
assignee: []
created_date: '2026-06-06 00:14'
labels: []
dependencies: []
priority: low
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

If/when Sätteri becomes the default Astro processor and notro wants to support it natively, `remarkNfm` (packages/remark-nfm/src/nfm.ts + transformer.ts) must be ported to Sätteri's MDASTP plugin API.

This is long-term work — unified() will remain supported for the foreseeable future and notro is in no rush.

## What remarkNfm does (10 fixes)

See packages/remark-nfm/src/transformer.ts for the full list. Key items:

- Fix 1: `---` dividers without preceding blank line
- Fix 2: Callout directive syntax normalization
- Fix 3: Block-level color annotations → raw HTML
- Fix 4: `<table_of_contents/>` wrapping
- Fix 5: Inline equation normalization
- Fix 6: `<synced_block>` stripping
- Fix 7: `<empty-block/>` isolation
- Fix 8: Closing tag blank line injection
- Fix 9: Markdown links inside `<td>` → `<a href>`

## Sätteri MDASTP plugin API

```ts
import { defineMdastPlugin } from '@astrojs/markdown-satteri';

const notroNfmPlugin = defineMdastPlugin({
  name: 'notro-nfm',
  // visitor per node type
  paragraph(node, ctx) { ... },
  html(node, ctx) { ... },
});
```

## Notes

- Most fixes in `transformer.ts` are string-level pre-parse transformations — these need to become `preprocessor` hooks or MDASTP visitors in Sätteri
- Sätteri's MDX parser is `oxc` (not `acorn`) — edge-case behavior differences documented at https://satteri.bruits.org/docs/divergences/

## Acceptance criteria

- [ ] All 10 Notion Markdown fixes replicated in Sätteri MDASTP plugin
- [ ] Existing unit tests in `packages/remark-nfm/` pass equivalently (adapt to Sätteri test harness)
- [ ] New package `packages/notro-satteri/` or export added to `remark-nfm` for Sätteri variant
<!-- SECTION:DESCRIPTION:END -->
