import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import { calloutPlugin } from "./plugins/callout.ts";
import { columnsPlugin } from "./plugins/columns.ts";
import { colorPlugin } from "./plugins/color.ts";
import { imagePlugin } from "./plugins/image.ts";
import { mediaPlugin } from "./plugins/media.ts";
import { pageLinkPlugin } from "./plugins/page-link.ts";
import { tableOfContentsPlugin } from "./plugins/table-of-contents.ts";
import { tablePlugin } from "./plugins/table.ts";
import { togglePlugin } from "./plugins/toggle.ts";
import { cleanupPlugin } from "./plugins/cleanup.ts";
import { preprocessNotionMarkdown } from "./transformer.ts";
import type { LinkToPages } from "./transformer.ts";

type NotroMarkdownConfigOptions = {
  linkToPages?: LinkToPages;
};

// Returns the remark and rehype plugin configuration to spread into the
// `markdown` key of astro.config.mjs. Enables full Notion-extended Markdown
// support when using NotionMarkdownRenderer.
//
// Note: Preprocessing (setext heading fix, callout syntax, etc.) is applied
// in the loader before markdown is stored. See loader.ts.
export function notroMarkdownConfig(options: NotroMarkdownConfigOptions = {}) {
  const { linkToPages = {} } = options;

  return {
    remarkPlugins: [remarkGfm, remarkMath, remarkDirective, calloutPlugin],
    rehypePlugins: [
      // rehypeRaw must be first to parse raw HTML tags from Notion markdown.
      rehypeRaw,
      // rehypeKatex renders math nodes produced by remark-math.
      rehypeKatex,
      imagePlugin,
      columnsPlugin,
      colorPlugin,
      [pageLinkPlugin, { linkToPages }] as const,
      mediaPlugin,
      tableOfContentsPlugin,
      tablePlugin,
      togglePlugin,
      cleanupPlugin,
    ],
  };
}

export { preprocessNotionMarkdown };
