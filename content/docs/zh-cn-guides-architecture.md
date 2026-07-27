---
slug: zh-cn/guides/architecture
title: 架构
---

# 架构

本页介绍 notro 的内部工作原理 — 从获取 Notion 内容到渲染最终 HTML 页面的完整流程。

## 概述

```
Notion 数据库
  ↓  loader()          — Astro Content Loader（notro-loader）
Content Collection     — 每个页面缓存的 markdown + 属性
  ↓  NotroContent      — compileMdx() + 组件映射
渲染后的 HTML 页面
```

notro 完全构建于 [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) 之上。不需要单独的服务器或 Webhook — 所有事情都在构建时（或 `astro dev` 期间）发生。

## 内容加载

`notro-loader` 的 `loader()` 函数是一个自定义 Astro Content Loader。在每次构建或开发服务器启动时，它会：

1. 调用 `notion.dataSources.query` 列出数据源中的所有页面（分页处理）
2. 对于每个页面，通过比较 `last_edited_time` 检查缓存条目是否仍然有效
3. 对于过期或新页面，调用 `notion.pages.retrieveMarkdown` 获取原始 markdown
4. 在原始 markdown 上运行 `preprocessNotionMarkdown()`（来自 `remark-nfm`）修复结构性问题
5. 将页面的 `id`、`properties` 和预处理后的 `markdown` 存储在 Content Collection store 中

Notion 中不再存在的页面将从 store 中删除。

### 缓存失效

以下情况会使条目失效：

- Notion 的 `last_edited_time` 比缓存值更新
- 缓存的 markdown 包含过期的 Notion 预签名 S3 图片 URL（`X-Amz-Expires`）
- 页面在 Notion 中不再存在（已删除或取消共享）

### 错误处理

| 错误 | 行为 |
|---|---|
| `429 rate_limited` / `500` / `503` | 使用指数退避重试（1s、2s、4s；最多 3 次） |
| `401 unauthorized` / `403 restricted_resource` / `404 object_not_found` | 记录警告，跳过页面 — 构建继续 |
| 其他意外错误 | 记录警告，跳过页面 — 构建继续 |

## MDX 编译管道

当 `NotroContent` 渲染页面时，它调用 `compileMdxCached()`，通过 `@mdx-js/mdx` 的 `evaluate()` 运行以下插件管道：

### remark 插件（Markdown AST）

| 插件 | 用途 |
|---|---|
| `remarkNfm` | 捆绑：`preprocessNotionMarkdown` 规范化、指令语法 + GFM（删除线、任务列表）、标注转换 |
| _（用户提供）_ | 例如 `remark-math`（LaTeX 公式） |

### rehype 插件（HTML AST）

| 插件 | 顺序 | 用途 |
|---|---|---|
| `rehypeRaw` | 1 | 将 markdown 中的原始 HTML 字符串解析为 hast 节点；自定义元素直接通过 |
| `rehypeNotionColor` | 2 | 将 `color="gray_bg"` 属性转换为 `notro-*` CSS 类 |
| `rehypeBlockElements` | 3 | 将 Notion 块元素重命名为 PascalCase（`video` → `Video`） |
| `rehypeInlineMentions` | 4 | 重命名内联 mention 元素（`mention-user` → `MentionUser`） |
| _（用户提供）_ | 5 | 例如 `rehype-katex`、`rehype-beautiful-mermaid` |
| `rehypeShiki` | 6 | 语法高亮（设置 `shikiConfig` 时注入） |
| `rehypeSlug` | 7 | 为标题添加 `id` 属性 |
| `rehypeToc` | 8 | 为 `<TableOfContents>` 填充锚点链接 |
| `resolvePageLinks` | 9 | 使用 `linkToPages` 映射将 `notion.so` URL 解析为站点相对 URL |

### 组件映射

`evaluate()` 之后，`<Content components={notionComponents} />` 将每种 Notion 块类型映射到 Astro 组件：

```ts
const notionComponents = {
  callout: Callout,
  toggle: Toggle,
  columns: Columns,
  column: Column,
  video: Video,
  table_of_contents: TableOfContents,
  // ... 等等
  a: Link,
  img: NotionImage,
  pre: CodeBlock,
  // ...
};
```

自定义组件覆盖通过 `NotroContent` 的 `components` 属性合并进来。

## Markdown 预处理

在 MDX 管道运行之前，`preprocessNotionMarkdown()` 修复 Notion 原始 Markdown 输出中的结构性问题：

| 修复 | 解决的问题 |
|---|---|
| Fix 1 | 没有前置空行的 `---` 被误读为 setext H2 |
| Fix 2 | 标注指令语法规范化 |
| Fix 3 | 块级颜色注释转换为原始 HTML |
| Fix 4 | `<table_of_contents/>` 用 `<div>` 包裹以供 CommonMark 检测 |
| Fix 5 | 内联公式格式规范化 |
| Fix 6 | 删除 `<synced_block>` 包装器 |
| Fix 7 | 将 `<empty-block/>` 隔离为块级元素 |
| Fix 8 | 为闭合标签添加尾随空行（防止 CommonMark 吞噬后续 markdown） |
| Fix 9 | 将 `<td>` 单元格内的 Markdown 链接转换为 `<a>` 标签 |

## 图片处理

Notion 将页面图片作为带有过期时间戳的预签名 S3 URL 提供（`X-Amz-Expires`、`X-Amz-Date` 等查询参数）。这些在每次 API 调用时都会变化，导致 Astro 的图片缓存每次都未命中。

`notionImageService` 包装 Astro 的内置 Sharp 服务，在计算缓存键前剥离这些过期参数，使图片只在实际内容变化时才重新处理。

## 包入口点

`notro-loader` 为不同的导入上下文提供四个入口点：

| 入口点 | 用途 |
|---|---|
| `notro-loader` | 组件和加载器 — 在 `.astro` 和 `content.config.ts` 中使用 |
| `notro-loader/integration` | `notro()` Astro 集成 — 在 `astro.config.mjs` 中使用 |
| `notro-loader/utils` | 纯 TypeScript 辅助函数 — 在 `astro.config.mjs` 和 Node 脚本中安全使用 |
| `notro-loader/image-service` | `notionImageService` — 在 `astro.config.mjs` 的 `image.service` 中使用 |

这种分离是因为 `astro.config.mjs` 在 JSX 渲染器注册之前被评估，所以在配置时导入 Astro 组件会失败。
