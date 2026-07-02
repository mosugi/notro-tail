---
"notro-loader": minor
---

Add Astro 7 compatibility and adopt the Sätteri processor. `notro-loader` now requires Astro >=7.0.0 and uses `@astrojs/mdx` v7.

Notion content is now compiled with Sätteri — Astro 7's Rust-based Markdown/MDX processor — by default. notro's core pipeline (callout directives, Notion color classes, block/mention component renames, heading slugs, table of contents, page link resolution) has been ported to Sätteri's mdast/hast plugin API in `satteri-pipeline.ts`, producing output identical to the unified pipeline.

Because Sätteri cannot run remark/rehype plugins, configuring `notro({ remarkPlugins / rehypePlugins / shikiConfig })` automatically falls back to the unified (`@mdx-js/mdx` + `@astrojs/markdown-remark`) pipeline, so existing plugin setups (math, Mermaid, Shiki) keep working unchanged. A new `processor: 'satteri' | 'unified'` option on `notro()` overrides the automatic choice. Static `.mdx` files are processed with the same processor and plugin configuration as Notion content.
