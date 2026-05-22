---
slug: zh-cn/guides/tags-and-filtering
title: 标签和过滤
---

# 标签和过滤

blog 模板开箱即支持基于标签和分类的过滤。本页介绍数据模型以及如何扩展它。

## Notion 属性

blog 模板使用两个过滤属性：

| 属性 | Notion 类型 | 用途 |
|---|---|---|
| `Tags` | Multi-select | 每篇文章的多个标签（例如 `TypeScript`、`Astro`） |
| `Category` | Select | 每篇文章的单一主分类（例如 `Tutorial`） |
| `Public` | Checkbox | 控制页面是否包含在构建中 |

## 在 API 层面过滤

最高效的过滤方式是在 `loader()` 查询中进行，这样只有匹配的页面才会被获取：

```ts
// content.config.ts
loader({
  queryParameters: {
    data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
    filter: { property: "Public", checkbox: { equals: true } },
  },
  clientOptions: { auth: import.meta.env.NOTION_TOKEN },
})
```

与获取所有页面后在客户端过滤相比，这减少了 API 调用和构建时间。

## 在页面组件中过滤

集合加载后，可以在 Astro 页面组件中进一步过滤条目。

### 按标签过滤

```ts
// src/lib/posts.ts
import type { CollectionEntry } from "astro:content";

export function getPostsByTag(
  posts: CollectionEntry<"posts">[],
  tag: string,
): CollectionEntry<"posts">[] {
  return posts.filter((post) => post.data.tags?.includes(tag));
}
```

```astro
---
// src/pages/blog/tag/[tag]/[...page].astro
import { getCollection } from "astro:content";
import { getPostsByTag, getSortedPosts } from "@/lib/posts";

export async function getStaticPaths({ paginate }) {
  const allPosts = await getCollection("posts");
  const allTags = [...new Set(allPosts.flatMap((p) => p.data.tags ?? []))];

  return allTags.flatMap((tag) => {
    const tagPosts = getSortedPosts(getPostsByTag(allPosts, tag));
    return paginate(tagPosts, { params: { tag }, pageSize: 10 });
  });
}

const { page, params } = Astro.props;
---
<h1>Posts tagged: {params.tag}</h1>
<ul>
  {page.data.map((post) => <li>{post.data.title}</li>)}
</ul>
```

### 按分类过滤

```ts
export function getPostsByCategory(
  posts: CollectionEntry<"posts">[],
  category: string,
): CollectionEntry<"posts">[] {
  return posts.filter((post) => post.data.category === category);
}
```

### 获取所有标签及计数

```ts
export function getTagCounts(
  posts: CollectionEntry<"posts">[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}
```

## 文章排序

```ts
export function getSortedPosts(
  posts: CollectionEntry<"posts">[],
): CollectionEntry<"posts">[] {
  return [...posts].sort((a, b) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });
}
```

## 置顶文章

blog 模板通过特殊的 `Tags` 值支持置顶文章。在 Notion 中用 `pinned` 标签标记页面，然后在页面组件中过滤：

```ts
export function getPinnedPosts(
  posts: CollectionEntry<"posts">[],
): CollectionEntry<"posts">[] {
  return posts.filter((post) => post.data.tags?.includes("pinned"));
}

export function excludePinnedPosts(
  posts: CollectionEntry<"posts">[],
): CollectionEntry<"posts">[] {
  return posts.filter((post) => !post.data.tags?.includes("pinned"));
}
```

## 固定页面

某些页面（如 About 页面）应出现在顶部导航中，但不在博客列表中。惯例是使用 `page` 标签：

```ts
export function excludeFixedPages(
  posts: CollectionEntry<"posts">[],
): CollectionEntry<"posts">[] {
  return posts.filter((post) => !post.data.tags?.includes("page"));
}
```

## 高级 Notion 过滤器

可以使用 Notion 的过滤器 API 在 `queryParameters` 中组合复杂过滤器：

```ts
// 特定分类 AND 特定标签的文章
filter: {
  and: [
    { property: "Category", select: { equals: "Tutorial" } },
    { property: "Tags", multi_select: { contains: "TypeScript" } },
  ],
}

// 任一标签的文章
filter: {
  or: [
    { property: "Tags", multi_select: { contains: "Astro" } },
    { property: "Tags", multi_select: { contains: "notro" } },
  ],
}
```

完整的过滤器语法请参阅 [Notion API 过滤器文档](https://developers.notion.com/reference/post-database-query-filter)。
