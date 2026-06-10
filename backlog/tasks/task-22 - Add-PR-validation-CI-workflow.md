---
id: TASK-22
title: Add PR validation CI workflow (test, type-check, build)
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [ci, chore]
dependencies: []
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The repository has only one CI workflow: `.github/workflows/release.yml` (changeset publish on push to `main`). There is no workflow that runs on pull requests. As a result:

- Type errors and test failures can reach `main` undetected
- The build (`astro check + astro build`) is never verified on PRs
- The first signal of a broken build is a failed Vercel deployment (already happened for `notro-blank`, `notro-basics`, `notro-gallery` in this session)

## Proposed workflow: `.github/workflows/ci.yml`

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '>=24.8.0'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test                          # vitest (notro-loader 46 tests)
      - run: pnpm --filter notro-blog run build # astro check + astro build
    env:
      NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
      NOTION_DATASOURCE_ID_BLOG: ${{ secrets.NOTION_DATASOURCE_ID_BLOG }}
```

Notes:
- `pnpm run build` at root already delegates to `pnpm --filter notro-blog run build` which runs `astro check` (TypeScript) + `astro build`
- Notion secrets are required for the build; add them to GitHub Actions environment or use a cached data-store artifact strategy
- Alternatively, run `astro check` only (type-check without fetching live Notion data) as a cheaper gate

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` created and passing on the `main` branch
- [ ] Workflow triggers on PRs to `main`
- [ ] `pnpm test` (vitest) passes in CI
- [ ] TypeScript check (`astro check` or `tsc --noEmit`) passes in CI
- [ ] Build step passes (either with real Notion data via secrets, or with a recorded data-store fixture)
- [ ] README or CONTRIBUTING note on how to run the same checks locally
<!-- SECTION:DESCRIPTION:END -->
