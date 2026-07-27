---
slug: zh-cn/getting-started/introduction
title: 简介
---

# 简介

**notro** 是一个将 Notion 转换为 Astro 静态站点的生成器。它通过 Notion Public API 获取内容，将其编译为 MDX，并将每种 Notion 块类型映射到带样式的 Astro 组件，让你无需单独管理 CMS 即可生成快速、SEO 优化的静态网站。

## 为什么使用 notro？

Notion 是一款强大的写作工具，但传统上将其内容发布为精美网站需要自定义 API 集成和手动渲染逻辑。notro 为你处理所有这些工作：

- **零构建时渲染延迟** — 页面在构建时静态生成
- **完整的 Notion 块支持** — 标注、折叠、分栏、同步块、公式等
- **MDX 管道** — 与 Notion 内容一起使用 remark/rehype 插件（数学公式、Mermaid 图表、语法高亮）
- **复制即用的组件** — notro-ui 提供可自由定制的带样式 Notion 块组件
- **多种模板** — 从功能完整的博客模板或极简 blank 模板开始

## 工作原理

notro 构建于 [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) 之上。`loader()` 函数作为自定义内容加载器：

1. 通过 `dataSources.query` 查询 Notion 数据源的页面列表
2. 通过 `pages.retrieveMarkdown` 获取每个页面的 Markdown
3. 通过 `last_edited_time` 缓存页面，避免重建时的冗余 API 调用
4. 将预处理后的 Markdown 存储在 Content Collection store 中

渲染时，`NotroContent` 组件通过 MDX 管道编译存储的 Markdown，并使用完整的 Notion 组件映射进行渲染。

```
Notion 数据库
  ↓  notro-loader（Astro Content Loader）
Content Collection store
  ↓  NotroContent + compileMdx
渲染后的 HTML 页面
```

## 包

notro 是一个 monorepo。已发布的 npm 包如下：

| 包 | 用途 |
|---|---|
| `notro-loader` | Astro Content Loader + MDX 编译管道 + Notion 块组件 |
| `remark-nfm` | 用于 Notion Flavored Markdown 规范化的 remark 插件 |
| `notro-ui` | 复制即用的带样式 Notion 块组件（shadcn 风格） |
| `rehype-beautiful-mermaid` | 在构建时将 Mermaid 代码块渲染为内联 SVG |
| `create-notro` | CLI 脚手架工具（`npm create notro@latest`） |

## 模板

提供两种入门模板：

- **notro-blog** — 带分页、标签、分类、RSS 和站点地图的功能完整博客
- **notro-blank** — 适合自定义项目的极简单页启动模板

两种模板都预配置了 TailwindCSS 4、notro-ui 组件和 MDX 管道。

## 下一步

- [快速开始](/zh-cn/getting-started/quick-start) — 在几分钟内创建项目并连接到 Notion
- [Notion 设置](/zh-cn/getting-started/notion-setup) — 如何创建集成并配置数据库
