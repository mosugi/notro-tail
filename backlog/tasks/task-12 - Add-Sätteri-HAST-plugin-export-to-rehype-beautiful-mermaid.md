---
id: TASK-12
title: Add Sätteri HAST plugin export to rehype-beautiful-mermaid
status: Done
assignee: []
created_date: '2026-06-07'
labels: [feat]
dependencies: []
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Add a Sätteri-compatible HAST plugin export to `packages/rehype-beautiful-mermaid` so users can render Mermaid diagrams when Sätteri is the default processor. Keep the existing rehype export for backward compatibility.

## Background

`rehype-beautiful-mermaid` currently exports a rehype plugin that renders Mermaid code blocks to inline SVG at build time. When `@astrojs/mdx` uses Sätteri as the processor (TASK-13), rehype plugins are no longer invoked — so `.mdx` files with Mermaid diagrams would stop rendering.

The blog template currently uses:
```js
import { rehypeMermaid } from 'rehype-beautiful-mermaid';
notro({ rehypePlugins: [[rehypeMermaid, { theme: 'github-dark' }]] })
```

After TASK-13, the target API is:
```js
import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';
notro({ hastPlugins: [satteriMermaidPlugin({ theme: 'github-dark' })] })
```

## Implementation

### 1. Add Sätteri HAST plugin

New file: `packages/rehype-beautiful-mermaid/src/satteri-mermaid.ts`

```typescript
import { defineHastPlugin } from 'satteri';
import type { HastPluginDefinition } from 'satteri';
import { renderMermaid } from './render.ts'; // extract shared render logic

export interface SatteriMermaidOptions {
  theme?: string;
  backgroundColor?: string;
}

export function satteriMermaidPlugin(options: SatteriMermaidOptions = {}): HastPluginDefinition {
  return defineHastPlugin({
    name: 'rehype-beautiful-mermaid-satteri',
    element: {
      filter: ['pre'],
      async visit(node, ctx) {
        const code = node.children?.[0];
        if (code?.type !== 'element' || code.tagName !== 'code') return;
        const classes = code.properties?.className as string[] | undefined;
        if (!classes?.includes('language-mermaid')) return;

        const mermaidSource = ctx.textContent(code);
        const svg = await renderMermaid(mermaidSource, options);

        ctx.replaceNode(node, {
          type: 'element',
          tagName: 'div',
          properties: { 'data-mermaid': '' },
          children: [{ type: 'raw', value: svg }],
        });
      },
    },
  });
}
```

### 2. New entry point

Add to `packages/rehype-beautiful-mermaid/package.json` exports:

```json
"./satteri": "./src/satteri-mermaid.ts"
```

### 3. Extract shared render logic

The SVG rendering code (Mermaid CLI or `@mermaid-js/mermaid-core`) is shared between the rehype and Sätteri plugins. Extract to `packages/rehype-beautiful-mermaid/src/render.ts`.

### 4. Keep existing rehype export unchanged

`packages/rehype-beautiful-mermaid/index.ts` stays as-is for users still on unified.

## Files affected

| File | Change |
|------|--------|
| `packages/rehype-beautiful-mermaid/src/render.ts` | Extract shared render logic (new file) |
| `packages/rehype-beautiful-mermaid/src/satteri-mermaid.ts` | New Sätteri HAST plugin (new file) |
| `packages/rehype-beautiful-mermaid/package.json` | Add `./satteri` export entry |
| `packages/rehype-beautiful-mermaid/index.ts` | Update to use shared render.ts (refactor) |

## Acceptance criteria

- [ ] `import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri'` works
- [ ] Mermaid code blocks in `.mdx` files render to inline SVG with Sätteri processor
- [ ] Existing `rehypeMermaid` (rehype API) continues to work unchanged
- [ ] `pnpm run build` passes
- [ ] Changeset added for `rehype-beautiful-mermaid` (minor — new export)
<!-- SECTION:DESCRIPTION:END -->
