---
"notro-loader": minor
"notro-ui": minor
"remark-notro": patch
---

All Notion table elements now route through the `components` prop.

`rehypeBlockElementsPlugin` now renames all table-related HTML elements from Notion's raw markdown output to PascalCase so that the `components` prop can fully control rendering:

| Raw HTML element | PascalCase component key |
|---|---|
| `<table>` | `TableBlock` |
| `<thead>` | `TableHead` |
| `<tbody>` | `TableBody` |
| `<colgroup>` | `TableColgroup` |
| `<col>` | `TableCol` |
| `<tr>` | `TableRow` |
| `<th>` | `TableHeaderCell` |
| `<td>` | `TableCell` |

`defaultComponents` gains corresponding pass-through entries (renders plain semantic HTML in headless mode).

Standard HTML elements generated from GFM pipe table syntax continue to use lowercase component keys (`table`, `thead`, `tbody`, `tr`, `th`, `td`) — both sets can coexist in a single `components` map.

**`notro-ui`**: Adds `TableHead.astro`, `TableBody.astro`, and `TableHeaderCell.astro` templates.

**`remark-notro`**: Fix 9 now also converts `[text](url)` markdown links inside raw `<th>` cells to `<a>` tags (previously only `<td>` was handled).
