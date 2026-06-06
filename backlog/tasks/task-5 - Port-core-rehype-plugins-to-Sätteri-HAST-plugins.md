---
id: TASK-5
title: Port core rehype plugins to Sätteri HAST plugins
status: To Do
assignee: []
created_date: '2026-06-06 00:14'
labels: []
dependencies: []
priority: low
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

The following rehype plugins in `packages/notro-loader/src/utils/mdx-pipeline.ts` must be ported to Sätteri HAST plugin API for full Sätteri compatibility. Depends on TASK-4.

## Plugins to port

| Plugin | What it does |
|---|---|
| `rehypeRaw` (external) | Parses raw HTML strings from Notion markdown into hast nodes. Sätteri may handle this natively. |
| `rehypeNotionColorPlugin` | Converts Notion `color=` attributes on `<p>`, `<h1-h6>`, `<span>` to Tailwind CSS classes |
| `rehypeBlockElementsPlugin` | Renames Notion block elements (video, table_of_contents…) from lowercase to PascalCase for MDX component map |
| `rehypeInlineMentionsPlugin` | Renames mention elements (mention-user…) from hyphenated to PascalCase |
| `rehypeSlug` (external) | Adds `id` attributes to h1–h4 headings |
| `rehypeTocPlugin` | Populates `<TableOfContents>` with anchor links to all headings |
| `resolvePageLinksPlugin` | Resolves Notion notion.so URLs to local paths using `linkToPages` map |

## Sätteri HAST plugin API

```ts
import { defineHastPlugin } from '@astrojs/markdown-satteri';

const notroColorPlugin = defineHastPlugin({
  name: 'notro-color',
  element: {
    filter: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'],
    visit(node, ctx) {
      // convert color= attr to Tailwind class
    },
  },
});
```

## Notes

- `rehypeRaw` may be unnecessary with Sätteri (Rust parser may handle raw HTML natively — verify)
- `rehypeBlockElementsPlugin` / `rehypeInlineMentionsPlugin`: Sätteri's MDX uses `oxc` not `acorn`, so JSX node type behavior may differ
- External plugins (`rehypeSlug`, user's `rehypeKatex`, `rehypeMermaid`) cannot be used — need Sätteri-compatible alternatives or notro ports

## Acceptance criteria

- [ ] All core rehype plugins ported to Sätteri HAST plugins
- [ ] Notion component map (PascalCase rename) works with Sätteri's oxc-based MDX
- [ ] User-provided rehype plugins (math, mermaid) documented as requiring Sätteri-compatible alternatives
<!-- SECTION:DESCRIPTION:END -->
