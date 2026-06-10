---
id: TASK-16
title: Align astro peerDependency and add minimum-version CI guard
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [chore, ci, astro-compat]
dependencies: []
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Background

During the Sätteri migration, Vercel deployments for `notro-blank`, `notro-basics`, and `notro-gallery` failed because of a version skew: `notro-loader` was type-checked against `astro@6.4.4` (which added `flush`/`close` to `AstroIntegrationLogger`), while the templates resolved `astro@6.1.3` from their `^6.0.4` ranges. The immediate fix bumped the templates to `^6.4.4`, but the root cause remains:

- `packages/notro-loader/package.json` declares `peerDependencies: { "astro": ">=6.0.0" }`, which is **inaccurate** — the actual minimum is 6.4.4.
- Nothing in CI verifies that the declared minimum Astro version actually builds. The same class of failure will recur whenever a new Astro minor extends an interface that notro-loader's types reference.

## Goal

Make the declared compatibility range truthful and enforce it in CI, so future Astro releases cannot silently break consumers on older-but-in-range versions.

## Acceptance criteria

- [ ] `packages/notro-loader/package.json` `peerDependencies.astro` raised to `>=6.4.4` (matching the real minimum)
- [ ] Changeset created for the peer dependency change (patch — it documents an existing requirement)
- [ ] CI job (GitHub Actions) that installs the **minimum** supported Astro version (via pnpm override) and runs `astro check` + `astro build` for at least one template, so interface-extension skew is caught before release
- [ ] Document the supported Astro version policy in `CLAUDE.md` (which range is supported, how the minimum is verified)
<!-- SECTION:DESCRIPTION:END -->
