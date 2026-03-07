import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
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

export type LinkToPages = Record<string, { url: string; title: string }>;

/**
 * Preprocesses Notion Enhanced Markdown before remark parsing.
 *
 * Fixes structural issues in Notion's markdown output that prevent correct
 * parsing by standard CommonMark/GFM parsers:
 *
 * 1. Setext heading prevention:
 *    A "---" line immediately after non-blank text is interpreted as a setext
 *    H2 heading. Notion uses "---" as dividers, so we insert a blank line before
 *    each one to force it to become a <hr> thematic break.
 *
 * 2. Callout directive syntax:
 *    Notion outputs "::: callout {icon="..." color="..."}" with spaces.
 *    remark-directive requires ":::callout{...}" (no spaces).
 *
 * 3. Block-level color annotations:
 *    Lines ending with {color="..."} are converted to raw HTML elements so the
 *    colorPlugin can apply the appropriate CSS class.
 *
 * 4. Table of contents:
 *    CommonMark HTML block detection requires tag names matching [A-Za-z][A-Za-z0-9-]*.
 *    Tags with underscores (like "table_of_contents") are escaped as text instead of
 *    being treated as HTML. Wrapping in <div> forces remark to treat them as HTML.
 *
 * 5. Inline equation format:
 *    Notion outputs inline math as $`E = mc^2`$ (backtick-delimited inside $...$).
 *    remark-math expects standard $E = mc^2$ (no backticks). We strip the backticks.
 *
 * 6. Underscore tags (synced_block):
 *    Same underscore issue as table_of_contents — <synced_block> wraps content
 *    with tab-indented markdown. Strip the wrapper tags and dedent the content
 *    so remark can parse it as normal markdown.
 *
 * 7. Empty block isolation:
 *    <empty-block/> inline within a paragraph becomes a block-level <div> after
 *    mediaPlugin runs, producing invalid HTML (<div> inside <p>). Adding blank
 *    lines around it ensures remark treats it as a standalone HTML block.
 */
export function preprocessNotionMarkdown(markdown: string): string {
  // Fix 1: Ensure --- dividers have a blank line before them.
  let result = markdown.replace(/([^\n])\n(---+)(\n|$)/g, "$1\n\n$2$3");

  // Fix 2: Normalize callout directive syntax.
  result = result.replace(/^::: callout (\{[^}]*\})$/gm, ":::callout$1");

  // Fix 3: Convert block-level color annotations to raw HTML.
  result = result.replace(
    /^(#{1,6}) (.+?) \{color="([^"]+)"\}$/gm,
    (_, hashes: string, text: string, color: string) =>
      `<h${hashes.length} color="${color}">${text}</h${hashes.length}>`
  );
  result = result.replace(
    /^([^<#\n][^\n]*?) \{color="([^"]+)"\}$/gm,
    '<p color="$2">$1</p>'
  );

  // Fix 4: Wrap <table_of_contents/> in <div> so remark treats it as HTML.
  result = result.replace(
    /^<table_of_contents\/>$/gm,
    "<div><table_of_contents/></div>"
  );

  // Fix 5: Convert Notion inline equation format $`...`$ → $...$ for remark-math.
  result = result.replace(/\$`([^`]+)`\$/g, "\\$$1\\$");

  // Fix 6: Strip <synced_block> wrapper tags and dedent content.
  // These tags contain underscores, preventing CommonMark HTML block detection.
  // The content inside is tab-indented; strip the wrapper and dedent so it
  // renders as normal markdown. Also strip any <synced_block_reference> tags
  // that appear inside (they have no display-relevant semantics).
  result = result.replace(
    /^<synced_block(?:\s[^>]*)?>$([\s\S]*?)^<\/synced_block>$/gm,
    (_, content: string) =>
      content
        .replace(/^\t<\/?synced_block_reference(?:\s[^>]*)?\/?>[ \t]*$/gm, "")
        .replace(/^\t/gm, "")
  );

  // Fix 7: Ensure <empty-block/> is treated as a standalone block element.
  // Without blank lines around it, remark places it inline inside a <p>,
  // which mediaPlugin then converts to a <div> — producing invalid HTML.
  result = result.replace(/([^\n])\n(<empty-block\/>)/g, "$1\n\n$2");
  result = result.replace(/(<empty-block\/>)\n([^\n])/g, "$1\n\n$2");

  return result;
}

export async function transformNotionMarkdown(
  markdown: string,
  options?: { linkToPages?: LinkToPages }
): Promise<string> {
  const preprocessed = preprocessNotionMarkdown(markdown);

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(calloutPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(imagePlugin)
    .use(columnsPlugin)
    .use(colorPlugin)
    .use(pageLinkPlugin, { linkToPages: options?.linkToPages ?? {} })
    .use(mediaPlugin)
    .use(tableOfContentsPlugin)
    .use(tablePlugin)
    .use(togglePlugin)
    .use(cleanupPlugin)
    .use(rehypeStringify)
    .process(preprocessed);

  return String(result);
}
