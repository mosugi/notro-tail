---
id: TASK-2
title: 'Guard MDX pipeline against user''s markdown.processor: satteri() inheritance'
status: To Do
assignee: []
created_date: '2026-06-06 00:13'
labels: []
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

`@astrojs/mdx`'s `processor` option defaults to inheriting `markdown.processor` from the top-level Astro config. If a user sets `markdown.processor: satteri()` for their `.md` files, the MDX pipeline would also switch to Sätteri — which breaks notro because Sätteri doesn't support remark/rehype plugins.

TASK-1 (explicit `processor: unified()`) already fixes this, but this task tracks the intent and adds a test/note.

## What notro depends on that Sätteri cannot provide

- `remarkNfm` — Notion Markdown normalization
- `rehypeRaw` — raw HTML passthrough for Notion custom elements
- `rehypeBlockElementsPlugin` — lowercase → PascalCase rename for MDX component map
- `rehypeNotionColorPlugin` — Notion color attrs → Tailwind classes
- `rehypeSlug` / `rehypeTocPlugin` — heading IDs and TOC

## Acceptance criteria

- [ ] `notro()` integration always emits `processor: unified()` explicitly, regardless of the user's top-level `markdown.processor`
- [ ] Add a comment in `integration.ts` explaining why `extendMarkdownConfig: false` and explicit `processor: unified()` are both needed
- [ ] Document this behavior in NotroOptions JSDoc
<!-- SECTION:DESCRIPTION:END -->
