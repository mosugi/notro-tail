import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
import { calloutPlugin } from "./plugins/callout.ts";
import { columnsPlugin } from "./plugins/columns.ts";
import { colorPlugin } from "./plugins/color.ts";
import { imagePlugin } from "./plugins/image.ts";
import { mediaPlugin } from "./plugins/media.ts";
import { pageLinkPlugin } from "./plugins/page-link.ts";
import { tableOfContentsPlugin } from "./plugins/table-of-contents.ts";
import { togglePlugin } from "./plugins/toggle.ts";
import { cleanupPlugin } from "./plugins/cleanup.ts";
import type { LinkToPages } from "./transformer.ts";

type NotroMarkdownConfigOptions = {
  // Mapping from Notion page IDs to internal site URLs.
  // When provided, <page url="..."> tags in Notion markdown are resolved to
  // internal paths. Without this, page links fall back to external Notion URLs.
  linkToPages?: LinkToPages;
};

// Returns the remark and rehype plugin configuration to spread into the
// `markdown` key of astro.config.mjs. This enables full Notion-extended
// Markdown support when using entry.render() with Content Collections.
//
// Usage in astro.config.mjs:
//   import { notroMarkdownConfig } from "notro";
//   export default defineConfig({
//     markdown: notroMarkdownConfig(),
//   });
//
// Note: <page> links are resolved to external Notion URLs unless linkToPages
// is populated. For internal link resolution, use NotionMarkdownRenderer
// (which applies linkToPages at render time).
export function notroMarkdownConfig(options: NotroMarkdownConfigOptions = {}) {
  const { linkToPages = {} } = options;

  return {
    remarkPlugins: [remarkDirective, calloutPlugin],
    rehypePlugins: [
      // rehypeRaw must be first to parse raw HTML tags from Notion markdown
      // into proper hast nodes before other plugins process them.
      rehypeRaw,
      imagePlugin,
      columnsPlugin,
      colorPlugin,
      [pageLinkPlugin, { linkToPages }],
      mediaPlugin,
      tableOfContentsPlugin,
      togglePlugin,
      cleanupPlugin,
    ],
  } as const;
}
