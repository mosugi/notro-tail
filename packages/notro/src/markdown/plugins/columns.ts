import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

// Transforms layout-related HTML tags in hast:
// - <columns><column> → <div class="nt-column-list"><div class="nt-column">
// - <table fit-page-width> → <table class="nt-table-full-width"> (attribute removed)
export const columnsPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "columns") {
        node.tagName = "div";
        node.properties = { ...node.properties, class: "nt-column-list" };
      } else if (node.tagName === "column") {
        node.tagName = "div";
        node.properties = { ...node.properties, class: "nt-column" };
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
  };
};
