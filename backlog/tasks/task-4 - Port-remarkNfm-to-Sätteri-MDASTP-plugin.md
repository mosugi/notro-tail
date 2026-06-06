---
id: TASK-4
title: Port remarkNfm to Sätteri MDASTP plugin
status: Done
assignee: []
created_date: '2026-06-06 00:14'
labels: []
dependencies: []
priority: low
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

When Sätteri becomes the default Astro processor, `@astrojs/mdx` will use Sätteri's pipeline for static `.mdx` files. notro currently adds `remarkNfm` to `@astrojs/mdx`, which needs to be ported for Sätteri compatibility.

**Important: scope is static `.mdx` files only.** The Notion content path (`compileMdxForAstro()` → `@mdx-js/mdx`'s `evaluate()`) is completely independent of `@astrojs/mdx` and stays on unified permanently. Only the processing of user-authored `.mdx` files is affected.

## Architecture: why most fixes can't be MDASTP plugins

`transformer.ts` contains `preprocessNotionMarkdown()`, which runs **before the Markdown parser** (it patches `self.parser` in unified). It consists of **Fix 0–Fix 15 string-level regex transformations** applied to raw Markdown text.

Sätteri's MDASTP plugin API runs **after** the Rust parser. There is no pre-parse hook equivalent. However, these fixes exist to handle Notion API's quirky output — and for user-authored `.mdx` files, they are **unnecessary** (users write well-formed Markdown, not Notion API output).

Therefore:
- **`preprocessNotionMarkdown()` does NOT need to be ported** for the `@astrojs/mdx` Sätteri path
- Only the **MDAST-level callout conversion** in `nfm.ts` needs porting

## What actually needs porting

### 1. Callout conversion (MDAST-level, must be ported)

`nfm.ts` transforms `containerDirective` nodes named `"callout"` into `<callout>` hast elements:

```ts
// Current remark transform (nfm.ts:111-131)
visit(tree, "containerDirective", (node) => {
  if (node.name !== "callout") return;
  node.data = {
    hName: "callout",
    hProperties: { color: attrs.color, icon: attrs.icon },
  };
});
```

Sätteri has native directive support (`features: { directive: true }`), so `:::callout{...}` is parsed. The MDASTP visitor needs to rename it to a `<callout>` element:

```ts
import { defineMdastPlugin } from 'satteri'; // or '@astrojs/markdown-satteri'

const notroCalloutPlugin = defineMdastPlugin({
  name: 'notro-callout',
  containerDirective(node, ctx) {
    if (node.name !== 'callout') return;
    // Return as rawHtml or use ctx to rename the node
    const attrs = node.attributes ?? {};
    const attrStr = [
      attrs.color ? `color="${attrs.color}"` : '',
      attrs.icon  ? `icon="${attrs.icon}"`   : '',
    ].filter(Boolean).join(' ');
    return { rawHtml: `<callout${attrStr ? ` ${attrStr}` : ''}>${node.children.map(/* serialize */...)}</callout>` };
  },
});
```

### 2. GFM strikethrough and task list items (native in Sätteri)

`nfm.ts` adds `micromark-extension-gfm-strikethrough` and `micromark-extension-gfm-task-list-item` via `self.data()`. In Sätteri, these are **built-in** and enabled via the GFM feature flag — no porting needed.

### 3. Flow-only directive restriction (verify or reimplement)

`nfm.ts` removes the `text`-level directive trigger from the micromark directive extension to prevent `:` in time strings (e.g. `10:00`) from being mis-parsed as inline directives. Verify whether Sätteri's native directive support has the same issue and whether a workaround is needed.

## Full fix inventory (transformer.ts)

All 15 fixes in `preprocessNotionMarkdown()` are pre-parse string transforms — **none need porting** for the Sätteri `@astrojs/mdx` path:

| Fix | Description | Needs porting? |
|-----|-------------|----------------|
| 0 | Escaped inline math `\$…\$` → `$…$` (migration) | No — user `.mdx` files don't have this |
| 1 | `---` divider setext H2 prevention | No |
| 2 | Callout HTML → directive syntax | No (handled by MDAST callout conversion above) |
| 3 | Block-level color annotations → raw HTML `<p color="...">` | No — this is MDAST handled by `rehypeNotionColorPlugin` |
| 4 | `<table_of_contents/>` wrapping in `<div>` | No |
| 5 | Inline equation `$\`...\`$` → `$...$` | No |
| 6 | `<synced_block>` stripping | No |
| 7 | `<empty-block/>` isolation | No |
| 8 | Block-level HTML closing tag blank line injection | No |
| 9 | Markdown links inside `<td>` → `<a href>` | No |
| 10 | Tab-indented content inside `<details>`/`<column>` dedent | No |
| 11 | LaTeX command backslash restore | No |
| 12 | Blockquote lazy continuation prevention | No |
| 13 | Single `\n` block boundary expansion to `\n\n` | No |
| 15 | `**bold**` → `<strong>` for CJK punctuation workaround | No |

## Acceptance criteria

- [ ] Sätteri MDASTP plugin for callout conversion implemented
- [ ] `:::callout{icon="..." color="..."}` in `.mdx` files renders correctly with Sätteri
- [ ] Verify Sätteri's directive support doesn't mis-parse `:` in time strings (e.g. `10:00`, `18:30`)
- [ ] GFM strikethrough and task list items verified working via Sätteri native GFM feature
- [ ] New package `packages/notro-satteri/` created or added as export in `remark-nfm`
<!-- SECTION:DESCRIPTION:END -->
