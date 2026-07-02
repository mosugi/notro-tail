/**
 * Sätteri plugin pipeline for Notion Enhanced Markdown.
 *
 * Astro 7 ships Sätteri, a Rust-based Markdown/MDX processor, as the default.
 * This module ports notro's unified (remark/rehype) pipeline from
 * mdx-pipeline.ts to Sätteri's mdast/hast plugin API so Notion content can be
 * compiled through Sätteri's faster native parser.
 *
 * The port mirrors mdx-pipeline.ts plugin-for-plugin:
 *
 *   unified pipeline                     → Sätteri pipeline
 *   ─────────────────────────────────────────────────────────────────────
 *   remarkNfm (preprocess)               → preprocessNotionMarkdown() call
 *                                          before evaluate (compile-mdx.ts)
 *   remarkNfm (directive syntax)         → features.directive
 *   remarkNfm (strikethrough/task list)  → features.gfm
 *   remarkNfm (callout conversion)       → calloutPlugin (mdast)
 *   rehypeRaw                            → not needed: Sätteri's MDX parser
 *                                          emits raw HTML as MDX JSX nodes
 *   rehypeNotionColorPlugin              → colorPlugin (hast)
 *   rehypeBlockElementsPlugin            → renamePlugin (hast)
 *   rehypeInlineMentionsPlugin           → renamePlugin (hast)
 *   rehypeSlug                           → slugPlugin (hast, github-slugger)
 *   rehypeTocPlugin                      → slugPlugin + tocInjectPlugin
 *                                          (Sätteri walks once per plugin, so
 *                                          the two-pass TOC becomes two
 *                                          plugins sharing ctx.data)
 *   resolvePageLinksPlugin               → pageLinksPlugin (hast)
 *
 * Replacement semantics: Sätteri applies queued mutations at the end of each
 * plugin's walk, and transforms queued on descendants of a replaced node are
 * dropped. Plugins that replace nodes (callout, colors, renames) therefore
 * transform the entire cloned subtree at the topmost matching node and skip
 * nodes whose ancestors already match, instead of relying on per-descendant
 * visits.
 *
 * User-provided remark/rehype plugins are NOT supported here — when the user
 * configures notro({ remarkPlugins / rehypePlugins / shikiConfig }), the
 * runtime falls back to the unified pipeline (see compile-mdx.ts).
 */

import GithubSlugger from "github-slugger";
import {
  defineMdastPlugin,
  defineHastPlugin,
  type Features,
  type MdastPluginInput,
  type HastPluginInput,
  type MdastNode,
  type HastNode,
  type MdxJsxAttributeUnion,
  type MdxJsxFlowElementHast,
  type MdxJsxTextElementHast,
} from "satteri";
import type { LinkToPages } from "../types.ts";

// Loosely-typed tree node for deep subtree transforms. Sätteri's HastNode /
// MdastNode unions don't allow uniform child traversal, so the deep helpers
// treat nodes structurally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

type MdxJsxHast = MdxJsxFlowElementHast | MdxJsxTextElementHast;

function isMdxJsxNode(node: AnyNode): boolean {
  return (
    node?.type === "mdxJsxFlowElement" || node?.type === "mdxJsxTextElement"
  );
}

// ── Feature flags ──────────────────────────────────────────────────────────

/**
 * Sätteri parser features matching remarkNfm's syntax support:
 * - directive: `:::callout{...}` container blocks
 * - gfm: strikethrough + task lists (+ tables). Footnotes are disabled for
 *   parity with the unified pipeline, which never enabled them.
 */
export const NOTRO_SATTERI_FEATURES: Features = {
  directive: true,
  gfm: { footnotes: false },
};

// ── Shared color tables (mirror of mdx-pipeline.ts) ───────────────────────

const NOTION_TEXT_CLASSES: Record<string, string> = {
  gray: "text-[var(--notro-gray)]",
  brown: "text-[var(--notro-brown)]",
  orange: "text-[var(--notro-orange)]",
  yellow: "text-[var(--notro-yellow)]",
  green: "text-[var(--notro-green)]",
  blue: "text-[var(--notro-blue)]",
  purple: "text-[var(--notro-purple)]",
  pink: "text-[var(--notro-pink)]",
  red: "text-[var(--notro-red)]",
};

const NOTION_BG_CLASSES: Record<string, string> = {
  gray: "bg-[var(--notro-gray-bg)]",
  brown: "bg-[var(--notro-brown-bg)]",
  orange: "bg-[var(--notro-orange-bg)]",
  yellow: "bg-[var(--notro-yellow-bg)]",
  green: "bg-[var(--notro-green-bg)]",
  blue: "bg-[var(--notro-blue-bg)]",
  purple: "bg-[var(--notro-purple-bg)]",
  pink: "bg-[var(--notro-pink-bg)]",
  red: "bg-[var(--notro-red-bg)]",
};

function notionColorToClass(color: string): string {
  if (!color || color === "default") return "";
  if (color.endsWith("_bg")) {
    return NOTION_BG_CLASSES[color.slice(0, -3)] ?? "";
  } else if (color.endsWith("_background")) {
    return NOTION_BG_CLASSES[color.slice(0, -"_background".length)] ?? "";
  }
  return NOTION_TEXT_CLASSES[color] ?? "";
}

// ── Rename maps (mirror of mdx-pipeline.ts) ────────────────────────────────

const NOTION_BLOCK_RENAMES = new Map<string, string>([
  ["table_of_contents", "TableOfContents"],
  ["video", "Video"],
  ["audio", "Audio"],
  ["file", "FileBlock"],
  ["pdf", "PdfBlock"],
  ["columns", "Columns"],
  ["column", "Column"],
  ["page", "PageRef"],
  ["database", "DatabaseRef"],
  ["details", "Details"],
  ["summary", "Summary"],
  ["empty-block", "EmptyBlock"],
  ["table", "TableBlock"],
  ["thead", "TableHead"],
  ["tbody", "TableBody"],
  ["colgroup", "TableColgroup"],
  ["col", "TableCol"],
  ["tr", "TableRow"],
  ["th", "TableHeaderCell"],
  ["td", "TableCell"],
]);

const NOTION_MENTION_RENAMES = new Map<string, string>([
  ["mention-user", "MentionUser"],
  ["mention-page", "MentionPage"],
  ["mention-database", "MentionDatabase"],
  ["mention-data-source", "MentionDataSource"],
  ["mention-agent", "MentionAgent"],
  ["mention-date", "MentionDate"],
]);

function renameFor(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return NOTION_BLOCK_RENAMES.get(name) ?? NOTION_MENTION_RENAMES.get(name);
}

// All lowercase names the rename plugin must visit (block + mention).
const RENAME_FILTER = [
  ...NOTION_BLOCK_RENAMES.keys(),
  ...NOTION_MENTION_RENAMES.keys(),
];

// ── Ancestor check helper ──────────────────────────────────────────────────

/**
 * True when some ancestor of `node` satisfies `matches`. Used by replacing
 * plugins to yield to the topmost matching node: Sätteri drops transforms
 * queued on descendants of an already-replaced node, so only the topmost
 * match replaces (and deep-transforms) its subtree.
 */
function hasMatchingAncestor(
  ctx: { parent: (node: AnyNode) => AnyNode | undefined },
  node: AnyNode,
  matches: (node: AnyNode) => boolean,
): boolean {
  let current = ctx.parent(node);
  while (current) {
    if (matches(current)) return true;
    if (current.type === "root") break;
    current = ctx.parent(current);
  }
  return false;
}

// ── mdast: callout directive → <callout> element ───────────────────────────

/** Converts a containerDirective mdast node into a <callout> MDX JSX node. */
function calloutDirectiveToJsx(node: AnyNode): AnyNode {
  const attrs = node.attributes ?? {};
  const attributes: MdxJsxAttributeUnion[] = [];
  if (attrs.color)
    attributes.push({
      type: "mdxJsxAttribute",
      name: "color",
      value: attrs.color,
    });
  if (attrs.icon)
    attributes.push({
      type: "mdxJsxAttribute",
      name: "icon",
      value: attrs.icon,
    });
  return {
    type: "mdxJsxFlowElement",
    name: "callout",
    attributes,
    children: (node.children ?? []).map(deepConvertCallouts),
  };
}

/** Recursively converts nested callout directives inside a cloned subtree. */
function deepConvertCallouts(node: AnyNode): AnyNode {
  if (node?.type === "containerDirective" && node.name === "callout") {
    return calloutDirectiveToJsx(node);
  }
  if (Array.isArray(node?.children)) {
    return { ...node, children: node.children.map(deepConvertCallouts) };
  }
  return node;
}

/**
 * Converts :::callout{icon="💡" color="gray_bg"} container directives into
 * <callout icon color> MDX JSX elements so the component mapping
 * (notionComponents.callout) handles rendering.
 *
 * Equivalent to remarkNfm's callout transform, which sets hName/hProperties
 * on the directive node. Sätteri drops directive nodes it has no handler
 * for, so we replace the node with an MDX JSX element instead. Nested
 * callouts are converted inside the topmost replacement (see module doc).
 */
const calloutPlugin = defineMdastPlugin({
  name: "notro-callout",
  containerDirective(node, ctx) {
    if (node.name !== "callout") return;
    if (
      hasMatchingAncestor(
        ctx,
        node,
        (n) => n.type === "containerDirective" && n.name === "callout",
      )
    ) {
      return; // topmost callout replacement already converts this node
    }
    return calloutDirectiveToJsx(structuredClone(node)) as MdastNode;
  },
  // Sätteri's directive feature has no granular toggle, so enabling
  // container directives (:::callout) also parses inline text directives
  // (`:name`). Notion content never uses them, and colons in plain prose
  // (e.g. "http://localhost:4321" or "10:00") would be eaten as bogus
  // directives. remarkNfm strips the text-directive trigger from micromark
  // for the same reason; here we restore the original source text instead.
  textDirective(node, ctx) {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    // Sätteri's Rust parser reports UTF-8 byte offsets, so slice the source
    // as bytes — String.prototype.slice() would drift on multibyte content.
    const value =
      start != null && end != null
        ? Buffer.from(ctx.source, "utf8").subarray(start, end).toString("utf8")
        : `:${node.name}`;
    return { type: "text", value } as MdastNode;
  },
});

// ── hast: color/underline attributes → CSS classes ─────────────────────────

const COLORABLE_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "span"];

function isColorableName(name: string | null | undefined): boolean {
  return !!name && COLORABLE_TAGS.includes(name);
}

/** Reads a string-valued attribute from an MDX JSX hast node. */
function getMdxAttr(node: MdxJsxHast, name: string): string | undefined {
  const attr = node.attributes?.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  return attr && typeof attr.value === "string" ? attr.value : undefined;
}

/** True when the node carries a color (or span underline) attribute to convert. */
function hasColorTrigger(node: AnyNode): boolean {
  if (isMdxJsxNode(node)) {
    if (!isColorableName(node.name)) return false;
    const color = getMdxAttr(node, "color");
    const underline =
      node.name === "span" && getMdxAttr(node, "underline") === "true";
    return color !== undefined || underline;
  }
  if (node?.type === "element") {
    if (!isColorableName(node.tagName)) return false;
    const props = node.properties ?? {};
    return (
      typeof props.color === "string" ||
      (node.tagName === "span" &&
        (props.underline === "true" || props.underline === true))
    );
  }
  return false;
}

/** Applies the color/underline → class conversion to a single cloned node in place. */
function applyColorTransform(node: AnyNode): void {
  if (isMdxJsxNode(node)) {
    const isSpan = node.name === "span";
    const classesToAdd: string[] = [];
    const attrs: AnyNode[] = Array.isArray(node.attributes)
      ? node.attributes
      : [];
    node.attributes = attrs.filter((attr) => {
      if (attr.type !== "mdxJsxAttribute") return true;
      if (attr.name === "color") {
        const cls = notionColorToClass(String(attr.value ?? ""));
        if (cls) classesToAdd.push(cls);
        return false;
      }
      if (
        isSpan &&
        attr.name === "underline" &&
        String(attr.value) === "true"
      ) {
        classesToAdd.push("underline");
        return false;
      }
      return true;
    });
    if (classesToAdd.length === 0) return;
    const classAttr = node.attributes.find(
      (attr: AnyNode) =>
        attr.type === "mdxJsxAttribute" &&
        (attr.name === "class" || attr.name === "className"),
    );
    if (classAttr) {
      classAttr.value = [String(classAttr.value ?? ""), ...classesToAdd]
        .filter(Boolean)
        .join(" ");
    } else {
      node.attributes.push({
        type: "mdxJsxAttribute",
        name: "class",
        value: classesToAdd.join(" "),
      });
    }
    return;
  }

  if (node?.type === "element") {
    const props = { ...(node.properties ?? {}) } as Record<string, unknown>;
    const isSpan = node.tagName === "span";
    const classes: string[] = [];
    if (typeof props.color === "string") {
      const cls = notionColorToClass(props.color);
      delete props.color;
      if (cls) classes.push(cls);
    }
    if (isSpan && (props.underline === "true" || props.underline === true)) {
      delete props.underline;
      classes.push("underline");
    }
    if (classes.length > 0) {
      const existing = props.className;
      props.className = existing
        ? Array.isArray(existing)
          ? [...existing, ...classes]
          : [String(existing), ...classes]
        : classes;
    }
    node.properties = props;
  }
}

/** Applies the color transform to every matching node in a cloned subtree. */
function deepApplyColors(node: AnyNode): void {
  if (hasColorTrigger(node)) applyColorTransform(node);
  if (Array.isArray(node?.children)) {
    for (const child of node.children) deepApplyColors(child);
  }
}

function makeColorVisit() {
  return {
    filter: COLORABLE_TAGS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(node: AnyNode, ctx: any) {
      if (!hasColorTrigger(node)) return;
      if (hasMatchingAncestor(ctx, node, hasColorTrigger)) return; // topmost handles it
      const clone = structuredClone(node);
      deepApplyColors(clone);
      return clone as HastNode;
    },
  };
}

/**
 * Converts Notion `color` / `underline` attributes to Tailwind CSS-variable
 * classes on both plain hast elements and MDX JSX nodes.
 * Port of rehypeNotionColorPlugin.
 */
const colorPlugin = defineHastPlugin({
  name: "notro-colors",
  element: makeColorVisit(),
  mdxJsxFlowElement: makeColorVisit(),
  mdxJsxTextElement: makeColorVisit(),
});

// ── hast: lowercase Notion elements → PascalCase component names ───────────

/** Renames every matching MDX JSX node in a cloned subtree in place. */
function deepApplyRenames(node: AnyNode): void {
  if (isMdxJsxNode(node)) {
    const renamed = renameFor(node.name);
    if (renamed) node.name = renamed;
  }
  if (Array.isArray(node?.children)) {
    for (const child of node.children) deepApplyRenames(child);
  }
}

function makeRenameVisit() {
  return {
    filter: RENAME_FILTER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(node: AnyNode, ctx: any) {
      if (!renameFor(node.name)) return;
      if (
        hasMatchingAncestor(
          ctx,
          node,
          (n) => isMdxJsxNode(n) && !!renameFor(n.name),
        )
      ) {
        return; // topmost renameable ancestor deep-renames this node
      }
      const clone = structuredClone(node);
      deepApplyRenames(clone);
      return clone as HastNode;
    },
  };
}

/**
 * Renames Notion block/mention elements from lowercase to PascalCase so the
 * MDX compiler emits a components-map lookup (_components.Video) instead of
 * a literal HTML tag. Port of rehypeBlockElementsPlugin +
 * rehypeInlineMentionsPlugin. Sätteri's setProperty writes MDX JSX
 * attributes, not the node name, so renaming replaces the node — nested
 * renameables (e.g. tr/td inside table) are renamed within the topmost
 * replacement.
 */
const renamePlugin = defineHastPlugin({
  name: "notro-renames",
  mdxJsxFlowElement: makeRenameVisit(),
  mdxJsxTextElement: makeRenameVisit(),
});

// ── hast: heading ids (rehype-slug equivalent) + heading collection ────────

const HEADING_TAGS = ["h1", "h2", "h3", "h4"];

type TocHeading = { level: number; id: string; text: string };

declare module "satteri" {
  interface DataMap {
    notroTocHeadings: TocHeading[];
  }
}

/**
 * Adds GitHub-style id attributes to h1–h4 headings and collects them for
 * the TOC plugin. Uses github-slugger — the same library rehype-slug uses —
 * so ids match the unified pipeline. Defined as a factory so the slugger
 * counter resets per document.
 *
 * Note: rehype-slug slugs h1–h6; notro's TOC only reads h1–h4, and Notion
 * markdown never emits h5/h6 headings, so slugging h1–h4 is equivalent for
 * Notion content.
 */
const slugPlugin: HastPluginInput = () => {
  const slugger = new GithubSlugger();
  return defineHastPlugin({
    name: "notro-slugs",
    element: {
      filter: HEADING_TAGS,
      visit(node, ctx) {
        const props = (node.properties ?? {}) as Record<string, unknown>;
        const text = ctx.textContent(node);
        let id =
          typeof props.id === "string" && props.id ? props.id : undefined;
        if (!id) {
          id = slugger.slug(text);
          ctx.setProperty(node, "id", id);
        }
        const headings = (ctx.data.notroTocHeadings ??= []);
        headings.push({
          level: parseInt(node.tagName.slice(1), 10),
          id,
          text,
        });
      },
    },
  });
};

// ── hast: populate <TableOfContents> from collected headings ───────────────

/**
 * Replaces the children of every TableOfContents element (renamed from
 * <table_of_contents/> by renamePlugin) with a <ul> of anchor links.
 * Sätteri plugins each walk the tree once in order, so the heading
 * collection in slugPlugin has completed before this plugin runs — the
 * classic rehype two-pass pattern becomes two sequential plugins sharing
 * ctx.data.
 */
const tocInjectPlugin = defineHastPlugin({
  name: "notro-toc",
  mdxJsxFlowElement: {
    filter: ["TableOfContents"],
    visit(node, ctx) {
      const headings = ctx.data.notroTocHeadings ?? [];
      if (headings.length === 0) return;
      const listItems = headings.map((h) => ({
        type: "element" as const,
        tagName: "li",
        properties: { "data-toc-item": "", "data-toc-level": h.level },
        children: [
          {
            type: "element" as const,
            tagName: "a",
            properties: { href: `#${h.id}`, "data-toc-link": "" },
            children: [{ type: "text" as const, value: h.text }],
          },
        ],
      }));
      return {
        ...structuredClone(node),
        children: [
          {
            type: "element" as const,
            tagName: "ul",
            properties: { "data-toc-list": "" },
            children: listItems,
          },
        ],
      } as HastNode;
    },
  },
});

// ── hast: resolve Notion page/database URLs ────────────────────────────────

function resolveNotionUrl(
  url: string,
  linkToPages: LinkToPages,
): { href: string; isExternal: boolean } {
  // Notion URLs end with the page ID (32-char hex, with or without dashes).
  // endsWith() prevents a shorter ID from matching a longer ID that happens
  // to contain it as a substring. (Mirror of mdx-pipeline.ts.)
  const urlNoDash = url.replace(/-/g, "");
  for (const [pageId, info] of Object.entries(linkToPages)) {
    const idNoDash = pageId.replace(/-/g, "");
    if (urlNoDash === idNoDash || urlNoDash.endsWith(idNoDash)) {
      return { href: `/${info.url}`, isExternal: false };
    }
  }
  return { href: url, isExternal: true };
}

const LINKABLE_MDX_NAMES = [
  "PageRef",
  "DatabaseRef",
  "MentionPage",
  "MentionDatabase",
];

/**
 * Resolves notion.so URLs to site-relative paths using the linkToPages map.
 * Handles <a href> hast elements and the url attribute on PageRef /
 * DatabaseRef / MentionPage / MentionDatabase MDX JSX nodes (already renamed
 * by renamePlugin). Port of resolvePageLinksPlugin. Only uses setProperty
 * (no replacements), so nested nodes are safe to mutate directly.
 */
function makePageLinksPlugin(linkToPages: LinkToPages): HastPluginInput {
  const mdxVisit = {
    filter: LINKABLE_MDX_NAMES,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(node: AnyNode, ctx: any) {
      const url = getMdxAttr(node, "url");
      if (!url) return;
      const { href } = resolveNotionUrl(url, linkToPages);
      if (href !== url) {
        // setProperty on MDX JSX nodes writes the named attribute.
        ctx.setProperty(node, "url", href);
      }
    },
  };
  return defineHastPlugin({
    name: "notro-page-links",
    element: {
      filter: ["a"],
      visit(node, ctx) {
        const rawHref = node.properties?.href;
        const href = typeof rawHref === "string" ? rawHref : undefined;
        if (!href?.includes("notion.so")) return;
        const { href: resolved, isExternal } = resolveNotionUrl(
          href,
          linkToPages,
        );
        if (!isExternal) {
          ctx.setProperty(node, "href", resolved);
        }
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mdxJsxFlowElement: mdxVisit as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mdxJsxTextElement: mdxVisit as any,
  });
}

// ── Plugin bundle factory ──────────────────────────────────────────────────

export type SatteriPlugins = {
  mdastPlugins: MdastPluginInput[];
  hastPlugins: HastPluginInput[];
  features: Features;
};

/**
 * Returns the Sätteri plugin configuration for Notion MDX. Counterpart of
 * buildMdxPlugins() in mdx-pipeline.ts for the Sätteri processor.
 */
export function buildSatteriPlugins(linkToPages: LinkToPages): SatteriPlugins {
  return {
    mdastPlugins: [calloutPlugin],
    hastPlugins: [
      // Convert Notion color/underline attributes to CSS classes.
      colorPlugin,
      // Rename Notion block/mention elements to PascalCase for the
      // components map.
      renamePlugin,
      // Add heading ids and collect headings (rehype-slug equivalent).
      slugPlugin,
      // Populate TableOfContents from the collected headings.
      tocInjectPlugin,
      // Resolve notion.so links via the linkToPages map.
      makePageLinksPlugin(linkToPages),
    ],
    features: NOTRO_SATTERI_FEATURES,
  };
}

/**
 * Sätteri plugins without a linkToPages map — used by the notro() integration
 * for static .mdx files, where no Notion link resolution is possible.
 */
export function buildStaticSatteriPlugins(): SatteriPlugins {
  return buildSatteriPlugins({});
}
