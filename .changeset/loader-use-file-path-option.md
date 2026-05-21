---
"notro-loader": patch
---

Add `useFilePath` option to `loader()` to make synthetic `filePath` injection opt-in.

Previously, `loader()` always set a synthetic `filePath` on every store entry to support Starlight's sidebar autogenerate. This was unnecessary overhead for non-Starlight templates and added metadata that standard Astro templates never read.

The new `useFilePath?: boolean` option (default: `false`) moves this behavior behind an explicit opt-in. Pass `useFilePath: true` when using the loader with `@astrojs/starlight`.
