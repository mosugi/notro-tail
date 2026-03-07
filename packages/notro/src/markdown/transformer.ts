import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
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
 * Fixes two structural issues in Notion's markdown output:
 *
 * 1. Setext heading prevention:
 *    In CommonMark, a "---" line immediately following non-blank text creates a
 *    setext H2 heading instead of a thematic break (horizontal rule).
 *    Notion uses "---" as dividers between sections, so we insert a blank line
 *    before every "---" to force it to be treated as a thematic break.
 *
 * 2. Callout directive syntax normalization:
 *    Notion's API outputs "::: callout {icon="..." color="..."}" with spaces,
 *    but remark-directive requires ":::callout{...}" (no spaces).
 *    We normalize the opening line of callout directives.
 */
export function preprocessNotionMarkdown(markdown: string): string {
  // Fix 1: Ensure --- dividers have a blank line before them.
  // In CommonMark, a "---" line immediately after non-blank text creates a setext H2
  // heading instead of a thematic break. Adding a blank line forces it to be a <hr>.
  let result = markdown.replace(/([^\n])\n(---+)(\n|$)/g, "$1\n\n$2$3");

  // Fix 2: Normalize callout directive syntax.
  // Notion API: "::: callout {icon="..." color="..."}"
  // remark-directive requires: ":::callout{icon="..." color="..."}"
  result = result.replace(/^::: callout (\{[^}]*\})$/gm, ":::callout$1");

  // Fix 3: Convert block-level color annotations to HTML elements.
  // Notion Enhanced Markdown appends {color="..."} to colored block lines.
  // Convert heading lines with color to raw HTML so colorPlugin can apply CSS classes.
  result = result.replace(
    /^(#{1,6}) (.+?) \{color="([^"]+)"\}$/gm,
    (_, hashes: string, text: string, color: string) => {
      const level = hashes.length;
      return `<h${level} color="${color}">${text}</h${level}>`;
    }
  );
  // Convert paragraph lines with color to raw HTML.
  // Must not match lines starting with HTML tags or heading markers.
  result = result.replace(
    /^([^<#\n][^\n]*?) \{color="([^"]+)"\}$/gm,
    '<p color="$2">$1</p>'
  );

  // Fix 4: Ensure <table_of_contents/> is recognized as a raw HTML block.
  // CommonMark HTML block detection requires tag names matching [A-Za-z][A-Za-z0-9-]*.
  // Underscores (as in "table_of_contents") break this pattern, causing remark to
  // escape the tag as text. Wrapping in <div> forces remark to treat it as HTML.
  result = result.replace(
    /^<table_of_contents\/>$/gm,
    "<div><table_of_contents/></div>"
  );

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
    .use(remarkDirective)
    .use(calloutPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
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
