# remark-notro

## 0.0.11

### Patch Changes

- [#159](https://github.com/mosugi/notro/pull/159) [`082d14f`](https://github.com/mosugi/notro/commit/082d14f34b944560c3eacce9aa40c949d259750d) Thanks [@mosugi](https://github.com/mosugi)! - All Notion table elements now route through the `components` prop.

  `rehypeBlockElementsPlugin` now renames all table-related HTML elements from Notion's raw markdown output to PascalCase so that the `components` prop can fully control rendering:

  | Raw HTML element | PascalCase component key |
  | ---------------- | ------------------------ |
  | `<table>`        | `TableBlock`             |
  | `<thead>`        | `TableHead`              |
  | `<tbody>`        | `TableBody`              |
  | `<colgroup>`     | `TableColgroup`          |
  | `<col>`          | `TableCol`               |
  | `<tr>`           | `TableRow`               |
  | `<th>`           | `TableHeaderCell`        |
  | `<td>`           | `TableCell`              |

  `defaultComponents` gains corresponding pass-through entries (renders plain semantic HTML in headless mode).

  Standard HTML elements generated from GFM pipe table syntax continue to use lowercase component keys (`table`, `thead`, `tbody`, `tr`, `th`, `td`) — both sets can coexist in a single `components` map.

  **`notro-ui`**: Adds `TableHead.astro`, `TableBody.astro`, and `TableHeaderCell.astro` templates.

  **`remark-notro`**: Fix 9 now also converts `[text](url)` markdown links inside raw `<th>` cells to `<a>` tags (previously only `<td>` was handled).

## 0.0.10

### Patch Changes

- [#156](https://github.com/mosugi/notro/pull/156) [`c504849`](https://github.com/mosugi/notro/commit/c504849b2da26bc2872d24cce647ded89a2586cf) Thanks [@mosugi](https://github.com/mosugi)! - Remove `<br>` normalization from `preprocessNotionMarkdown` (Fix 13).

  Previously the preprocessor converted `<br>` to `<br/>` before parsing. This is unnecessary because `rehype-raw` (via parse5, an HTML5-compliant parser) treats both forms identically as void elements. Delegating to `rehype-raw` keeps the preprocessor minimal and avoids redundant string manipulation.

  No behavior change when used with the standard `notro-loader` pipeline, which always includes `rehype-raw`.

## 0.0.9

### Patch Changes

- [#155](https://github.com/mosugi/notro/pull/155) [`2c67a6d`](https://github.com/mosugi/notro/commit/2c67a6da5d406e42e4259a6be13baf3606eb1ef7) Thanks [@mosugi](https://github.com/mosugi)! - Fix: Notion block boundaries now render as separate paragraphs

  **Fix 13 (revised): Block boundary expansion (`\n` → `\n\n`)**
  Notion's Markdown API outputs each block (paragraph, heading, etc.) separated by a
  single `\n`. CommonMark treats a lone `\n` between text lines as a soft break,
  collapsing all consecutive blocks into one `<p>`. This fix expands every single `\n`
  between non-blank lines to `\n\n` so remark produces separate block-level elements,
  matching Notion's intended structure. Fenced code blocks and directive blocks (`:::`)
  are excluded from the expansion. `<br>` (intra-block Shift+Enter) is normalized to
  `<br/>` for correct rehype-raw handling.

- [#153](https://github.com/mosugi/notro/pull/153) [`f26a4c4`](https://github.com/mosugi/notro/commit/f26a4c4c836c742dc2bc7e33d80c7bf39035c18d) Thanks [@mosugi](https://github.com/mosugi)! - Fix: bold markers and line breaks now render correctly in Notion content

  **Fix 13: `<br>` normalized to `<br/>`**
  Notion's Markdown API uses `<br>` (without slash) for inline line breaks
  (e.g. `月曜日<br>10:00～18:00`). Normalized to self-closing `<br/>` for
  correct inline rendering by rehype-raw.

  **Fix 15: `**bold**`converted to`<strong>bold</strong>` in pre-processing**
  CommonMark delimiter run rules silently break `**bold**` rendering when `**`
  is adjacent to CJK close punctuation (e.g. `**『曜日時間固定』**` fails
  because `』` is Unicode category Pf). The Notion API also sometimes outputs
  trailing spaces before the closing `**` (e.g. `**text **`). Pre-converting
  bold markers to `<strong>` tags bypasses both issues. Code spans and fenced
  code blocks are excluded from the conversion.

- [#153](https://github.com/mosugi/notro/pull/153) [`f26a4c4`](https://github.com/mosugi/notro/commit/f26a4c4c836c742dc2bc7e33d80c7bf39035c18d) Thanks [@mosugi](https://github.com/mosugi)! - Fix: colon in time formats (10:00, 18:30) no longer produces spurious `<div></div>` elements

  `micromark-extension-directive` treats `:` (char code 58) as the trigger for
  inline text directives, so time formats like `10:00` were parsed as an inline
  directive named `00` (or `30` etc.), emitting an empty `<div>` element after the
  digit before the colon.

  The fix restricts the directive micromark extension to flow-level constructs
  (container `:::callout` and leaf `::callout`) only, by removing the `text`
  property from the extension object before registering it. Notion content never
  uses inline text directives (`:name[...]`), so this change is safe and has no
  functional impact on Notion rendering.

## 0.0.8

### Patch Changes

- [#151](https://github.com/mosugi/notro/pull/151) [`2cd9bec`](https://github.com/mosugi/notro/commit/2cd9becfe1953a096cb429f4f72a0622f709c51b) Thanks [@mosugi](https://github.com/mosugi)! - Fix: bold markers and line breaks now render correctly in Notion content

  **Fix 13: `<br>` normalized to `<br/>`**
  Notion's Markdown API uses `<br>` (without slash) for inline line breaks
  (e.g. `月曜日<br>10:00～18:00`). Normalized to self-closing `<br/>` for
  correct inline rendering by rehype-raw.

  **Fix 15: `**bold**`converted to`<strong>bold</strong>` in pre-processing**
  CommonMark delimiter run rules silently break `**bold**` rendering when `**`
  is adjacent to CJK close punctuation (e.g. `**『曜日時間固定』**` fails
  because `』` is Unicode category Pf). The Notion API also sometimes outputs
  trailing spaces before the closing `**` (e.g. `**text **`). Pre-converting
  bold markers to `<strong>` tags bypasses both issues. Code spans and fenced
  code blocks are excluded from the conversion.

- [#151](https://github.com/mosugi/notro/pull/151) [`2cd9bec`](https://github.com/mosugi/notro/commit/2cd9becfe1953a096cb429f4f72a0622f709c51b) Thanks [@mosugi](https://github.com/mosugi)! - Fix: colon in time formats (10:00, 18:30) no longer produces spurious `<div></div>` elements

  `micromark-extension-directive` treats `:` (char code 58) as the trigger for
  inline text directives, so time formats like `10:00` were parsed as an inline
  directive named `00` (or `30` etc.), emitting an empty `<div>` element after the
  digit before the colon.

  The fix restricts the directive micromark extension to flow-level constructs
  (container `:::callout` and leaf `::callout`) only, by removing the `text`
  property from the extension object before registering it. Notion content never
  uses inline text directives (`:name[...]`), so this change is safe and has no
  functional impact on Notion rendering.

## 0.0.7

### Patch Changes

- [#149](https://github.com/mosugi/notro/pull/149) [`7e00c19`](https://github.com/mosugi/notro/commit/7e00c193f7971790526729628ab9bc9d98ef44d7) Thanks [@mosugi](https://github.com/mosugi)! - Fix: colon in time formats (10:00, 18:30) no longer produces spurious `<div></div>` elements

  `micromark-extension-directive` treats `:` (char code 58) as the trigger for
  inline text directives, so time formats like `10:00` were parsed as an inline
  directive named `00` (or `30` etc.), emitting an empty `<div>` element after the
  digit before the colon.

  The fix restricts the directive micromark extension to flow-level constructs
  (container `:::callout` and leaf `::callout`) only, by removing the `text`
  property from the extension object before registering it. Notion content never
  uses inline text directives (`:name[...]`), so this change is safe and has no
  functional impact on Notion rendering.

## 0.0.6

### Patch Changes

- [#143](https://github.com/mosugi/notro/pull/143) [`c18342c`](https://github.com/mosugi/notro/commit/c18342c41dbd1b19b09d823a97430f3c669d95ca) Thanks [@mosugi](https://github.com/mosugi)! - fix: convert bare <br> to self-closing <br/> before MDX parsing

  MDX treats `<br>` as a JSX element and requires a closing tag, causing a
  compilation error when Notion markdown contains inline `<br>` tags. Added
  Fix 13 to `preprocessNotionMarkdown` to replace all `<br>` with `<br/>`
  before the MDX pipeline runs.

## 0.0.5

### Patch Changes

- [#140](https://github.com/mosugi/notro/pull/140) [`c2b0670`](https://github.com/mosugi/notro/commit/c2b067077c05c5b1dd2712e0bc7b4f705fc71b57) Thanks [@mosugi](https://github.com/mosugi)! - fix: convert bare <br> to self-closing <br/> before MDX parsing

  MDX treats `<br>` as a JSX element and requires a closing tag, causing a
  compilation error when Notion markdown contains inline `<br>` tags. Added
  Fix 13 to `preprocessNotionMarkdown` to replace all `<br>` with `<br/>`
  before the MDX pipeline runs.

## 0.0.4

### Patch Changes

- [#137](https://github.com/mosugi/notro/pull/137) [`186d8c3`](https://github.com/mosugi/notro/commit/186d8c3f7ff8027f12c2e1a0074ede6ac7daaa10) Thanks [@mosugi](https://github.com/mosugi)! - fix: convert bare <br> to self-closing <br/> before MDX parsing

  MDX treats `<br>` as a JSX element and requires a closing tag, causing a
  compilation error when Notion markdown contains inline `<br>` tags. Added
  Fix 13 to `preprocessNotionMarkdown` to replace all `<br>` with `<br/>`
  before the MDX pipeline runs.

## 0.0.3

### Patch Changes

- [#121](https://github.com/mosugi/notro/pull/121) [`53ac64a`](https://github.com/mosugi/notro/commit/53ac64a0c54af0cfab5b5630a2057b118f14a24e) Thanks [@mosugi](https://github.com/mosugi)! - Fix package name inconsistencies and broken links in README files
  - Fix language selector links in root README.md and README.ja.md
  - Fix broken reference to non-existent `packages/notro/README.md`
  - Correct `notro` references to `notro-loader` in notro-ui README
  - Correct `remark-nfm` npm package name to `remark-notro` in notro-loader README
  - Fix import path `notro/integration` → `notro-loader/integration` in rehype-beautiful-mermaid README
  - Update relationship diagram in remark-nfm README to reference `notro-loader`

## 0.0.2

### Patch Changes

- [#112](https://github.com/mosugi/notro/pull/112) [`9f30d3d`](https://github.com/mosugi/notro/commit/9f30d3d31408ebc678b4257fe9aad51abd4e6de8) Thanks [@mosugi](https://github.com/mosugi)! - Update README to use remark-notro package name
