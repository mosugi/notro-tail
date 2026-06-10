---
id: TASK-24
title: Eliminate `as any` casts in loader.ts files-property URL expiry check
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [chore, type-safety]
dependencies: []
priority: low
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`packages/notro-loader/src/loader/loader.ts` lines 59–63 use two `as any[]` casts to iterate over `files`-type Notion properties:

```typescript
for (const prop of Object.values(data.properties ?? {}) as any[]) {
  if (prop?.type !== "files") continue;
  const files = prop.files as any[];
  if (files?.some((f: any) => f.type === "file" && isPresignedUrlExpired(f.file.url)))
```

`data.properties` is typed as `PageWithMarkdownType["properties"]`, which comes from `pageObjectResponseSchema` in `schema.ts`. `PropertyPageObjectResponseType` is a discriminated union on `type`. After the `if (prop?.type !== "files") continue;` guard, TypeScript should be able to narrow `prop` to the `files` variant — but only if the Zod-inferred type is structured as a proper discriminated union.

The `filesPropertyPageObjectResponseSchema` already exists in `schema.ts` (line ~575) and defines the files array type. The `as any` casts bypass this type information entirely, hiding potential type mismatches.

## Steps

1. Check whether `PropertyPageObjectResponseType` is a `z.union([...])` of discriminated objects in `schema.ts` — if so, TypeScript can narrow after the `type !== "files"` guard with no change
2. If the union is not discriminated (e.g. wrapped in `z.record` that loses type info), extract the `files` variant type explicitly and use a type predicate or a cast to the specific schema type instead of `any[]`
3. Remove the two `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments

## Context

The `@ts-expect-error` at `remark-nfm/nfm.ts:53` (for `this` binding in a unified plugin) and the `as any` at `integration.ts:122` (Astro's `updateConfig` type accepts `any[]` but the type definition is wrong) are separate issues — both are legitimate TypeScript limitations that cannot be resolved without upstream changes. This task is scoped only to `loader.ts`.

## Acceptance criteria

- [ ] `loader.ts` lines 59–63: no `as any[]` or `as any` casts remain
- [ ] The change compiles with `tsc --noEmit` (or `pnpm run build`)
- [ ] All 46 existing notro-loader tests still pass
<!-- SECTION:DESCRIPTION:END -->
