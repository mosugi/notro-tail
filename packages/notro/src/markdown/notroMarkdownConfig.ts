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

type ExtraClasses = {
  /** Appended to "nt-callout-block" on callout wrapper divs. */
  callout?: string;
  /** Appended to "nt-column-list" on the columns container div. */
  columnList?: string;
  /** Appended to "nt-column" on each column div. */
  column?: string;
  /** Appended to "nt-toggle-block" on toggle details elements. */
  toggle?: string;
};

type NotroMarkdownConfigOptions = {
  linkToPages?: LinkToPages;
  /**
   * Extra CSS classes injected into Notion block wrappers.
   * Each value is appended after the default nt-* class, allowing consumers
   * to add Tailwind utilities or custom classes without overriding the base.
   *
   * @example
   * notroMarkdownConfig({
   *   extraClasses: {
   *     callout: "shadow-sm border",
   *     columnList: "gap-8",
   *   },
   * })
   */
  extraClasses?: ExtraClasses;
};

// Returns the remark and rehype plugin configuration to spread into the
// `markdown` key of astro.config.mjs. Enables full Notion-extended Markdown
// support when using NotionMarkdownRenderer.
//
// Note: Preprocessing (setext heading fix, callout syntax, etc.) is applied
// in the loader before markdown is stored. See loader.ts.
export function notroMarkdownConfig(options: NotroMarkdownConfigOptions = {}) {
  const { linkToPages = {}, extraClasses = {} } = options;

  return {
    remarkPlugins: [
      remarkGfm,
      remarkMath,
      remarkDirective,
      [calloutPlugin, { extraClass: extraClasses.callout }] as const,
    ],
    rehypePlugins: [
      // rehypeRaw must be first to parse raw HTML tags from Notion markdown.
      rehypeRaw,
      // rehypeKatex renders math nodes produced by remark-math.
      rehypeKatex,
      imagePlugin,
      [columnsPlugin, { columnList: extraClasses.columnList, column: extraClasses.column }] as const,
      colorPlugin,
      [pageLinkPlugin, { linkToPages }] as const,
      mediaPlugin,
      tableOfContentsPlugin,
      tablePlugin,
      [togglePlugin, { extraClass: extraClasses.toggle }] as const,
      cleanupPlugin,
    ],
  };
}

export { preprocessNotionMarkdown };
