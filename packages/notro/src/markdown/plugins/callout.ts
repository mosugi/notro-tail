import type { Plugin } from "unified";
import type { Root } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import { visit } from "unist-util-visit";

// Notion Enhanced Markdown uses "_bg" suffix for background colors.
// Normalize to "_background" to match CSS class names.
function normalizeColor(color: string): string {
  return color.endsWith("_bg") ? color.slice(0, -3) + "_background" : color;
}

// Transforms :::callout{icon="💡" color="gray_bg"} container directives
// into HTML div elements before remark-rehype runs.
//
// Note: Notion's API outputs "::: callout {icon=...}" with spaces.
// The preprocessNotionMarkdown() function in transformer.ts normalizes
// this to ":::callout{...}" before remark parsing.
export const calloutPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "containerDirective", (node: ContainerDirective) => {
      if (node.name !== "callout") return;

      const attrs = node.attributes ?? {};
      const color = attrs.color ?? "";
      const icon = attrs.icon ?? "";

      const normalizedColor = color ? normalizeColor(color) : "";
      const colorClass = normalizedColor ? ` nt-color-${normalizedColor}` : "";
      const classes = `nt-callout-block${colorClass}`;

      // Convert to HTML using hast-compatible data
      node.data = {
        ...node.data,
        hName: "div",
        hProperties: {
          class: classes,
          "data-callout-icon": icon || undefined,
        },
      };
    });
  };
};
