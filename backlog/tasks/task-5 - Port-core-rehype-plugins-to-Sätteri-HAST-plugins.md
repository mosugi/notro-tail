---
id: TASK-5
title: Port core rehype plugins to Sätteri HAST plugins
status: To Do
assignee: []
created_date: '2026-06-06 00:14'
labels: []
dependencies: [TASK-4]
priority: low
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

The core rehype plugins in `packages/notro-loader/src/utils/mdx-pipeline.ts` need to be ported to Sätteri HAST plugin API for full Sätteri `@astrojs/mdx` compatibility. Depends on TASK-4.

**Scope reminder**: This is for static `.mdx` file processing via `@astrojs/mdx`. The Notion content path (`evaluate()`) stays on unified and is unaffected.

## Plugins: porting analysis

| Plugin | Location | What it does | Porting approach |
|--------|----------|--------------|-----------------|
| `rehypeRaw` | external | Parses raw HTML strings into hast nodes | **Likely unnecessary** — Sätteri's Rust parser handles raw HTML natively. Verify. |
| `rehypeNotionColorPlugin` | `mdx-pipeline.ts` | `color=` attr on `<p>/<h1-h6>/<span>` → Tailwind CSS classes | Port to Sätteri HAST plugin with `element.filter` |
| `rehypeBlockElementsPlugin` | `mdx-pipeline.ts` | Lowercase Notion block elements → PascalCase for MDX component map | **Needs research**: Sätteri uses `oxc` (not `acorn`) for MDX — verify whether the lowercase→PascalCase rename trick still works with oxc-based JSX compilation |
| `rehypeInlineMentionsPlugin` | `mdx-pipeline.ts` | `mention-user` etc. → `MentionUser` etc. | Same concern as `rehypeBlockElementsPlugin` |
| `rehypeSlug` | external | `id` attrs on h1–h4 | Port to Sätteri HAST plugin (straightforward) |
| `rehypeTocPlugin` | `mdx-pipeline.ts` | Populates `<TableOfContents>` with heading anchor links | Port to Sätteri HAST plugin; runs after slug plugin |
| `resolvePageLinksPlugin` | `mdx-pipeline.ts` | Resolves `notion.so` URLs using `linkToPages` map | **Requires design work** (see below) |

## Key open question: PascalCase rename with oxc-based MDX

`rehypeBlockElementsPlugin` renames `<video>` → `<Video>` etc. in the HAST tree so that `@mdx-js/mdx` emits `_jsx(Video, ...)` (component lookup) instead of `_jsx("video", ...)` (literal HTML string). This is a `@mdx-js/mdx`-specific behavior.

Sätteri uses `oxc` for MDX compilation. Whether oxc follows the same lowercase→string / PascalCase→component-lookup convention must be verified before implementing the Sätteri HAST plugin equivalent.

## Key open question: resolvePageLinksPlugin and runtime parameters

`resolvePageLinksPlugin` takes a `{ linkToPages }` option at runtime (per-compile, not at plugin registration). Sätteri plugins are registered at configuration time.

Options to investigate:
1. Does Sätteri support factory-function plugins (closure over `linkToPages`)?
2. Can `linkToPages` be injected via a build-time Vite plugin or loader step?
3. For static `.mdx` files, is `resolvePageLinksPlugin` even relevant? (`.mdx` files are not Notion content and don't contain `notion.so` URLs — this plugin may not be needed for the Sätteri path)

## Sätteri HAST plugin API reference

```ts
import { defineHastPlugin } from 'satteri';

const notroColorPlugin = defineHastPlugin({
  name: 'notro-color',
  element: {
    filter: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'],
    visit(node, ctx) {
      const color = node.properties?.color;
      if (typeof color === 'string') {
        const cls = notionColorToClass(color);
        delete node.properties.color;
        ctx.setProperty(node, 'className', [
          ...(node.properties.className ?? []), cls
        ].filter(Boolean));
      }
    },
  },
});
```

## Acceptance criteria

- [ ] Verify whether `rehypeRaw` is needed with Sätteri (document finding)
- [ ] Verify PascalCase rename behavior with oxc-based MDX compilation
- [ ] `rehypeNotionColorPlugin` ported to Sätteri HAST plugin
- [ ] `rehypeBlockElementsPlugin` + `rehypeInlineMentionsPlugin` ported (or redesigned if oxc behaves differently)
- [ ] `rehypeSlug` equivalent ported to Sätteri HAST plugin
- [ ] `rehypeTocPlugin` ported to Sätteri HAST plugin
- [ ] Decision documented on whether `resolvePageLinksPlugin` is needed for the Sätteri path
- [ ] User-provided rehype plugins (`rehypeKatex`, `rehypeMermaid`) documented as incompatible — users must use Sätteri-compatible alternatives when opting into Sätteri
<!-- SECTION:DESCRIPTION:END -->
