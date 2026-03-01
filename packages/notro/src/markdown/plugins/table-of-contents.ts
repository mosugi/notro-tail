import type { Plugin } from "unified";
import type { Root, Element, ElementContent } from "hast";
import { visit, SKIP } from "unist-util-visit";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getTextContent(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(getTextContent).join("");
  return "";
}

// Adds IDs to h1-h6 elements (for anchor links) and replaces
// <table_of_contents/> with a generated <nav class="nt-toc"> containing
// an ordered list that links to each heading in document order.
// This plugin must run after all other heading transformations.
export const tableOfContentsPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    // Pass 1: collect headings and assign IDs
    const headings: { id: string; level: number; text: string }[] = [];
    const slugCounts = new Map<string, number>();

    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;

      const level = parseInt(node.tagName[1], 10);
      const text = node.children.map(getTextContent).join("");
      const baseSlug = slugify(text) || `heading-${headings.length + 1}`;

      const count = slugCounts.get(baseSlug) ?? 0;
      const id = count === 0 ? baseSlug : `${baseSlug}-${count}`;
      slugCounts.set(baseSlug, count + 1);

      if (!node.properties?.id) {
        node.properties = { ...node.properties, id };
      }

      headings.push({ id: node.properties!.id as string, level, text });
    });

    // Pass 2: replace <table_of_contents/> with the generated nav
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "table_of_contents" || !parent || index == null) return;

      if (headings.length === 0) {
        const emptyNav: Element = {
          type: "element",
          tagName: "nav",
          properties: { class: "nt-toc nt-toc-empty" },
          children: [],
        };
        parent.children.splice(index, 1, emptyNav);
        return SKIP;
      }

      const listItems: ElementContent[] = headings.map(({ id, level, text }) => ({
        type: "element",
        tagName: "li",
        properties: { class: `nt-toc-item nt-toc-level-${level}` },
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: `#${id}`, class: "nt-toc-link" },
            children: [{ type: "text", value: text }],
          },
        ],
      }));

      const nav: Element = {
        type: "element",
        tagName: "nav",
        properties: { class: "nt-toc", "aria-label": "Table of contents" },
        children: [
          {
            type: "element",
            tagName: "ol",
            properties: { class: "nt-toc-list" },
            children: listItems,
          },
        ],
      };

      parent.children.splice(index, 1, nav);
      return SKIP;
    });
  };
};
