---
id: TASK-21
title: Consolidate packages into notro-loader and deprecate remark-notro + rehype-beautiful-mermaid
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [refactor, satteri, breaking-change]
dependencies: []
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Decision

With Sätteri as the sole pipeline, the two peripheral packages exist only to serve `notro-loader`. Keeping them as separately versioned packages creates cross-package peer dependency skew (both need `satteri: >=0.8.0`, and both drifted from `notro-loader` during TASK-10/13). The breaking pivot is the right moment to collapse these boundaries.

Supersedes TASK-18 (remark-nfm restructure as 3-layer package — no longer needed) and TASK-19 (rehype-beautiful-mermaid as Sätteri-only standalone — absorbed instead).

## Target package structure (post-consolidation)

| Package | Fate | Notes |
|---|---|---|
| `notro-loader` | Expanded | Absorbs mermaid plugin; string preprocessing already internal |
| `notro-ui` | Unchanged | Copy-and-own CLI, independent concern |
| `create-notro` | Updated | Import paths in scaffolded templates change |
| `notro-md-sync` | Unchanged | Separate use case |
| `remark-notro` | Deprecated | Publish one final shim release pointing to `notro-loader`; archive repo dir |
| `rehype-beautiful-mermaid` | Deprecated | Publish one final shim release pointing to `notro-loader/mermaid`; archive repo dir |

## Steps

### 1. Absorb mermaid plugin into notro-loader

- Copy `packages/rehype-beautiful-mermaid/src/satteri-mermaid.ts` into `packages/notro-loader/src/mermaid.ts`
- Add `./mermaid` entry point to `packages/notro-loader/package.json` exports:
  ```json
  "./mermaid": "./mermaid.ts"
  ```
- Add root `packages/notro-loader/mermaid.ts` barrel file
- Remove `rehype-beautiful-mermaid` from `templates/blog/package.json`; update `astro.config.mjs` import:
  ```diff
  -import { satteriMermaidPlugin } from "rehype-beautiful-mermaid/satteri";
  +import { satteriMermaidPlugin } from "notro-loader/mermaid";
  ```
- `hast-util-from-html-isomorphic`, `hast-util-to-string`, `unist-util-visit` that were in rehype-beautiful-mermaid's deps: move to notro-loader deps if not already there

### 2. Confirm string preprocessing is already fully internal

`preprocessNotionMarkdown` / `applyMdxContext` already live in `notro-loader/src/utils/notion-preprocess.ts` (Fix 0–19). The `remark-notro` package has an older fork (Fix 0–9). No code needs to move — just deprecate.

### 3. Verify notroCalloutPlugin stays in notro-loader

Already at `notro-loader/src/utils/satteri-plugins.ts`. No movement needed.

### 4. Deprecate remark-notro

- Publish a final `remark-notro@0.0.12` whose `index.ts` re-exports from `notro-loader` with a deprecation warning comment, or simply publish with `npm deprecate remark-notro "Merged into notro-loader. Import preprocessNotionMarkdown from notro-loader/utils."`
- Update `packages/remark-nfm/package.json` with `"deprecated": "Merged into notro-loader"`
- Archive `packages/remark-nfm/` (move to `packages/archive/remark-nfm/` or add a root-level `DEPRECATED.md`)

### 5. Deprecate rehype-beautiful-mermaid

- Publish a final `rehype-beautiful-mermaid@0.2.0` that re-exports from `notro-loader/mermaid`
- `npm deprecate rehype-beautiful-mermaid "Merged into notro-loader. Import satteriMermaidPlugin from notro-loader/mermaid."`
- Archive `packages/rehype-beautiful-mermaid/`

### 6. Update downstream

- `templates/blog/astro.config.mjs` — update import (step 1 above)
- `create-notro` scaffolded templates — update any template files that reference the deprecated packages
- `CLAUDE.md` — package table, "Published packages" changeset list, example usage in `notro()` section (covered by TASK-20)

### 7. Changesets

- `notro-loader` **minor** — new `./mermaid` entry point added
- `remark-notro` **patch** — deprecation notice only
- `rehype-beautiful-mermaid` **patch** — deprecation re-export shim

## API surface post-consolidation

```ts
// Main content loader + components (unchanged)
import { loader, NotroContent } from "notro-loader";

// Astro integration (unchanged)
import { notro } from "notro-loader/integration";

// Pure TS utilities (unchanged)
import { preprocessNotionMarkdown } from "notro-loader/utils";

// Mermaid plugin (NEW entry point, replaces rehype-beautiful-mermaid/satteri)
import { satteriMermaidPlugin } from "notro-loader/mermaid";
```

## Acceptance criteria

- [ ] `notro-loader/mermaid` entry point exports `satteriMermaidPlugin` (same API as `rehype-beautiful-mermaid/satteri`)
- [ ] Blog template builds with updated imports; Mermaid diagrams render (visually verified via `pnpm --filter notro-blog run preview`)
- [ ] `rehype-beautiful-mermaid` removed from `templates/blog/package.json` and workspace install
- [ ] `remark-notro` and `rehype-beautiful-mermaid` marked deprecated in their respective `package.json`
- [ ] `pnpm run build` passes; `pnpm --filter notro-loader test` (46 tests) green
- [ ] Changesets created for all three packages
- [ ] CLAUDE.md package table and usage examples updated (or deferred to TASK-20)
<!-- SECTION:DESCRIPTION:END -->
