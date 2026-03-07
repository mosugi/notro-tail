import type { Plugin } from "unified";
import type { Root, Element, Text, RootContent } from "hast";
import { visit } from "unist-util-visit";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { fromHtml } from "hast-util-from-html";

// Parses tab-indented markdown content from Notion column blocks.
// Column content is double-indented (two tabs) in Notion's Enhanced Markdown.
async function parseColumnContent(rawText: string): Promise<RootContent[]> {
  const dedented = rawText
    .replace(/^\n/, "")
    .split("\n")
    .map((line) => {
      // Strip up to two leading tabs (column content is double-indented)
      let stripped = line;
      if (stripped.startsWith("\t")) stripped = stripped.slice(1);
      if (stripped.startsWith("\t")) stripped = stripped.slice(1);
      return stripped;
    })
    .join("\n")
    .trim();

  if (!dedented) return [];

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(dedented);

  const htmlString = String(result);
  const parsed = fromHtml(htmlString, { fragment: true });
  return parsed.children as RootContent[];
}

// Transforms layout-related HTML tags in hast:
// - <columns><column> → <div class="nt-column-list"><div class="nt-column">
// - <table fit-page-width> → <table class="nt-table-full-width"> (attribute removed)
//
// Also parses the tab-indented markdown content inside <column> elements,
// since Notion's Enhanced Markdown uses raw HTML for column layouts and the
// inner content is tab-indented text that remark does not parse as markdown.
export const columnsPlugin: Plugin<[], Root> = () => {
  return async (tree) => {
    const tasks: Array<() => Promise<void>> = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName === "columns") {
        node.tagName = "div";
        node.properties = { ...node.properties, class: "nt-column-list" };
      } else if (node.tagName === "column") {
        node.tagName = "div";
        node.properties = { ...node.properties, class: "nt-column" };

        // Collect tab-indented text content inside the column for markdown parsing.
        const textParts: string[] = [];
        const textNodeIndices: number[] = [];

        node.children.forEach((child, i) => {
          if (child.type === "text") {
            const text = (child as Text).value;
            if (text.trim()) {
              textParts.push(text);
              textNodeIndices.push(i);
            }
          }
        });

        if (textParts.length === 0) return;

        const rawText = textParts.join("");
        tasks.push(async () => {
          const parsedChildren = await parseColumnContent(rawText);

          // Replace text nodes with parsed hast content
          node.children = [
            ...node.children.filter((_, i) => !textNodeIndices.includes(i)),
            ...parsedChildren,
          ];
        });
      } else if (
        node.tagName === "table" &&
        node.properties?.["fit-page-width"] !== undefined
      ) {
        const existing = node.properties?.class ?? "";
        const classes = [existing, "nt-table-full-width"]
          .filter(Boolean)
          .join(" ");
        node.properties = { ...node.properties, class: classes };
        delete node.properties["fit-page-width"];
      }
    });

    for (const task of tasks) {
      await task();
    }
  };
};
