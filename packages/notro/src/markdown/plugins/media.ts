import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

// Transforms Notion-specific media tags into standard HTML elements.
// - <audio src="..."> → <audio controls src="...">
// - <video src="..."> → <video controls src="...">
// - <file src="...">label</file> → <a class="nt-file-link" href="...">label</a>
// - <pdf src="...">label</pdf> → <a class="nt-pdf-link" href="...">label</a>
// - <empty-block/> → <div class="nt-empty-block"></div>
export const mediaPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      const src = node.properties?.src as string | undefined;

      if (node.tagName === "audio") {
        node.properties = { ...(src ? { src } : {}), controls: true };
        return;
      }

      if (node.tagName === "video") {
        node.properties = { ...(src ? { src } : {}), controls: true };
        return;
      }

      if (node.tagName === "file") {
        node.tagName = "a";
        node.properties = {
          href: src ?? "#",
          class: "nt-file-link",
        };
        return;
      }

      if (node.tagName === "pdf") {
        node.tagName = "a";
        node.properties = {
          href: src ?? "#",
          class: "nt-pdf-link",
        };
        return;
      }

      if (node.tagName === "empty-block") {
        node.tagName = "div";
        node.properties = { class: "nt-empty-block" };
        node.children = [];
      }
    });
  };
};
