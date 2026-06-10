---
id: TASK-10
title: "Replace evaluate() remark/rehype pipeline with string-level MDX preprocessing"
status: Done
assignee: []
created_date: '2026-06-06'
labels: [refactor, breaking-change]
dependencies: []
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Eliminate notro-loader's direct dependencies on remark, rehype, and remark-notro from the Notion content compilation path (`evaluate()`). All Notion-specific AST transformations currently done by remark/rehype plugins are moved into `preprocessNotionMarkdown()` as string-level operations, so `evaluate()` receives clean MDX that compiles without any plugins.

## Current state

`compile-mdx.ts` calls `evaluate()` from `@mdx-js/mdx` with a full plugin pipeline built by `buildMdxPlugins()` in `mdx-pipeline.ts`:

**Remark layer:**
- `remarkNfm` (from `remark-notro`) — directive parser + callout AST conversion

**Rehype layer:**
- `rehype-raw` — converts raw HTML strings into hast nodes, passes through Notion custom elements
- `rehypeNotionColorPlugin` (custom) — converts `color="gray_bg"` attributes to Tailwind classes
- `rehypeBlockElementsPlugin` (custom) — renames `<video>` → `<Video>`, `<table_of_contents>` → `<TableOfContents>`, etc.
- `rehypeInlineMentionsPlugin` (custom) — renames `<mention-user>` → `<MentionUser>`, etc.
- `rehype-slug` — adds `id` attributes to headings
- `rehypeTocPlugin` (custom) — populates `<TableOfContents>` with heading anchor links
- `resolvePageLinksPlugin` (custom) — replaces Notion URLs with internal site paths

**Direct package dependencies to remove:**
- `remark-notro` (workspace:*)
- `rehype-raw`
- `rehype-slug`
- `unist-util-visit`
- `unified` (peer dep — only needed by notro for plugin typing; `@mdx-js/mdx` has its own)

## Implementation plan

Each plugin's responsibility is migrated to `preprocessNotionMarkdown()` (or a new `postprocessNotionMarkdown()` function that runs after `preprocessNotionMarkdown()` and has access to `linkToPages`).

### 1. Callout directive → MDX JSX (replaces remarkNfm callout conversion)

`preprocessNotionMarkdown()` Fix 2 already normalizes `:::callout{...}` syntax. Extend it to fully convert to MDX JSX instead of leaving it for remark to parse:

```
Before (leaves directive syntax for remark):
:::callout{icon="💡" color="gray_bg"}
content
:::

After (valid MDX, no remark directive needed):
<callout icon="💡" color="gray_bg">

content

</callout>
```

`evaluate()` natively handles JSX elements. The `micromark-extension-directive` and `remarkNfm` are no longer needed.

### 2. Color attributes → className (replaces rehypeNotionColorPlugin)

Fix 3 in `preprocessNotionMarkdown()` already converts `{color="gray_bg"} text` → `<p color="gray_bg">text</p>`. Extend the conversion to emit `className` directly:

```
<p color="gray_bg">text</p>   →   <p className="notro-bg-gray">text</p>
<span underline="true">x</span>  →  <span className="underline">x</span>
```

Requires moving the `NOTION_TEXT_CLASSES` / `NOTION_BG_CLASSES` maps from `mdx-pipeline.ts` to `transformer.ts` in `remark-notro` (or a shared constants file).

### 3. Block element renaming (replaces rehypeBlockElementsPlugin)

`NOTION_BLOCK_RENAMES` maps `video → Video`, `table_of_contents → TableOfContents`, etc. Convert these as string transforms on the raw HTML tags in the markdown source:

```
<video src="…">  →  <Video src="…">
</video>          →  </Video>
<table_of_contents/>  →  <TableOfContents/>
```

Care required: use word-boundary-aware regex to avoid matching partial element names.

### 4. Inline mention renaming (replaces rehypeInlineMentionsPlugin)

Same approach as (3): string replace `<mention-user>` → `<MentionUser>`, etc.

### 5. Heading IDs (replaces rehype-slug)

Convert ATX headings to raw HTML with explicit `id` attributes so `evaluate()` produces anchored headings without `rehype-slug`:

```
## My Section Title
```
→
```html
<h2 id="my-section-title">My Section Title</h2>
```

Slug algorithm: lowercase, replace non-alphanumeric with `-`, deduplicate suffixes (`-2`, `-3`, …).

This runs as a post-parse step since it needs the full document to detect duplicates.

### 6. TOC population (replaces rehypeTocPlugin)

After heading ID generation (step 5), collect all `h1`–`h4` headings with their ids and inject the links list as a prop on `<TableOfContents>`:

```
<TableOfContents/>
```
→
```
<TableOfContents links={[
  { id: "intro", text: "Intro", depth: 2 },
  ...
]}/>
```

Alternatively, keep TOC as a client-side component that reads headings from the DOM — no build-time injection needed.

### 7. Page link resolution (replaces resolvePageLinksPlugin)

`resolvePageLinksPlugin` already receives `linkToPages` as a parameter. Port the URL substitution to `postprocessNotionMarkdown(markdown, { linkToPages })` as a string replace over `href="https://notion.so/..."` patterns.

## Breaking changes

`notro({ remarkPlugins, rehypePlugins })` currently applies user-provided plugins to the Notion content `evaluate()` path. After this change:

- `rehypePlugins` on the Notion path — no longer supported; the path produces final MDX with no rehype stage.
- `remarkPlugins` on the Notion path — no longer supported; remark is not run.

For math (`remark-math` + `rehype-katex`): math expressions would need to be handled at string level, or the user opts into Sätteri which has native math support via its MDASTP layer.

This is a **breaking change** → `major` version bump for `notro-loader`.

## Files affected

| File | Change |
|------|--------|
| `packages/remark-nfm/src/transformer.ts` | Add callout-to-JSX conversion, color-to-className, element renaming, heading ID, TOC, page links |
| `packages/notro-loader/src/utils/compile-mdx.ts` | Remove `buildMdxPlugins()` call; pass empty plugin arrays to `evaluate()` |
| `packages/notro-loader/src/utils/mdx-pipeline.ts` | Delete (or keep only for Sätteri-unrelated concerns) |
| `packages/notro-loader/package.json` | Remove `remark-notro`, `rehype-raw`, `rehype-slug`, `unist-util-visit`; remove `unified` peer dep |
| `packages/notro-loader/src/integration.ts` | Remove `remarkPlugins`/`rehypePlugins` options (or deprecate) from `NotroOptions` |

## Acceptance criteria

- [x] `evaluate()` called with `remarkPlugins: []` and `rehypePlugins: []` for Notion content
- [x] Callout blocks render correctly (icon, color, children)
- [x] Notion color annotations render with correct Tailwind classes
- [x] Block elements (Video, Columns, TableOfContents, etc.) render as components
- [x] Inline mentions (MentionUser, MentionDate, etc.) render as components
- [x] Heading anchors work (TOC links navigate to correct headings)
- [x] TableOfContents populates correctly
- [x] Page links resolve to internal URLs
- [x] `remark-notro`, `rehype-raw`, `rehype-slug`, `unist-util-visit` removed from `notro-loader/package.json`
- [x] `pnpm run build` passes
<!-- SECTION:DESCRIPTION:END -->
