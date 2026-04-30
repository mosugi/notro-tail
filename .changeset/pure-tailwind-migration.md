---
"rehype-beautiful-mermaid": major
"notro-loader": major
"notro-ui": major
---

Migrate to pure Tailwind CSS approach, removing all CSS class injection

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
rehypeMermaid({ className: 'notro-mermaid' })
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
