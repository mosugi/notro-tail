---
"notro-loader": minor
---

Add Astro 7 compatibility. `notro-loader` now requires Astro >=7.0.0 and uses `@astrojs/mdx` v7. Since Astro 7 defaults Markdown/MDX processing to the Sätteri processor (which does not support remark/rehype plugins), the `notro()` integration now explicitly pins the `unified()` processor from `@astrojs/markdown-remark` for `.mdx` files so that notro's remark/rehype plugin pipeline keeps working. Plain `.md` files are unaffected and keep the project's `markdown.processor` setting.
