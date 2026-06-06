---
id: TASK-8
title: "Fix: buildSatteriMdastPlugins() is dead code — integration.ts pushes notroCalloutPlugin directly"
status: To Do
assignee: []
created_date: '2026-06-06'
labels: [bug, cleanup]
dependencies: [TASK-7]
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`satteri-plugins.ts` exports `buildSatteriMdastPlugins()` with the JSDoc comment
"Returns the MDASTP plugins for the Sätteri pipeline", implying it is the canonical
way to obtain notro's Sätteri plugin list.

However, `integration.ts` bypasses this function entirely and pushes `notroCalloutPlugin`
directly:

```ts
// integration.ts line 182 — BYPASSES buildSatteriMdastPlugins()
processor.options.mdastPlugins.push(notroCalloutPlugin);
```

`grep -r "buildSatteriMdastPlugins" packages/` returns only its own definition —
zero callers.

## Why this matters

When a future developer adds a second Sätteri MDASTP plugin (e.g. a heading-normalization
plugin for Sätteri compatibility), they will add it to `buildSatteriMdastPlugins()` — the
only function that claims to own the plugin list. The integration will never register it.
Silent failure, no error, no test failure.

## Fix (two options)

**Option A — Use the builder in integration.ts (preferred)**:

```ts
// integration.ts
import { buildSatteriMdastPlugins } from './utils/satteri-plugins.ts';

// ...
processor.options.features.directive = true;
for (const plugin of buildSatteriMdastPlugins()) {
    processor.options.mdastPlugins.push(plugin);
}
```

**Option B — Delete `buildSatteriMdastPlugins()` (if the single-plugin case is permanent)**:

Remove the factory function and keep the direct push. Update the comment to clarify
that `notroCalloutPlugin` is the complete plugin list.

Option A is preferred because it makes `satteri-plugins.ts` the single source of
truth for the Sätteri plugin list, and makes adding future plugins mechanical.

## Acceptance criteria

- [ ] `integration.ts` uses `buildSatteriMdastPlugins()` (or the function is removed)
- [ ] Adding a new plugin to `buildSatteriMdastPlugins()` causes it to be registered
- [ ] Build passes
<!-- SECTION:DESCRIPTION:END -->
