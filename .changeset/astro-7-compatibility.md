---
"notro-loader": minor
---

Rebuild entirely on Sätteri for Astro 7 — the remark/rehype (unified) pipeline is removed.

Astro 7 deprecated `markdown.remarkPlugins` / `rehypePlugins` (and the matching `@astrojs/mdx` options) with removal planned in a future major, so notro no longer depends on them. Notion content and static `.mdx` files are compiled with Sätteri, Astro 7's Rust-based Markdown/MDX processor. notro's core pipeline (callout directives, Notion color classes, block/mention component renames, heading slugs, table of contents, page link resolution) is implemented on Sätteri's mdast/hast plugin API and produces output identical to the previous unified pipeline.

Breaking changes:

- Requires Astro >=7.0.0 (`@astrojs/mdx` v7).
- `notro({ remarkPlugins, rehypePlugins })` is removed. Use Sätteri plugins instead: `notro({ mdastPlugins, hastPlugins, features })`.
- `notro({ shikiConfig })` now injects a Sätteri Shiki plugin and requires `shiki` (instead of `@shikijs/rehype`) to be installed.
- The `remark-notro` package is discontinued; its `preprocessNotionMarkdown()` moved into `notro-loader` (exported from both `notro-loader` and `notro-loader/utils`). The remarkNfm plugin itself is superseded by Sätteri's `directive`/`gfm` features plus notro's callout plugin.
- Math rendering: enable `features: { math: true }` and render the math nodes with a Sätteri mdast plugin (see the blog template's `satteriKatex()`) instead of `remark-math` + `rehype-katex`.
- Mermaid diagrams: use `satteri-beautiful-mermaid` (successor of the discontinued `rehype-beautiful-mermaid`).
