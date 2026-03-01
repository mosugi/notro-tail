import { unified } from "unified";
import remarkParse from "remark-parse";
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
import { togglePlugin } from "./plugins/toggle.ts";
import { cleanupPlugin } from "./plugins/cleanup.ts";

export type LinkToPages = Record<string, { url: string; title: string }>;

export async function transformNotionMarkdown(
  markdown: string,
  options?: { linkToPages?: LinkToPages }
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
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
    .use(togglePlugin)
    .use(cleanupPlugin)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}
