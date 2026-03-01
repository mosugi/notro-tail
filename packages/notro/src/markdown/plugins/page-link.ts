import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";
import type { LinkToPages } from "../transformer.ts";

type Options = {
  linkToPages: LinkToPages;
};

// Resolves a Notion page/database URL to an internal path or external URL.
function resolveNotionUrl(
  url: string,
  linkToPages: LinkToPages,
): { href: string; title?: string; isExternal: boolean } {
  for (const [pageId, info] of Object.entries(linkToPages)) {
    if (url.includes(pageId.replace(/-/g, ""))) {
      return { href: `/${info.url}`, title: info.title, isExternal: false };
    }
  }
  return { href: url, isExternal: true };
}

// Transforms Notion link and mention tags into standard <a> or <span> elements:
// - <page url="..."> → <a class="nt-page-link">
// - <database url="..."> → <a class="nt-database-link">
// - <mention-page url="..."> → <a class="nt-mention-page">
// - <mention-database url="..."> → <a class="nt-mention-database">
// - <mention-date>, <mention-user>, <mention-*> → <span class="nt-mention-...">
export const pageLinkPlugin: Plugin<[Options], Root> = (options) => {
  const { linkToPages } = options;

  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "page" || node.tagName === "database") {
        const cssClass = `nt-${node.tagName}-link`;
        const url = node.properties?.url as string | undefined;

        if (!url) {
          node.tagName = "span";
          node.properties = { class: `${cssClass}-broken` };
          return;
        }

        const { href, title, isExternal } = resolveNotionUrl(url, linkToPages);
        node.tagName = "a";
        node.properties = {
          href,
          class: cssClass,
          ...(title ? { title } : {}),
          ...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        };
        return;
      }

      if (node.tagName.startsWith("mention-")) {
        const mentionType = node.tagName.slice("mention-".length);
        const url = node.properties?.url as string | undefined;

        if (
          (mentionType === "page" || mentionType === "database") &&
          url
        ) {
          const { href, isExternal } = resolveNotionUrl(url, linkToPages);
          node.tagName = "a";
          node.properties = {
            href,
            class: `nt-mention-${mentionType}`,
            ...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {}),
          };
        } else {
          node.tagName = "span";
          node.properties = {
            ...node.properties,
            class: `nt-mention-${mentionType}`,
          };
        }
      }
    });
  };
};
