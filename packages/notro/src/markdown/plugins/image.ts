import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

// Replaces <img src="..."> src attributes with Astro-optimized image URLs.
// This ensures Notion pre-signed S3 URLs are replaced with stable, optimized
// paths during build rather than being embedded as-is in the HTML output.
//
// Uses a dynamic import of astro:assets so this plugin can be safely imported
// in astro.config.mjs (where the virtual module isn't available at parse time).
export const imagePlugin: Plugin<[], Root> = () => {
  return async (tree) => {
    const { getImage } = await import("astro:assets");
    const promises: Promise<void>[] = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const src = node.properties?.src;
      if (typeof src !== "string" || !src.startsWith("http")) return;

      const promise = getImage({ src, inferSize: true })
        .then((result) => {
          node.properties!.src = result.src;
          if (result.attributes.width != null)
            node.properties!.width = result.attributes.width;
          if (result.attributes.height != null)
            node.properties!.height = result.attributes.height;
        })
        .catch(() => {
          // Keep the original src if optimization fails
        });

      promises.push(promise);
    });

    await Promise.all(promises);
  };
};
