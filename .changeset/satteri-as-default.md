---
"notro-loader": major
"rehype-beautiful-mermaid": minor
---

Switch default processor to Sätteri; replace remark/rehype plugin API with Sätteri MDASTP/HAST plugins.

**Breaking changes in `notro-loader`:**

- `NotroOptions.remarkPlugins` removed — remark plugins are no longer supported
- `NotroOptions.rehypePlugins` removed — rehype plugins are no longer supported  
- `NotroOptions.processor` removed — Sätteri is now always the processor for static `.mdx` files
- `@astrojs/markdown-remark` removed from dependencies

**New API in `notro-loader`:**

- `NotroOptions.mdastPlugins` — Sätteri MDASTP plugins for static `.mdx` files
- `NotroOptions.hastPlugins` — Sätteri HAST plugins for static `.mdx` files
- `NotroOptions.shikiConfig` — unchanged; now routed through Astro's `markdown.shikiConfig` for the Sätteri pipeline

**Migration guide:**

```js
// Before
import { rehypeMermaid } from 'rehype-beautiful-mermaid';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

notro({
  shikiConfig: { theme: 'github-dark' },
  remarkPlugins: [remarkMath],
  rehypePlugins: [[rehypeMermaid, { theme: 'github-dark' }], rehypeKatex],
})

// After
import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';

notro({
  shikiConfig: { theme: 'github-dark' },
  hastPlugins: [satteriMermaidPlugin({ theme: 'github-dark' })],
  // Note: math in static .mdx files (remark-math + rehype-katex) has no
  // Sätteri equivalent yet. Notion content supports math via string-level
  // preprocessing regardless.
})
```

**New in `rehype-beautiful-mermaid`:**

- New entry point `rehype-beautiful-mermaid/satteri` exports `satteriMermaidPlugin()` — a Sätteri HAST plugin equivalent of `rehypeMermaid` for projects using `@astrojs/mdx` with Sätteri
- The existing `rehypeMermaid` (rehype API) is unchanged
