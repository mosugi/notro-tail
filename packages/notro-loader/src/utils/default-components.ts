import { makeHtmlElement } from "./HtmlElements.ts";

/**
 * Default headless component map for NotroContent.
 *
 * Maps all Notion block types and standard HTML elements to semantic HTML
 * equivalents with no Tailwind classes. Spread and override to customize:
 *
 * @example
 * ```ts
 * import { defaultComponents, NotroContent } from 'notro';
 * // Use as-is for unstyled output:
 * <NotroContent markdown={md} components={defaultComponents} />
 * // Or extend with your own components:
 * <NotroContent markdown={md} components={{ ...defaultComponents, callout: MyCallout }} />
 * ```
 */
export const defaultComponents = {
  // ── Notion block elements (PascalCase) ────────────────────────────────────
  // These use PascalCase keys because MDX only generates a components-map
  // lookup (_jsx(Video, ...)) for PascalCase names. Lowercase names compile
  // as plain HTML string literals (_jsx("video", ...)), which bypass the
  // `components` prop entirely. rehypeBlockElementsPlugin renames the
  // mdxJsxFlowElement nodes to these PascalCase names before MDX compiles.
  TableOfContents:        makeHtmlElement("nav"),
  Video:                  makeHtmlElement("figure"),
  Audio:                  makeHtmlElement("figure"),
  FileBlock:              makeHtmlElement("div"),
  PdfBlock:               makeHtmlElement("figure"),
  Columns:                makeHtmlElement("div"),
  Column:                 makeHtmlElement("div"),
  PageRef:                makeHtmlElement("a"),
  DatabaseRef:            makeHtmlElement("a"),
  Details:                makeHtmlElement("details"),
  Summary:                makeHtmlElement("summary"),
  EmptyBlock:             makeHtmlElement("div"),
  // callout is created by remarkNfm (a remark-level plugin via data.hName),
  // not from raw HTML, so MDX tracks it in _components and lowercase works.
  callout:                makeHtmlElement("aside"),
  // ── Inline mention components (PascalCase) ────────────────────────────────
  // Same PascalCase requirement — rehypeInlineMentionsPlugin renames these.
  MentionUser:            makeHtmlElement("span"),
  MentionPage:            makeHtmlElement("span"),
  MentionDatabase:        makeHtmlElement("span"),
  MentionDataSource:      makeHtmlElement("span"),
  MentionAgent:           makeHtmlElement("span"),
  MentionDate:            makeHtmlElement("time"),

  // ── Table elements (renamed from lowercase by rehypeBlockElementsPlugin) ───
  // Notion outputs raw <table header-row="true">...</table> HTML blocks.
  // rehypeBlockElementsPlugin renames these to PascalCase so the `components`
  // prop can substitute them. Default: pass-through as plain HTML elements.
  TableBlock:        makeHtmlElement("table"),
  TableHead:         makeHtmlElement("thead"),
  TableBody:         makeHtmlElement("tbody"),
  TableColgroup:     makeHtmlElement("colgroup"),
  TableCol:          makeHtmlElement("col"),
  TableRow:          makeHtmlElement("tr"),
  TableHeaderCell:   makeHtmlElement("th"),
  TableCell:         makeHtmlElement("td"),

  // ── Standard HTML element pass-throughs ──────────────────────────────────
  // These lowercase keys override HTML elements generated from markdown syntax
  // (e.g. GFM tables: <thead>, <tbody>, <tr>, <th>, <td>). They are separate
  // from the PascalCase entries above, which handle Notion raw HTML elements
  // renamed by rehypeBlockElementsPlugin.
  span:   makeHtmlElement("span"),
  p:      makeHtmlElement("p"),
  ul:     makeHtmlElement("ul"),
  ol:     makeHtmlElement("ol"),
  li:     makeHtmlElement("li"),
  pre:    makeHtmlElement("pre"),
  hr:     makeHtmlElement("hr"),
  thead:  makeHtmlElement("thead"),
  tbody:  makeHtmlElement("tbody"),
  tr:     makeHtmlElement("tr"),
  th:     makeHtmlElement("th"),
  td:     makeHtmlElement("td"),
  a:      makeHtmlElement("a"),
  strong: makeHtmlElement("strong"),
  em:     makeHtmlElement("em"),
  del:    makeHtmlElement("del"),
} as const;
