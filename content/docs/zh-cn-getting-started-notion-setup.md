---
slug: zh-cn/getting-started/notion-setup
title: Notion 设置
---

# Notion 设置

本页介绍如何创建 Notion Internal Integration、设置具有正确模式的数据库，以及获取 notro 所需的凭据。

## 1. 创建 Notion 集成

1. 访问 [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. 点击 **+ New integration**
3. 填写：
   - **Name** — 例如 `notro-blog`
   - **Associated workspace** — 选择你的工作区
   - **Type** — Internal
4. 在 **Capabilities** 下，确保 **Read content** 已勾选
5. 点击 **Submit**
6. 复制 **Internal Integration Secret** — 这就是你的 `NOTION_TOKEN`

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **安全提示:** 像对待密码一样对待 `NOTION_TOKEN`。切勿将其提交到版本控制。将 `.env` 添加到 `.gitignore`。

## 2. 创建数据库

在 Notion 中创建一个新的全页数据库。blog 模板需要以下属性模式：

| 属性 | 类型 | 必填 | 用途 |
|---|---|---|---|
| `Name` | Title | ✓ | 文章标题 |
| `Slug` | Rich text | ✓ | URL slug（例如 `hello-world`） |
| `Description` | Rich text | | 列表中显示的摘要 |
| `Public` | Checkbox | ✓ | 只有 `Public = true` 的页面才会包含在构建中 |
| `Date` | Date | | 发布日期 |
| `Tags` | Multi-select | | 用于过滤的标签 |
| `Category` | Select | | 用于过滤的分类 |

你可以添加任何其他属性；notro 会将所有属性传递给你在 `content.config.ts` 中定义的模式。

## 3. 将数据库与集成共享

Notion 集成默认没有访问内容的权限。

1. 在 Notion 中打开你的数据库
2. 点击 **⋯**（右上角）→ **Connections** → **+ Add connections**
3. 搜索你的集成名称并点击 **Confirm**

集成现在具有对此数据库的读取权限。

## 4. 获取数据库 ID

`NOTION_DATASOURCE_ID` 是数据库 URL 中的 UUID。

以全页方式打开数据库。URL 格式如下：

```
https://www.notion.so/your-workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
```

32 个字符的十六进制字符串（带或不带连字符）就是数据库 ID：

```bash
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 5. 设置环境变量

将两个值都添加到项目的 `.env` 文件中：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

对于生产部署，在托管平台（Cloudflare Pages、Vercel 或 Netlify）中将这些设置为环境变量，而不是附带 `.env` 文件。

## 6. 创建第一个页面

在你的 Notion 数据库中创建一个新页面：

1. 将 **Name** 设置为文章标题（例如 `Hello, World!`）
2. 将 **Slug** 设置为 URL 友好的字符串（例如 `hello-world`）
3. 勾选 **Public** 使其包含在构建中
4. 将 **Date** 设置为今天
5. 在页面正文中写一些内容

在项目中运行 `pnpm dev` — 页面应该出现在 `/blog/hello-world`。

## 提示

### Notion 中的 Markdown

notro 通过 Notion 的 Markdown Content API 获取内容，该 API 将 Notion 块转换为 Markdown。支持大多数块类型，包括：

- 标注、折叠、分栏
- 带语法高亮的代码块
- 表格、图片、嵌入
- 数学公式（LaTeX）
- 同步块

不支持的块会被静默忽略。Notion 在 API 响应的 `unknown_block_ids` 中记录块 ID；notro 会将这些记录为警告。

### Notion Flavored Markdown

Notion 的 Markdown 输出有一些特殊之处（分隔线/标题的歧义、颜色注释等）。`remark-nfm` 插件会自动处理这些问题 — 你不需要做任何特殊处理。

### Notion 中的图片

Notion 将图片作为带有过期时间的预签名 S3 URL 提供。notro 包含 `notionImageService`（在 `astro.config.mjs` 中配置），它在计算缓存键前剥离过期查询参数，使重复构建可以重用缓存的图片。设置详情请参阅[配置](/zh-cn/guides/configuration)。
