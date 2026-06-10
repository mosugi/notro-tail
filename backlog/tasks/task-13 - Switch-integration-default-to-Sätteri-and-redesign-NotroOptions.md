---
id: TASK-13
title: Switch integration.ts default to Sätteri and redesign NotroOptions (breaking)
status: Done
assignee: []
created_date: '2026-06-07'
labels: [refactor, breaking-change]
dependencies: [TASK-11, TASK-12]
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Make Sätteri the default processor for static `.mdx` files in the `notro()` integration.
Replace the `remarkPlugins`/`rehypePlugins` API with Sätteri-native `mdastPlugins`/`hastPlugins`.
Remove the `unified()` call and `@astrojs/markdown-remark` import entirely.

## Background

After TASK-10 (string-level Notion preprocessing), `remarkPlugins`/`rehypePlugins` no longer apply
to the Notion content path. After TASK-11/12 (Sätteri Shiki + Mermaid HAST plugins),
Sätteri covers all rendering features the blog template needs.

Astro 6.4 positions Sätteri as the next-generation processor. `unified()` and remark/rehype
remain supported but are the legacy path. notro should lead with Sätteri.

## API changes

### Before (current `NotroOptions`)

```typescript
interface NotroOptions {
  remarkPlugins?: PluggableList;   // ← remove
  rehypePlugins?: PluggableList;   // ← remove
  shikiConfig?: Record<string, unknown>;  // ← keep, route through Sätteri internally
  viteExternals?: string[];
  processor?: MarkdownProcessor;   // ← remove (Sätteri is always used)
  extendMarkdownConfig?: boolean;
}
```

### After (new `NotroOptions`)

```typescript
import type { MdastPluginDefinition, HastPluginDefinition } from 'satteri';

interface NotroOptions {
  mdastPlugins?: MdastPluginDefinition[];  // ← new: Sätteri MDASTP plugins
  hastPlugins?: HastPluginDefinition[];    // ← new: Sätteri HASTP plugins
  shikiConfig?: Record<string, unknown>;   // ← kept: converted to satteriShikiPlugin internally
  viteExternals?: string[];
  extendMarkdownConfig?: boolean;
}
```

### `integration.ts` restructure

Remove:
- `import { unified } from '@astrojs/markdown-remark'`
- `import type { MarkdownProcessor } from '@astrojs/markdown-remark'`
- `import { isSatteriProcessor } from '@astrojs/markdown-satteri'`
- The entire Sätteri-detection branch (now always Sätteri)

Replace with:
```typescript
import { satteri } from '@astrojs/markdown-satteri';

// In astro:config:setup:
const satteriProcessor = satteri();
satteriProcessor.options.features.directive = true;

const allMdastPlugins = [
  ...buildSatteriMdastPlugins(),  // notro's callout plugin
  ...mdastPlugins,                // user-provided
];

const allHastPlugins = [
  ...(shikiConfig ? [satteriShikiPlugin(shikiConfig)] : []),
  ...hastPlugins,                 // user-provided
];

for (const plugin of allMdastPlugins) {
  satteriProcessor.options.mdastPlugins.push(plugin);
}
for (const plugin of allHastPlugins) {
  satteriProcessor.options.hastPlugins.push(plugin);
}

updateConfig({
  integrations: [mdx({
    processor: satteriProcessor,
    extendMarkdownConfig,
  })] as any,
  vite: { ssr: { external: viteExternals } },
});
```

## Migration guide for users

Users who currently pass `remarkPlugins`/`rehypePlugins` to `notro()` must migrate:

| Before | After |
|--------|-------|
| `remarkPlugins: [remarkMath]` | Built into Sätteri — remove |
| `rehypePlugins: [rehypeKatex]` | No Sätteri equivalent — see note below |
| `rehypePlugins: [[rehypeMermaid, opts]]` | `hastPlugins: [satteriMermaidPlugin(opts)]` |
| `shikiConfig: { theme: '...' }` | Unchanged (internal implementation changes) |

**KaTeX note**: `rehype-katex` has no Sätteri-compatible HAST equivalent yet. Users who need
math rendering in `.mdx` files can:
1. Write HTML-level math directly (e.g., use a KaTeX JavaScript client-side approach)
2. Contribute a `satteriKatexPlugin` to notro or `@katex/satteri`

## Breaking changes

- `NotroOptions.remarkPlugins` removed
- `NotroOptions.rehypePlugins` removed  
- `NotroOptions.processor` removed
- `@astrojs/markdown-remark` is no longer a dependency of `notro-loader`

This is a **breaking change** → `major` version bump for `notro-loader` (TASK-15).

## Files affected

| File | Change |
|------|--------|
| `packages/notro-loader/src/integration.ts` | Full restructure (see above) |
| `packages/notro-loader/package.json` | Remove `@astrojs/markdown-remark` from dependencies |

## Acceptance criteria

- [ ] `NotroOptions` uses `mdastPlugins`/`hastPlugins` instead of `remarkPlugins`/`rehypePlugins`
- [ ] `unified()` is no longer called or imported
- [ ] `@astrojs/markdown-remark` removed from `notro-loader` dependencies
- [ ] Sätteri is the default processor for static `.mdx` files (no explicit option needed)
- [ ] `shikiConfig` still works (via `satteriShikiPlugin` internally)
- [ ] notro's callout MDASTP plugin is always injected
- [ ] `pnpm run build` passes
<!-- SECTION:DESCRIPTION:END -->
