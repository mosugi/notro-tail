import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

// Notion Enhanced Markdown uses "_bg" suffix for background colors,
// but the canonical CSS class names use "_background".
// e.g. gray_bg → gray_background, blue_bg → blue_background
function normalizeColor(color: string): string {
  return color.endsWith("_bg") ? color.slice(0, -3) + "_background" : color;
}

// Transforms color and annotation attributes on hast elements:
// - <span color="blue">   → <span class="nt-color-blue">
// - <span color="gray_bg"> → <span class="nt-color-gray_background">
// - <span underline="true"> → <span class="nt-annotation-underline">
// - Block elements with color attribute → class="nt-color-..."
export const colorPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      const classes: string[] = [];

      // Collect existing class(es)
      const existing = node.properties?.class;
      if (existing) {
        classes.push(String(existing));
      }

      // Handle color attribute
      const color = node.properties?.color as string | undefined;
      if (color) {
        classes.push(`nt-color-${normalizeColor(color)}`);
        delete node.properties!.color;
      }

      // Handle underline attribute: <span underline="true"> → nt-annotation-underline
      const underline = node.properties?.underline as string | undefined;
      if (underline === "true" || underline === "") {
        classes.push("nt-annotation-underline");
        delete node.properties!.underline;
      }

      if (classes.length > 0) {
        node.properties = { ...node.properties, class: classes.join(" ") };
      }
    });
  };
};
