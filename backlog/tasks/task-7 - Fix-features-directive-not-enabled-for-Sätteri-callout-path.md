---
id: TASK-7
title: "Fix: features.directive not enabled when processor: satteri() is used"
status: To Do
assignee: []
created_date: '2026-06-06'
labels: [bug]
dependencies: [TASK-6]
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Bug

When a user calls `notro({ processor: satteri() })`, `integration.ts` injects
`notroCalloutPlugin` into `processor.options.mdastPlugins`, but **never sets
`processor.options.features.directive = true`**.

Since `features.directive` defaults to `false` in Sätteri, the `:::callout{...}`
syntax is never parsed as a `containerDirective` AST node. The `containerDirective`
visitor in `notroCalloutPlugin` therefore **never fires**, and every callout in
`.mdx` files is silently dropped or rendered as literal text.

## Root cause

`satteri()` initialises features as `{ ...opts.features }`. Without explicit opt-in,
`directive` is absent (= `false`). `@astrojs/mdx`'s Sätteri integration passes this
features object verbatim to `mdxToJs`:

```js
// @astrojs/mdx/dist/satteri/index.js
features: {
  ...satteriOptions.features,  // directive is absent → false
  gfm: ...,
  smartPunctuation: ...
}
```

## Fix

In `integration.ts`, when the Sätteri path is taken, set `directive: true` on the
processor's features object before pushing the plugin. The `satteri()` factory
initialises `options.features` as a plain `{}` specifically so integrations can
mutate it without an `??=` guard (see comment in `processor.js`):

```ts
if (processor != null && isSatteriProcessor(processor)) {
+   // Enable directive parsing so :::callout{...} blocks are parsed as
+   // containerDirective nodes that notroCalloutPlugin can transform.
+   processor.options.features.directive = true;
    processor.options.mdastPlugins.push(notroCalloutPlugin);
    ...
}
```

## Acceptance criteria

- [ ] `processor.options.features.directive = true` is set before the `push()`
- [ ] `:::callout{icon="💡" color="gray_bg"}...:::` in a static `.mdx` file renders
      as a `<callout>` component (not as literal text) when `processor: satteri()`
- [ ] Build passes
<!-- SECTION:DESCRIPTION:END -->
