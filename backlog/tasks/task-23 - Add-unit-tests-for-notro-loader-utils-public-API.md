---
id: TASK-23
title: Add unit tests for notro-loader/utils public API (getPlainText, getMultiSelect, hasTag, buildLinkToPages)
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [test, chore]
dependencies: []
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The `notro-loader/utils` entry point exports four public functions used in every blog template page:

- `getPlainText(property)` — extracts plain text from any Notion property type
- `getMultiSelect(property)` — returns multi-select options array
- `hasTag(property, tagName)` — checks for a tag in a multi_select property
- `buildLinkToPages(entries, options)` — builds the `linkToPages` map for inter-page link resolution

These functions have **zero tests**. They contain non-trivial conditional logic (10+ type branches in `getPlainText` alone) and are called in every template's `.astro` pages. Regressions here would silently produce broken slug resolution, missing tags, or broken page links without any CI signal.

The related functions `normalizeNotionPresignedUrl` and `markdownHasPresignedUrls` in `notion-url.ts` are already covered by `notion-url.test.ts` (24 tests). This task fills the remaining gap.

## Acceptance criteria

- [ ] `packages/notro-loader/src/utils/notion.test.ts` created alongside `notion.ts`
- [ ] `getPlainText` — at least one test per property type: `rich_text`, `title`, `select`, `multi_select`, `number`, `url`, `email`, `phone_number`, `date`, `unique_id` (with and without prefix), and `undefined`/empty cases
- [ ] `getMultiSelect` — tests for `multi_select` property, non-`multi_select` type, and `undefined`
- [ ] `hasTag` — tests for tag present, tag absent, non-`multi_select` type, and `undefined`
- [ ] `buildLinkToPages` — tests for normal mapping, duplicate ID warning (spy on `console.warn`), empty array
- [ ] All 46 existing notro-loader tests still pass after adding the new file
- [ ] No new dependencies required (vitest is already in `devDependencies`)
<!-- SECTION:DESCRIPTION:END -->
