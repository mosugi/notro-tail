---
id: TASK-15
title: Major version bump and changeset for Sätteri-as-default
status: Done
assignee: []
created_date: '2026-06-07'
labels: [chore, breaking-change]
dependencies: [TASK-14]
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Create changesets and update documentation for the breaking API changes introduced in TASK-13/14.

## Changesets needed

### `notro-loader` — major

Breaking changes:
- `NotroOptions.remarkPlugins` removed
- `NotroOptions.rehypePlugins` removed
- `NotroOptions.processor` removed
- Sätteri is now the default processor for static `.mdx` files

New API:
- `NotroOptions.mdastPlugins` (Sätteri MDASTP plugins)
- `NotroOptions.hastPlugins` (Sätteri HAST plugins)
- `NotroOptions.shikiConfig` still works (internal implementation via Sätteri HAST)

### `rehype-beautiful-mermaid` — minor

New export:
- `import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri'`

## Documentation updates

### `CLAUDE.md` — `notro()` Astro Integration section

Update the options table:

| Option | Type | Purpose |
|--------|------|---------|
| `mdastPlugins` | `MdastPluginDefinition[]` | Sätteri MDASTP plugins for static .mdx files |
| `hastPlugins` | `HastPluginDefinition[]` | Sätteri HAST plugins for static .mdx files |
| `shikiConfig` | `Record<string, unknown>` | Code syntax highlighting (via Sätteri HAST internally) |
| `viteExternals` | `string[]` | Packages for Vite ssr.external |
| `extendMarkdownConfig` | `boolean` | Extend Astro's base markdown config |

Remove: `remarkPlugins`, `rehypePlugins`, `processor` rows.

Update the usage example in `CLAUDE.md`:
```js
import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';

export default defineConfig({
  integrations: [
    notro({
      shikiConfig: { theme: 'github-dark' },
      hastPlugins: [satteriMermaidPlugin({ theme: 'github-dark' })],
    }),
  ],
});
```

### Repository structure section

Update the MDX Compile Pipeline description to reflect Sätteri as default.

## Acceptance criteria

- [ ] `pnpm changeset` — changeset created for `notro-loader` (major) and `rehype-beautiful-mermaid` (minor)
- [ ] `CLAUDE.md` integration options table updated
- [ ] `CLAUDE.md` usage example updated
- [ ] `pnpm run build` passes after all doc updates
<!-- SECTION:DESCRIPTION:END -->
