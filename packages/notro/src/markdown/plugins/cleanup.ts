import type { Plugin } from "unified";
import type { Root, Element, Comment } from "hast";
import { visit, SKIP } from "unist-util-visit";

// Cleans up Notion-specific tags that have no direct equivalent:
// - <unknown .../> → removed (empty comment node)
// - <synced_block_reference> → removed (empty comment node)
// Note: <empty-block/> is handled by mediaPlugin.
export const cleanupPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index == null) return;

      // Note: <empty-block> is handled by mediaPlugin, not here.
      if (
        node.tagName === "unknown" ||
        node.tagName === "synced_block_reference"
      ) {
        const comment: Comment = {
          type: "comment",
          value: ` notion:${node.tagName} `,
        };
        parent.children.splice(index, 1, comment);
        return SKIP;
      }
    });
  };
};
