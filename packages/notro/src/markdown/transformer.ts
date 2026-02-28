import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { calloutPlugin } from "./plugins/callout.ts";
import { columnsPlugin } from "./plugins/columns.ts";
import { colorPlugin } from "./plugins/color.ts";
import { pageLinkPlugin } from "./plugins/page-link.ts";
import { togglePlugin } from "./plugins/toggle.ts";
import { cleanupPlugin } from "./plugins/cleanup.ts";

export type LinkToPages = Record<string, { url: string; title: string }>;

/**
 * Normalize Notion's directive syntax to remark-directive compatible format.
 *
 * Notion outputs directives with spaces and tab-indented nesting:
 *   ::: callout {attrs}       (space between ::: and name)
 *     ::: callout {attrs}     (tab-indented nested directive)
 *     :::
 *   :::
 *
 * remark-directive requires:
 *   :::callout{attrs}         (no space, no indent for nesting)
 *   :::callout{attrs}
 *   :::
 *                             (outer close ::: removed when it contained nested directives)
 */
function normalizeDirectives(markdown: string): string {
  type StackEntry = { tabs: number; hasNestedDirectives: boolean };
  type ResultItem = { content: string; type: "open" | "close" | "text"; matchedOpen?: StackEntry };

  const lines = markdown.split("\n");
  const items: ResultItem[] = [];
  const openStack: StackEntry[] = [];

  for (const line of lines) {
    const m = line.match(/^(\t*)(.*)/s)!;
    const tabs = m[1].length;
    const content = m[2];

    const isOpen = /^:::\s+\w+/.test(content) || /^:::\w+/.test(content);
    const isClose = /^:::$/.test(content);

    if (isOpen) {
      openStack.push({ tabs, hasNestedDirectives: false });
      const normalized = content.replace(
        /^(:{3,})\s+(\w+)\s*(\{[^}]*\})?/,
        (_, c, n, a) => `${c}${n}${a ?? ""}`
      );
      items.push({ content: normalized, type: "open" });
    } else if (isClose && openStack.length > 0) {
      const top = openStack.pop()!;
      if (openStack.length > 0) {
        openStack[openStack.length - 1].hasNestedDirectives = true;
      }
      items.push({ content: ":::", type: "close", matchedOpen: top });
    } else {
      // Strip tab indentation from regular content inside directives
      items.push({ content, type: "text" });
    }
  }

  return items
    .map((item) => {
      // Remove the closing ::: of an outer directive that contained nested directives,
      // since those nested directives are now flattened to the same level.
      if (
        item.type === "close" &&
        item.matchedOpen?.tabs === 0 &&
        item.matchedOpen?.hasNestedDirectives
      ) {
        return null;
      }
      return item.content;
    })
    .filter((x): x is string => x !== null)
    .join("\n");
}

export async function transformNotionMarkdown(
  markdown: string,
  options?: { linkToPages?: LinkToPages }
): Promise<string> {
  const normalized = normalizeDirectives(markdown);
  const result = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(calloutPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(columnsPlugin)
    .use(colorPlugin)
    .use(pageLinkPlugin, { linkToPages: options?.linkToPages ?? {} })
    .use(togglePlugin)
    .use(cleanupPlugin)
    .use(rehypeStringify)
    .process(normalized);

  return String(result);
}
