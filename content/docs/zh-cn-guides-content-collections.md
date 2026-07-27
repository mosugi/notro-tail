---
slug: zh-cn/guides/content-collections
title: 内容集合
---

# 内容集合

notro 使用 [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) 管理 Notion 页面。本页介绍如何配置集合模式和加载器。

## 基本设置

`src/content.config.ts` 定义你的集合。blog 模板包含一个 `posts` 集合：

```ts
import { defineCollection } from "astro:content";
import { loader, pageWithMarkdownSchema, notroProperties } from "notro-loader";
import { getPlainText } from "notro-loader/utils";
import { z } from "zod";

const postsSchema = pageWithMarkdownSchema
  .extend({
    properties: z.object({
      Name:        notroProperties.title,
      Description: notroProperties.richText.optional(),
      Slug:        notroProperties.richText,
      Public:      notroProperties.checkbox,
      Date:        notroProperties.date.optional(),
      Tags:        notroProperties.multiSelect.optional(),
      Category:    notroProperties.select.optional(),
    }),
  })
  .transform((data) => ({
    ...data,
    title:       getPlainText(data.properties.Name) ?? "Untitled",
    description: getPlainText(data.properties.Description) ?? undefined,
    slug:        getPlainText(data.properties.Slug) ?? data.id,
    date:        data.properties.Date?.date?.start,
    tags:        data.properties.Tags?.multi_select.map((t) => t.name) ?? [],
    category:    data.properties.Category?.select?.name,
    isPublic:    data.properties.Public.checkbox,
  }));

export const collections = {
  posts: defineCollection({
    loader: loader({
      queryParameters: {
        data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
        filter: { property: "Public", checkbox: { equals: true } },
      },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
    }),
    schema: postsSchema,
  }),
};
```

## pageWithMarkdownSchema

`pageWithMarkdownSchema` 是加载器返回的 Notion 页面的基础 Zod 模式：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | Notion 页面 UUID |
| `markdown` | `string` | 预处理后的 markdown 内容 |
| `last_edited_time` | `string` | ISO 8601 时间戳 |
| `properties` | `Record<string, unknown>` | 原始 Notion 属性（用 `.extend()` 扩展） |

## notroProperties 辅助函数

`notroProperties` 提供与每种 Notion 属性类型形状匹配的 Zod 模式：

| 辅助函数 | Notion 类型 | 访问模式 |
|---|---|---|
| `notroProperties.title` | Title | `prop.title[0]?.plain_text`（通过 `getPlainText()`） |
| `notroProperties.richText` | Rich text | `prop.rich_text[0]?.plain_text`（通过 `getPlainText()`） |
| `notroProperties.checkbox` | Checkbox | `prop.checkbox` → `boolean` |
| `notroProperties.date` | Date | `prop.date?.start` → `string \| undefined` |
| `notroProperties.select` | Select | `prop.select?.name` → `string \| undefined` |
| `notroProperties.multiSelect` | Multi-select | `prop.multi_select.map(o => o.name)` |
| `notroProperties.number` | Number | `prop.number` → `number \| null` |
| `notroProperties.url` | URL | `prop.url` → `string \| null` |

## loader() 选项

```ts
loader({
  queryParameters: {
    data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
    filter: { property: "Public", checkbox: { equals: true } },
    sorts: [{ property: "Date", direction: "descending" }],
  },
  clientOptions: {
    auth: import.meta.env.NOTION_TOKEN,
  },
})
```

### queryParameters

直接传递给 `notion.dataSources.query`。支持所有 Notion 过滤器和排序选项。

**过滤器示例：**

```ts
// 只有公开页面
filter: { property: "Public", checkbox: { equals: true } }

// 包含特定标签的页面
filter: { property: "Tags", multi_select: { contains: "tutorial" } }

// 组合过滤器
filter: {
  and: [
    { property: "Public", checkbox: { equals: true } },
    { property: "Category", select: { equals: "blog" } },
  ],
}
```

**排序示例：**

```ts
// 按日期降序
sorts: [{ property: "Date", direction: "descending" }]

// 按最后编辑时间排序
sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
```

### clientOptions

传递给 `@notionhq/client` `Client` 构造函数。将 `auth` 设置为你的 Notion token。

## 多个集合

你可以定义指向不同 Notion 数据库的多个集合：

```ts
export const collections = {
  posts: defineCollection({
    loader: loader({
      queryParameters: { data_source_id: import.meta.env.NOTION_BLOG_DB_ID },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
    }),
    schema: postsSchema,
  }),
  projects: defineCollection({
    loader: loader({
      queryParameters: { data_source_id: import.meta.env.NOTION_PROJECTS_DB_ID },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
    }),
    schema: projectsSchema,
  }),
};
```

## 在页面组件中使用集合数据

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from "astro:content";
import { NotroContent } from "notro-loader";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
---
<article>
  <h1>{post.data.title}</h1>
  <NotroContent markdown={post.data.markdown} />
</article>
```

## getPlainText 工具函数

`getPlainText` 从 Notion 富文本或标题属性值中提取纯文本字符串：

```ts
import { getPlainText } from "notro-loader/utils";

getPlainText(properties.Name)        // "My Post Title"
getPlainText(properties.Description) // "A short description" | undefined
```

如果属性不存在或没有文本内容，它会安全地返回 `undefined`。
