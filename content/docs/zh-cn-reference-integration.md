---
slug: zh-cn/reference/integration
title: notro() 集成
---

# notro() 集成

`notro()` 是一个 Astro 集成，使用 notro 的核心 remark/rehype 插件管道注册 `@astrojs/mdx`。

## 为什么需要它

`notro()` 有两个必要原因：

1. **`astro:jsx` 渲染器** — `@astrojs/mdx` 注册 `@mdx-js/mdx` 的 `evaluate()` 用于生成 Astro VNode 所依赖的 `astro:jsx` 渲染器。没有它，`NotroContent` 在运行时会失败。
2. **静态 `.mdx` 文件** — 如果你的项目将 `.mdx` 文件与 Notion 内容一起使用，`notro()` 确保它们使用与 Notion 内容相同的插件管道处理。

## 导入

```js
// astro.config.mjs
import { notro } from "notro-loader/integration";
```

> **重要:** 始终从 `notro-loader/integration` 导入，而不是从 `notro-loader`。`/integration` 入口点不导入任何 Astro 组件，因此在 `astro.config.mjs` 中使用是安全的。

## 使用

```js
import { defineConfig } from "astro/config";
import { notro } from "notro-loader/integration";

export default defineConfig({
  integrations: [
    notro(),
  ],
});
```

## 选项

所有选项都是可选的。

```ts
notro({
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  shikiConfig?: Record<string, unknown>;
  viteExternals?: string[];
  extendMarkdownConfig?: boolean;
})
```

### remarkPlugins

在管道中 `remarkNfm` 之后追加的 remark 插件。

```js
import remarkMath from "remark-math";

notro({
  remarkPlugins: [remarkMath],
})
```

插件按提供的顺序追加。

### rehypePlugins

在管道中 `rehypeShiki`（如果已配置）之前插入的 rehype 插件。

```js
import rehypeKatex from "rehype-katex";
import { rehypeMermaid } from "rehype-beautiful-mermaid";

notro({
  rehypePlugins: [
    rehypeKatex,
    [rehypeMermaid, { theme: "github-dark" }],
  ],
})
```

每个项目可以是插件函数或 `[plugin, options]` 元组。

### shikiConfig

设置后，将 `@shikijs/rehype` 作为最后一个 rehype 插件注入以进行语法高亮。需要单独安装 `@shikijs/rehype`。

```bash
pnpm add @shikijs/rehype
```

```js
notro({
  shikiConfig: {
    theme: "github-dark",
  },
})
```

所有键直接传递给 `@shikijs/rehype`。可用主题和选项请参阅 [Shiki 文档](https://shiki.style/)。

**双主题（亮/暗）示例：**

```js
notro({
  shikiConfig: {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  },
})
```

### viteExternals

要添加到 Vite 的 `ssr.external` 的包。适用于 Vite 不应打包的原生二进制文件或动态导入的包：

```js
notro({
  rehypePlugins: [[rehypeMermaid, { strategy: "img-svg" }]],
  viteExternals: ["@mermaid-js/mermaid-zenuml"],
})
```

### extendMarkdownConfig

为 `true` 时，用 notro 的插件管道扩展 Astro 的基础 markdown 配置。默认为 `false`。

这很少需要。只有在你希望 notro 的插件也处理 Astro 内置的 `.md` 和 `.mdx` 文件（那些不由 Notion 加载器管理的文件）时才启用。

## 插件管道顺序

配置所有选项时的完整管道：

```
remarkNfm
  ↓（用户 remarkPlugins）
rehypeRaw
rehypeNotionColor
rehypeBlockElements
rehypeInlineMentions
  ↓（用户 rehypePlugins）
rehypeShiki          ← 仅当设置了 shikiConfig 时
rehypeSlug
rehypeToc
resolvePageLinks
```

## 类型参考

```ts
interface NotroIntegrationOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  shikiConfig?: Record<string, unknown>;
  viteExternals?: string[];
  extendMarkdownConfig?: boolean;
}

function notro(options?: NotroIntegrationOptions): AstroIntegration;
```
