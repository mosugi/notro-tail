---
"notro-loader": minor
---

Add `processor` option to `notro()` integration for Sätteri support.

- `notro({ processor: satteri() })` opts into Sätteri's Rust-based Markdown pipeline for faster static `.mdx` file builds
- notro automatically injects its callout MDASTP plugin so `:::callout{...}` directives work in `.mdx` files with Sätteri
- `remarkPlugins`, `rehypePlugins`, and `shikiConfig` continue to apply to the Notion content runtime path (`evaluate()`); a warning is emitted if these are set alongside `processor: satteri()` since they do not apply to `.mdx` files under Sätteri
- The default behavior (no `processor` option) is unchanged — notro uses `unified()` with its full remark/rehype pipeline
- Migrate `@astrojs/mdx` configuration from deprecated top-level `remarkPlugins`/`rehypePlugins` to `processor: unified(...)` API (required since `@astrojs/mdx@6.0.0`)
