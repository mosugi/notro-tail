# satteri-beautiful-mermaid

A [Sätteri](https://satteri.bruits.org/) hast plugin that renders ```` ```mermaid ```` code blocks to inline SVG at build time, using [beautiful-mermaid](https://www.npmjs.com/package/beautiful-mermaid).

Sätteri is the Rust-based Markdown/MDX processor that ships as the default in Astro 7. This package replaces the deprecated `rehype-beautiful-mermaid`, which targeted the remark/rehype (unified) pipeline that Astro 7 deprecated.

## Install

```bash
npm install satteri-beautiful-mermaid beautiful-mermaid
```

`beautiful-mermaid` is an optional peer — when it is not installed, mermaid code blocks are left unchanged so downstream plugins (e.g. a Shiki plugin) can process them as code.

## Usage with notro

```js
// astro.config.mjs
import { notro } from "notro-loader/integration";
import { satteriMermaid } from "satteri-beautiful-mermaid";

export default defineConfig({
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" }, // shiki runs after hastPlugins
      hastPlugins: [satteriMermaid({ theme: "github-dark" })],
    }),
  ],
});
```

## Usage with plain Sätteri

```js
import { markdownToHtml } from "satteri";
import { satteriMermaid } from "satteri-beautiful-mermaid";

const { html } = await markdownToHtml(source, {
  hastPlugins: [satteriMermaid({ theme: "github-dark" })],
});
```

## Options

| Option | Type | Description |
|---|---|---|
| `theme` | `string` | beautiful-mermaid theme key (e.g. `'github-dark'`, `'default'`) |
| `className` | `string` | CSS class for the wrapper `<div>`. When omitted, a `data-mermaid` attribute is used instead so styling can target `[data-mermaid]` |

## License

MIT
