---
slug: zh-cn/guides/configuration
title: 配置
---

# 配置

本页涵盖 notro 的所有配置选项 — Astro 集成、环境变量和图像服务。

## astro.config.mjs

blog 模板的典型 `astro.config.mjs` 如下所示：

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { notro } from "notro-loader/integration";
import { notionImageService } from "notro-loader/image-service";
import { rehypeMermaid } from "rehype-beautiful-mermaid";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://example.com",
  image: {
    service: notionImageService,
  },
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" },
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeMermaid, { theme: "github-dark" }],
        rehypeKatex,
      ],
    }),
    sitemap(),
  ],
});
```

## notro() 集成选项

`notro()` 集成使用 notro 的核心插件套件注册 `@astrojs/mdx`。所有选项都是可选的。

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `remarkPlugins` | `PluggableList` | `[]` | 在 `remarkNfm` 之后追加的 remark 插件 |
| `rehypePlugins` | `PluggableList` | `[]` | 在 `rehypeShiki` 之前插入的 rehype 插件 |
| `shikiConfig` | `Record<string, unknown>` | `undefined` | 设置后将 `@shikijs/rehype` 作为最后一个插件注入。需要 `npm i @shikijs/rehype` |
| `viteExternals` | `string[]` | `[]` | 要添加到 Vite 的 `ssr.external` 的包（用于原生二进制文件） |
| `extendMarkdownConfig` | `boolean` | `false` | 是否扩展 Astro 的基础 markdown 配置 |

### 添加语法高亮

```js
notro({
  shikiConfig: {
    theme: "github-dark",
    // 或多主题：
    themes: { light: "github-light", dark: "github-dark" },
  },
}),
```

### 添加数学支持

```bash
pnpm add remark-math rehype-katex
```

```js
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

notro({
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
}),
```

### 添加 Mermaid 图表

```bash
pnpm add rehype-beautiful-mermaid
```

```js
import { rehypeMermaid } from "rehype-beautiful-mermaid";

notro({
  rehypePlugins: [[rehypeMermaid, { theme: "github-dark" }]],
  viteExternals: ["@mermaid-js/mermaid-zenuml"],  // 使用 ZenUML 时
}),
```

## 图像服务

应将 `notionImageService` 设置为 `astro.config.mjs` 中的 `image.service`。它包装 Astro 的内置 Sharp 服务，在计算图像缓存键前剥离 Notion 的过期 S3 URL 参数（`X-Amz-*`），防止每次构建时的冗余重处理。

```js
import { notionImageService } from "notro-loader/image-service";

export default defineConfig({
  image: {
    service: notionImageService,
  },
  // ...
});
```

如果不配置此服务，由于 Notion 的预签名 URL 每次获取时都会变化，图像将在每次构建时重新处理。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `NOTION_TOKEN` | ✓ | Notion Internal Integration Secret |
| `NOTION_DATASOURCE_ID` | ✓ | Notion 数据库（数据源）UUID |

在项目根目录创建 `.env` 文件（已在 `.gitignore` 中）：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

对于生产环境，在托管平台中将这些设置为环境变量。详情请参阅部署指南。

## TypeScript 配置

生成的 `tsconfig.json` 扩展了 Astro 的 strict 配置。notro 不需要任何更改。

如果你看到来自 `@notionhq/client` 的类型错误，确保设置了 `skipLibCheck: true`：

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## 站点 URL

在 `astro.config.mjs` 中将 `site` 选项设置为你的生产 URL。这是规范 URL、`og:url` 和站点地图所必需的：

```js
export default defineConfig({
  site: "https://your-site.com",
  // ...
});
```
