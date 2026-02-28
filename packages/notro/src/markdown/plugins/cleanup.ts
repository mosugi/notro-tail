import type { Plugin } from "unified";
import type { Root, Element, Comment } from "hast";
import { visit, SKIP } from "unist-util-visit";

// Cleans up Notion-specific tags that have no direct equivalent:
// - <empty-block/> → removed (empty comment node)
// - <unknown .../> → removed
// - <synced_block_reference> → removed
// - <synced_block url="..."> → unwrapped (render children as-is)
export const cleanupPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index == null) return;

      if (
        node.tagName === "empty-block" ||
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

      // <synced_block url="..."> → render children directly
      if (node.tagName === "synced_block") {
        parent.children.splice(index, 1, ...node.children);
        return SKIP;
      }
    });
  };
};
