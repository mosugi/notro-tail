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

// Parses raw tab-indented markdown text (from Notion toggle content)
// through a mini unified pipeline and returns the resulting hast nodes.
async function parseToggleContent(rawText: string): Promise<RootContent[]> {
  // Strip leading tab indentation inserted by Notion's markdown format
  const dedented = rawText
    .replace(/^\n/, "")
    .split("\n")
    .map((line) => (line.startsWith("\t") ? line.slice(1) : line))
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

  // Re-parse the generated HTML string into hast nodes
  const htmlString = String(result);
  const parsed = fromHtml(htmlString, { fragment: true });
  return parsed.children as RootContent[];
}

// Processes Notion toggle blocks (<details>/<summary>):
// 1. Adds the nt-toggle-block CSS class.
// 2. Parses tab-indented markdown content inside the toggle into proper HTML.
//    Notion's Enhanced Markdown uses raw HTML <details>/<summary> elements,
//    with the inner content as tab-indented text (not parsed as markdown).
//    This plugin re-parses that content so bullets, bold, etc. render correctly.
export const togglePlugin: Plugin<[], Root> = () => {
  return async (tree) => {
    const tasks: Array<() => Promise<void>> = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "details") return;

      // Add nt-toggle-block class
      const existing = node.properties?.class ?? "";
      const classes = [existing, "nt-toggle-block"].filter(Boolean).join(" ");
      node.properties = { ...node.properties, class: classes };

      // Collect text nodes that come after the <summary> element.
      // These contain the tab-indented markdown content.
      let summaryFound = false;
      const textContentParts: string[] = [];
      const textNodeIndices: number[] = [];

      node.children.forEach((child, i) => {
        if (
          child.type === "element" &&
          (child as Element).tagName === "summary"
        ) {
          summaryFound = true;
          return;
        }
        if (summaryFound && child.type === "text") {
          const text = (child as Text).value;
          if (text.trim()) {
            textContentParts.push(text);
            textNodeIndices.push(i);
          }
        }
      });

      if (textContentParts.length === 0) return;

      const rawText = textContentParts.join("");

      tasks.push(async () => {
        const parsedChildren = await parseToggleContent(rawText);

        // Replace text nodes with parsed hast children.
        // Remove all the original text nodes first, then insert parsed content.
        const summaryIndex = node.children.findIndex(
          (c) => c.type === "element" && (c as Element).tagName === "summary"
        );

        // Keep only <summary> (and any non-text children before it)
        const newChildren = node.children.filter(
          (child, i) =>
            i <= summaryIndex ||
            (child.type !== "text" && !textNodeIndices.includes(i))
        );

        // Append parsed markdown content
        node.children = [...newChildren, ...parsedChildren];
      });
    });

    // Execute all async tasks sequentially to avoid mutation conflicts
    for (const task of tasks) {
      await task();
    }
  };
};
