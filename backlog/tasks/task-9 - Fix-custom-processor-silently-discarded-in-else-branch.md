---
id: TASK-9
title: "Fix: non-Sätteri custom processor silently discarded in else branch"
status: Done
assignee: []
created_date: '2026-06-06'
labels: [bug]
dependencies: [TASK-6]
priority: low
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

In `integration.ts`, the processor resolution logic is:

```ts
if (processor != null && isSatteriProcessor(processor)) {
    // Sätteri path
    resolvedProcessor = processor;
} else {
    // Default unified path — but also silently hits here for any non-Sätteri processor!
    resolvedProcessor = unified({ remarkPlugins: [...], rehypePlugins: [...] });
}
```

If a user passes a custom `MarkdownProcessor` that is neither `undefined` nor a Sätteri
processor (e.g. a future third processor, a mock in tests, or the user's own implementation
of the `MarkdownProcessor` interface), the `else` branch silently **discards the passed
processor** and substitutes `unified({...})`.

No warning is emitted. The `NotroOptions.processor` JSDoc only documents `undefined` and
`satteri()` as supported values, but the TypeScript type is `MarkdownProcessor` (the open
interface), which admits any conforming value.

## Fix

Add a console warning in the else branch when `processor != null`:

```ts
} else {
    if (processor != null) {
        console.warn(
            '[notro] processor option was provided but is not a Sätteri processor. ' +
            'Only satteri() from @astrojs/markdown-satteri is supported. ' +
            'The processor has been ignored and unified() will be used instead.'
        );
    }
    resolvedProcessor = unified({ ... });
}
```

Alternatively, restrict the type of `NotroOptions.processor` more narrowly to
`MarkdownProcessor<SatteriResolvedOptions>` from `@astrojs/markdown-satteri`, but
this would require exposing the Sätteri types as a public API contract, which may
not be desirable.

## Acceptance criteria

- [x] Passing a non-Sätteri non-null `processor` emits a console.warn
- [x] Warning message names `satteri()` as the only supported value
- [x] Unified path continues to work when `processor` is `undefined`
<!-- SECTION:DESCRIPTION:END -->
