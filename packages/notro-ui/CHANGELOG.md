# notro-ui

## 0.1.0

### Minor Changes

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

## 0.0.2

### Patch Changes

- [#121](https://github.com/mosugi/notro/pull/121) [`53ac64a`](https://github.com/mosugi/notro/commit/53ac64a0c54af0cfab5b5630a2057b118f14a24e) Thanks [@mosugi](https://github.com/mosugi)! - Fix package name inconsistencies and broken links in README files
  - Fix language selector links in root README.md and README.ja.md
  - Fix broken reference to non-existent `packages/notro/README.md`
  - Correct `notro` references to `notro-loader` in notro-ui README
  - Correct `remark-nfm` npm package name to `remark-notro` in notro-loader README
  - Fix import path `notro/integration` → `notro-loader/integration` in rehype-beautiful-mermaid README
  - Update relationship diagram in remark-nfm README to reference `notro-loader`
