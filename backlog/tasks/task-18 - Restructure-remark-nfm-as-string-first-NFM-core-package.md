---
id: TASK-18
title: Restructure remark-nfm as string-first NFM core package
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [refactor, satteri, breaking-change]
dependencies: [TASK-21]
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Superseded in part by TASK-21.**
> The original plan to expose a `/satteri` entry point from remark-nfm is cancelled — the callout plugin stays in `notro-loader` and the package is deprecated (TASK-21). Only the deprecation work described in TASK-21 step 4 applies here. The restructure as a 3-layer standalone is no longer needed.


## Background

After the Sätteri migration (TASK-10/13), `notro-loader` no longer depends on `remark-nfm`. The Notion runtime path is handled entirely by `notro-loader/src/utils/notion-preprocess.ts` (Fix 0–19, 597 lines), which started as an extension of remark-nfm's `transformer.ts` (Fix 0–9, 496 lines). The two implementations are now diverging forks of the same logic, and the published `remark-notro` package is orphaned from the monorepo's actual pipeline.

**Decision (user-approved):** rebuild `remark-nfm` as the string-first core that `notro-loader` re-depends on, instead of deprecating it.

## Target architecture (three layers)

| Layer | Export | Contents | Dependencies |
|---|---|---|---|
| 1. String core | `preprocessNotionMarkdown`, `applyMdxContext` | The Fix 0–19 implementation moved from `notro-loader/src/utils/notion-preprocess.ts` | none |
| 2. remark compat | `remarkNfm` | Existing remark plugin API, reimplemented on top of layer 1 | unified ecosystem (optional peer) |
| 3. Sätteri plugin | `notroCalloutPlugin` | MDASTP callout plugin moved from `notro-loader/src/utils/satteri-plugins.ts` | `satteri` (optional peer) |

Layers 2 and 3 get their own entry points (e.g. `remark-notro/remark`, `remark-notro/satteri`) so consumers install only the peer they use.

## Steps

1. Move `notion-preprocess.ts` + `notion-preprocess.test.ts` into `packages/remark-nfm/src/` as the new core; delete the old `transformer.ts` fix set after porting any behavior the 19-fix version lacks (verify with the existing `transformer.test.ts` cases)
2. Reimplement `remarkNfm` to call the new core for preprocessing (public API unchanged)
3. Move `notroCalloutPlugin` / `buildSatteriMdastPlugins` into a `/satteri` entry point; make `satteri` and `unified` optional via `peerDependenciesMeta`
4. Add `remark-notro: workspace:*` back to `notro-loader` dependencies; replace internal imports; delete the duplicated files from `notro-loader`
5. `notro-loader/src/utils/compile-mdx.ts` and `integration.ts` import from the new entry points
6. Run `pnpm --filter notro-loader test` and `pnpm run build`

## Acceptance criteria

- [ ] Single implementation of `preprocessNotionMarkdown` in the monorepo (no duplicated fix logic)
- [ ] `notro-loader` depends on `remark-notro` via `workspace:*`; the duplicated `notion-preprocess.ts` and `satteri-plugins.ts` are removed from `notro-loader`
- [ ] `remarkNfm` public API unchanged for existing unified-pipeline consumers
- [ ] `unified` and `satteri` peers marked optional in `peerDependenciesMeta`
- [ ] All existing tests pass (`remark-nfm` transformer tests ported or superseded; `notro-loader` 46 tests green)
- [ ] `pnpm run build` passes for the blog template
- [ ] Changesets: `remark-notro` minor (new entry points), `notro-loader` patch (internal refactor)
- [ ] Open question recorded: rename npm package `remark-notro` → directory name `remark-nfm` (or a non-remark name reflecting the string-first design) — decide before publishing
<!-- SECTION:DESCRIPTION:END -->
