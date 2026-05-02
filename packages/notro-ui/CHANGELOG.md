# notro-ui

## 0.2.0

### Minor Changes

- [#161](https://github.com/mosugi/notro/pull/161) [`5deac91`](https://github.com/mosugi/notro/commit/5deac91cc36708103f6b675d791340a6921e6934) Thanks [@mosugi](https://github.com/mosugi)! - Migrate to pure Tailwind CSS approach, removing all CSS class injection

  ## rehype-beautiful-mermaid

  **Breaking:** The default wrapper for rendered Mermaid SVGs changed from `className="notro-mermaid"` to a `data-mermaid` attribute.

  Before:

  ```html
  <div class="notro-mermaid">...</div>
  ```

  After:

  ```html
  <div data-mermaid>...</div>
  ```

  Style Mermaid diagrams using `[data-mermaid]` selector instead of `.notro-mermaid`. To restore the old behavior, pass `className: 'notro-mermaid'` explicitly:

  ```ts
  rehypeMermaid({ className: "notro-mermaid" });
  ```

  ## notro-loader

  **Breaking:** `rehypeNotionColorPlugin` now injects Tailwind CSS arbitrary value classes instead of `notro-text-*` / `notro-bg-*` utility classes.

  Before: `<p class="notro-text-gray">` / `<p class="notro-bg-gray">`
  After: `<p class="text-[var(--notro-gray)]">` / `<p class="bg-[var(--notro-gray-bg)]">`

  If you had custom CSS targeting `.notro-text-*` or `.notro-bg-*`, update those selectors.

  **Breaking:** `rehypeTocPlugin` now uses data attributes on injected elements instead of CSS classes.

  Before: `class="notro-toc-list"`, `class="notro-toc-item"`, `class="notro-toc-level-N"`, `class="notro-toc-link"`
  After: `data-toc-list`, `data-toc-item`, `data-toc-level="N"`, `data-toc-link`

  ## notro-ui

  **Breaking:** Config file renamed from `notro.json` to `notro.config.json`. Rename your existing config file.

  **Breaking:** Components in `notro.config.json` now track version numbers:

  Before: `{ "components": ["callout", "toggle"] }`
  After: `{ "components": [{ "name": "callout", "version": "0.1.0" }] }`

  Run `notro-ui init` to regenerate the config, then `notro-ui add --all` to re-add components.

  **Breaking:** `notro-text-*` / `notro-bg-*` CSS classes removed from components. Colors are now applied via Tailwind CSS arbitrary values (`text-[var(--notro-gray)]`, `bg-[var(--notro-gray-bg)]`). Remove `.notro-text-*` / `.notro-bg-*` from `global.css` if you had them defined.

  ### New features
  - `notro-ui init` now generates `src/styles/notro.css` with all design tokens
  - `notro-ui add --all` / `notro-ui add -a` adds all available components at once
  - `notro-ui update` is now version-aware and only overwrites components that are outdated
  - `notro-ui list --installed` shows installed versions and highlights outdated components

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
