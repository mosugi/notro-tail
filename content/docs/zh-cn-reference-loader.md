---
slug: zh-cn/reference/loader
title: loader()
---

# loader()

`loader()` 函数是一个自定义 [Astro Content Loader](https://docs.astro.build/en/reference/content-loader-reference/)，用于从 Notion 数据源获取页面并将其存储在 Content Collection store 中。

## 导入

```ts
import { loader } from "notro-loader";
```

## 使用

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { loader } from "notro-loader";

export const collections = {
  posts: defineCollection({
    loader: loader({
      queryParameters: {
        data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
        filter: { property: "Public", checkbox: { equals: true } },
      },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
    }),
  }),
};
```

## 选项

```ts
interface LoaderOptions {
  queryParameters: DataSourceQueryParameters;
  clientOptions: ClientOptions;
}
```

### queryParameters

传递给 `notion.dataSources.query` 的参数。`data_source_id` 是必填的；所有其他键都是可选的。

```ts
queryParameters: {
  data_source_id: string;       // 必填：Notion 数据库 UUID
  filter?: FilterObject;        // 可选：Notion 过滤器
  sorts?: SortObject[];         // 可选：排序顺序
  page_size?: number;           // 可选：每页结果数（最大 100）
}
```

**过滤器示例：**

```ts
// 简单复选框过滤器
filter: { property: "Public", checkbox: { equals: true } }

// AND 过滤器
filter: {
  and: [
    { property: "Public", checkbox: { equals: true } },
    { property: "Tags", multi_select: { contains: "featured" } },
  ],
}
```

**排序示例：**

```ts
// 按 Date 降序
sorts: [{ property: "Date", direction: "descending" }]

// 按最后编辑时间排序
sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
```

### clientOptions

传递给 `@notionhq/client` `Client` 构造函数的选项。

```ts
clientOptions: {
  auth: string;               // 必填：Notion API token
  notionVersion?: string;     // 可选：API 版本（默认：最新）
  timeoutMs?: number;         // 可选：请求超时（毫秒）
}
```

## 加载器存储的内容

对于每个 Notion 页面，加载器存储一个条目：

```ts
{
  id: string;               // Notion 页面 UUID
  markdown: string;         // 预处理后的 markdown 内容
  last_edited_time: string; // ISO 8601 时间戳
  properties: {
    // 原始 Notion 属性对象 — 形状取决于你的数据库模式
    Name: { title: [...] },
    Slug: { rich_text: [...] },
    // ...
  };
}
```

使用 `notro-loader` 的 `pageWithMarkdownSchema` 作为基础 Zod 模式来为这些字段添加类型，然后用数据库的特定属性扩展它。

## 缓存行为

加载器使用 Astro 的 Content Layer store 在构建之间缓存页面。以下情况会刷新条目：

- Notion 的 `last_edited_time` 自上次构建以来已更新
- 缓存的 markdown 包含过期的 Notion 预签名 S3 URL（通过图片 URL 中的 `X-Amz-Expires` 检测）
- 页面在 Notion 中不再存在（从 store 中删除条目）

`last_edited_time` 未变化的页面不会重新获取，使增量构建更快。

## 错误处理

| 情况 | 行为 |
|---|---|
| `429 rate_limited` | 使用指数退避重试（1s、2s、4s；最多 3 次） |
| `500 / 503` 服务器错误 | 使用指数退避重试 |
| `401 unauthorized` | 记录警告，跳过页面 |
| `403 restricted_resource` | 记录警告，跳过页面 |
| `404 object_not_found` | 记录警告，从 store 中删除 |
| 内容被截断 | 记录警告，使用截断的内容 |
| 未知块 ID | 记录带块 ID 列表的警告，继续 |

即使单个页面失败，构建也会继续。

## 实时加载器（仅开发环境）

对于需要不重启服务器就能实时更新内容的开发环境，使用 `liveLoader()`：

```ts
import { liveLoader } from "notro-loader";

export const collections = {
  posts: defineCollection({
    loader: liveLoader({
      queryParameters: { data_source_id: import.meta.env.NOTION_DATASOURCE_ID },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
    }),
  }),
};
```

`liveLoader()` 在 `astro dev` 期间每次请求都重新获取内容。不建议用于生产构建。

## 类型参考

```ts
function loader(options: LoaderOptions): AstroContentLoader;
function liveLoader(options: LoaderOptions): AstroContentLoader;

interface LoaderOptions {
  queryParameters: {
    data_source_id: string;
    filter?: unknown;
    sorts?: unknown[];
    page_size?: number;
  };
  clientOptions: {
    auth: string;
    notionVersion?: string;
    timeoutMs?: number;
  };
}
```
