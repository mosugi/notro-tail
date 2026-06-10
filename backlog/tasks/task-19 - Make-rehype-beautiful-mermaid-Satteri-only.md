---
id: TASK-19
title: Make rehype-beautiful-mermaid Sätteri-only
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [refactor, satteri, breaking-change]
dependencies: [TASK-21]
priority: medium
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Superseded by TASK-21.**
> Instead of keeping `rehype-beautiful-mermaid` as a Sätteri-only standalone package, the mermaid plugin will be absorbed into `notro-loader/mermaid` and the package deprecated. See TASK-21 for the full plan.


## Background

`rehype-beautiful-mermaid` currently ships two entry points:

- `.` → unified/rehype plugin (`index.ts`)
- `./satteri` → `satteriMermaidPlugin` (`src/satteri-mermaid.ts`)

and declares **both** `unified: >=11.0.0` and `satteri: >=0.8.0` as required `peerDependencies`, forcing every consumer to install both ecosystems. Within the monorepo only the Sätteri entry point is used (blog template imports `rehype-beautiful-mermaid/satteri`).

**Decision (user-approved):** drop the rehype/unified entry point and make the package Sätteri-only, rather than keeping a dual surface.

## Steps

1. Promote `satteriMermaidPlugin` to the main `.` export; remove the unified/rehype implementation and the `./satteri` subpath (keep it temporarily as an alias re-export if a soft migration window is wanted)
2. Remove `unified` from `peerDependencies` and drop unified-ecosystem dependencies (`unist-util-visit` etc.) that are no longer used; keep `satteri: >=0.8.0`
3. Update `templates/blog/astro.config.mjs` import: `rehype-beautiful-mermaid/satteri` → `rehype-beautiful-mermaid`
4. Update package README with a migration note for existing rehype-pipeline users (last unified-compatible version, what to pin)
5. Update `CLAUDE.md` package table and `notro()` usage examples
6. `pnpm run build` + visual check of a Mermaid page via `pnpm --filter notro-blog run preview`

## Acceptance criteria

- [ ] Main export is the Sätteri HAST plugin; no unified/rehype code remains
- [ ] `peerDependencies` contains only `satteri`; unused unified-ecosystem deps removed
- [ ] Blog template builds and renders Mermaid diagrams (visually verified in preview)
- [ ] README migration note for rehype users
- [ ] `CLAUDE.md` references updated
- [ ] Changeset: `rehype-beautiful-mermaid` **major** (entry point removal)
- [ ] Open question recorded: package rename (name still says "rehype") — decide before publishing the major
<!-- SECTION:DESCRIPTION:END -->
