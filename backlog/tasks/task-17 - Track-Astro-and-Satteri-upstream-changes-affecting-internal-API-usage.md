---
id: TASK-17
title: Track Astro and Sätteri upstream changes affecting internal API usage
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [tracking, astro-compat]
dependencies: [TASK-16]
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

TASK-3 tracked the `@astrojs/mdx` deprecated-options removal and is Done. The Sätteri migration introduced **new** dependencies on Astro internals and 0.x packages that need ongoing tracking. This task is the follow-up watch list.

## Internal / unstable API surface notro relies on

| Dependency | Where | Risk |
|---|---|---|
| `mdx({ processor, syntaxHighlight, shikiConfig })` MdxOptions handling | `packages/notro-loader/src/integration.ts` | Shiki highlighting for static `.mdx` relies on `@astrojs/mdx`'s Sätteri path reading `mdxOptions.shikiConfig` — undocumented behavior verified against `@astrojs/mdx@6.0.2`. v7 may change how `processor` and highlighting interact. |
| `__astro_tag_component__(Content, 'astro:jsx')` | `packages/notro-loader/src/utils/compile-mdx.ts` | Internal Astro API used to register evaluate() output as an `astro:jsx`-rendered component. No semver guarantee; a rename or signature change breaks all Notion content rendering at runtime. |
| `updateConfig({ integrations: [...] }) as any` | `packages/notro-loader/src/integration.ts` | Relies on Astro's config-setup loop re-checking the integrations array length so the injected MDX integration's own hook runs. Cast hides type drift between Astro and `@astrojs/mdx`. |
| `notionImageService` wrapping the Sharp service | `packages/notro-loader/image-service.ts` | Wraps Astro's built-in image service module path/exports; both have changed across Astro majors before. |
| `@astrojs/markdown-satteri@^0.2.2`, `satteri@^0.8.0` | `packages/notro-loader/package.json` | 0.x packages — minor bumps are allowed to break. `MdastPluginDefinition` / `HastPluginDefinition` types and the `features.directive` option are all pre-1.0 API. |

## Process

On each Astro minor release (and any `@astrojs/mdx` / `satteri` / `@astrojs/markdown-satteri` release):

1. Update root and template lockfiles, run `pnpm run build` and `pnpm --filter notro-loader test`
2. Re-verify Shiki output appears in built HTML for static `.mdx` pages (the `astro-code` class check)
3. Re-verify Notion content renders (the evaluate() / `astro:jsx` path) on the blog template
4. If anything in the table above changed upstream, file a dedicated task with the migration plan

## Acceptance criteria

- [ ] Renovate or Dependabot configured to open PRs for `astro`, `@astrojs/mdx`, `@astrojs/markdown-satteri`, and `satteri` updates (grouped per release)
- [ ] The verification steps above are written into `CLAUDE.md` or a CI workflow triggered by those update PRs
- [ ] Astro 7.0 / `@astrojs/mdx` v7 breaking-change review completed when released (file follow-up tasks as needed)
- [ ] `satteri` 1.0 / `@astrojs/markdown-satteri` 1.0 API review completed when released
<!-- SECTION:DESCRIPTION:END -->
