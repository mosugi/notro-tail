---
id: TASK-11
title: Research Sätteri code highlighting and implement HAST plugin (replaces shikiConfig)
status: Done
assignee: []
created_date: '2026-06-07'
labels: [research, feat]
dependencies: []
priority: high
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Determine how code syntax highlighting works when `@astrojs/mdx` uses Sätteri as the processor, then implement or expose the appropriate API so `notro({ shikiConfig })` continues to work.

## Background

Currently `notro({ shikiConfig: { theme: 'github-dark' } })` dynamically loads `@shikijs/rehype` and appends it to `allRehypePlugins`, which is passed to `unified({ rehypePlugins })`. Once Sätteri becomes the default processor (TASK-13), rehype plugins are no longer applied — `@shikijs/rehype` will silently do nothing.

## Research questions

### 1. Does Astro's built-in Shiki integration work with Sätteri?

Astro has a `markdown.shikiConfig` option at the `defineConfig` level. Internally, this might be wired below the remark/rehype layer (e.g., directly in the Astro pipeline or in `@astrojs/mdx`). Check:

- Does `astro.config.mjs → shikiConfig` still apply to `.mdx` files when `@astrojs/mdx` uses Sätteri?
- Source: `node_modules/@astrojs/mdx/dist/` and `node_modules/satteri/`

### 2. Does Sätteri itself have Shiki support?

Check `@astrojs/markdown-satteri` and `satteri` package:
- Is there a `shiki` or `highlight` option on `satteri()` processor options?
- Does it produce highlighted `<pre><code>` blocks automatically?

### 3. Is there a `@shikijs/satteri` package?

Search npm/GitHub for an official Shiki Sätteri plugin equivalent to `@shikijs/rehype`.

## Implementation (based on research findings)

### Path A: Astro/Sätteri handles Shiki natively

If `defineConfig({ markdown: { shikiConfig: { theme: 'github-dark' } } })` already highlights
code blocks in Sätteri-processed `.mdx` files, then `notro({ shikiConfig })` can:
1. Pass the option through to Astro's `updateConfig({ markdown: { shikiConfig } })`
2. Or document that users configure it directly in `defineConfig`

### Path B: Implement a Sätteri HAST plugin

If no built-in support exists, implement `satteriShikiPlugin(options)`:

```typescript
// packages/notro-loader/src/utils/satteri-plugins.ts
import { defineHastPlugin } from 'satteri';
import { getHighlighter } from 'shiki';

export function satteriShikiPlugin(options: { theme?: string; themes?: Record<string, string> }) {
  return defineHastPlugin({
    name: 'notro-shiki',
    element: {
      filter: ['pre'],
      async visit(node, ctx) {
        const code = node.children[0];
        if (code?.type !== 'element' || code.tagName !== 'code') return;
        const lang = (code.properties?.className as string[])
          ?.find(c => c.startsWith('language-'))
          ?.replace('language-', '');
        if (!lang) return;
        const text = ctx.textContent(code);
        const highlighted = await highlight(text, lang, options);
        ctx.replaceNode(node, { ...highlighted });
      },
    },
  });
}
```

This would be consumed in TASK-13 when `shikiConfig` is provided:

```typescript
// integration.ts (after TASK-13)
const hastPlugins = [
  ...(shikiConfig ? [satteriShikiPlugin(shikiConfig)] : []),
  ...userHastPlugins,
];
```

## Files affected

| File | Change |
|------|--------|
| `packages/notro-loader/src/utils/satteri-plugins.ts` | Add `satteriShikiPlugin()` (or document alternative) |
| `packages/notro-loader/src/integration.ts` | Wire shikiConfig → satteriShikiPlugin (in TASK-13) |

## Acceptance criteria

- [ ] Research documented: which path applies (A or B)
- [ ] Code highlighting works in `.mdx` files when `notro({ shikiConfig })` is set with Sätteri as default
- [ ] `pnpm run build` passes with highlighted code blocks
<!-- SECTION:DESCRIPTION:END -->
