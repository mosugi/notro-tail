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
// into <notion-callout> custom elements before remark-rehype runs.
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

      // Convert to <div class="nt-callout-block"> for styled output.
      // Use "data-color" so colorPlugin doesn't touch it (avoids inline
      // nt-color-* px-0.5 clobbering the callout's px-4).
      // Use "data-icon" so the icon is exposed as a data attribute for CSS ::before.
      node.data = {
        ...node.data,
        hName: "div",
        hProperties: {
          class: "nt-callout-block",
          "data-color": normalizedColor || undefined,
          "data-icon": icon || undefined,
        },
      };
    });
  };
};
