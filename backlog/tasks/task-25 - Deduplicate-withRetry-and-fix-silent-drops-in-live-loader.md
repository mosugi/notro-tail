---
id: TASK-25
title: Deduplicate withRetry() and fix silent page drops in live-loader
status: To Do
assignee: []
created_date: '2026-06-10'
labels: [refactor, reliability]
dependencies: []
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`withRetry()` is implemented twice with diverging behavior:

| Location | Logger | Signature |
|---|---|---|
| `loader.ts:107–138` | `AstroIntegrationLogger` — logs each retry | `withRetry(label, fn, logger)` |
| `live-loader.ts:33–56` | None — silent | `withRetry(fn)` |

If the retry backoff formula (`RETRY_DELAYS_MS = [1000, 2000, 4000]`) or the retryable status-code list changes, both files must be updated independently. Any divergence is invisible to CI.

Additionally, error handling is inconsistent between the two loaders:

- **`loader.ts`** (build path): catches API errors, logs a warning per page, and continues the build.
- **`live-loader.ts`** (SSR/live path): catches all errors and returns `null` silently (`catch { return null; }`). Users have no way to know why a page disappeared from live results without checking raw server logs.

## Steps

1. Extract `withRetry()` to a shared utility in `packages/notro-loader/src/utils/retry.ts`
   - Signature: `withRetry<T>(fn: () => Promise<T>, opts: { label?: string; logger?: { warn: (m: string) => void }; delays?: number[] }): Promise<T>`
   - `delays` defaults to `[1000, 2000, 4000]`
   - Logs retries only when `opts.logger` is provided
2. Replace both implementations with `import { withRetry } from '../utils/retry.ts'`
3. Add at least `warn` logging to `live-loader.ts`'s `fetchPageWithMarkdown` catch block so page failures are visible
4. Add unit tests for `withRetry` in `retry.test.ts` (mock timers with vitest `vi.useFakeTimers()`)

## Acceptance criteria

- [ ] Single `withRetry()` implementation in `src/utils/retry.ts`
- [ ] `loader.ts` and `live-loader.ts` both use the shared implementation
- [ ] Live-loader logs a warning when a page fetch fails (not silent anymore)
- [ ] `retry.test.ts` covers: successful first try, retry on 429/500/503, non-retryable failure on 401/403/404, exhausted retries throw
- [ ] All 46 existing notro-loader tests still pass
<!-- SECTION:DESCRIPTION:END -->
