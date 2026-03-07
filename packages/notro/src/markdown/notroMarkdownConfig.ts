import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
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
  // Mapping from Notion page IDs to internal site URLs.
  // When provided, <page url="..."> tags in Notion markdown are resolved to
  // internal paths. Without this, page links fall back to external Notion URLs.
  linkToPages?: LinkToPages;
};

// A remark plugin that preprocesses the raw Notion markdown source before
// remark-parse runs. This is needed because Astro's markdown pipeline calls
// remark-parse before any plugins, so structural fixes (like --- dividers and
// callout syntax) must be applied to the raw string via this special approach.
//
// The plugin uses a "compiler" hook to mutate the VFile value (the source string)
// before the AST is built, by wrapping it with a text transformation.
//
// Actually, since Astro runs remarkParse before plugins, we inject a plugin
// that transforms the parsed tree to fix setext heading artifacts.
function remarkPreprocessNotionPlugin() {
  return (_tree: unknown, file: { value: string }) => {
    // This runs after parsing — we cannot fix setext headings post-parse here.
    // Instead, we use the "attacher" phase: the actual preprocessing is done
    // by storing the modified source in the VFile before remark-parse runs.
    // This plugin exists as a marker; actual preprocessing happens in the loader.
    void file;
  };
}
// Note: For Astro Content Collections (entry.render() path), preprocessing
// happens in the loader before markdown is stored. See loader.ts.
// For the standalone transformer path, preprocessing happens in transformer.ts.

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
    remarkPlugins: [remarkGfm, remarkDirective, calloutPlugin],
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
      tablePlugin,
      togglePlugin,
      cleanupPlugin,
    ],
  } as const;
}

export { preprocessNotionMarkdown };
