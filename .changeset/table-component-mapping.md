---
"notro-loader": minor
---

Notion table elements now route through the `components` prop.

`rehypeBlockElementsPlugin` now renames `<table>`, `<colgroup>`, `<col>`, `<tr>`, `<td>` to their PascalCase counterparts (`TableBlock`, `TableColgroup`, `TableCol`, `TableRow`, `TableCell`). This lets the `components` prop (e.g. `notroComponents`) fully control how Notion tables are rendered — including wrapper markup, Tailwind classes, and `data-*` attributes — without requiring CSS overrides on raw HTML elements.

`defaultComponents` gains corresponding pass-through entries so headless mode continues to render plain semantic HTML.
