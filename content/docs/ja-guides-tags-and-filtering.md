---
slug: ja/guides/tags-and-filtering
title: タグとフィルタリング
---

# タグとフィルタリング

blog テンプレートはタグとカテゴリによるフィルタリングをすぐに使える状態でサポートしています。このページではデータモデルと拡張方法を説明します。

## Notion プロパティ

blog テンプレートは 2 つのフィルタリングプロパティを使います：

| プロパティ | Notion タイプ | 用途 |
|---|---|---|
| `Tags` | Multi-select | 投稿ごとの複数ラベル（例: `TypeScript`、`Astro`） |
| `Category` | Select | 投稿ごとの単一のプライマリカテゴリ（例: `Tutorial`） |
| `Public` | Checkbox | ページをビルドに含めるかを制御 |

## API レベルでのフィルタリング

最も効率的なフィルタリングは `loader()` クエリで行います。これにより、マッチするページのみが取得されます：

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

全ページを取得してクライアントサイドでフィルタリングするより、API 呼び出し数とビルド時間を削減できます。

## ページコンポーネントでのフィルタリング

コレクションが読み込まれた後、Astro ページコンポーネントでさらにエントリをフィルタリングできます。

### タグでフィルタリング

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

### カテゴリでフィルタリング

```ts
export function getPostsByCategory(
  posts: CollectionEntry<"posts">[],
  category: string,
): CollectionEntry<"posts">[] {
  return posts.filter((post) => post.data.category === category);
}
```

### タグの集計

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

## 投稿のソート

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

## ピン留め投稿

blog テンプレートは特殊な `Tags` 値でピン留め投稿をサポートします。Notion でページに `pinned` タグを付け、ページコンポーネントでフィルタリングします：

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

## 固定ページ

About ページなど、トップナビゲーションには表示するがブログ一覧には表示しないページがあります。慣例として `page` タグを使います：

```ts
export function excludeFixedPages(
  posts: CollectionEntry<"posts">[],
): CollectionEntry<"posts">[] {
  return posts.filter((post) => !post.data.tags?.includes("page"));
}
```

## 高度な Notion フィルター

`queryParameters` で Notion のフィルター API を使って複雑なフィルターを組み合わせることができます：

```ts
// 特定のカテゴリ AND 特定のタグを持つ投稿
filter: {
  and: [
    { property: "Category", select: { equals: "Tutorial" } },
    { property: "Tags", multi_select: { contains: "TypeScript" } },
  ],
}

// いずれかのタグを持つ投稿
filter: {
  or: [
    { property: "Tags", multi_select: { contains: "Astro" } },
    { property: "Tags", multi_select: { contains: "notro" } },
  ],
}
```

フィルター構文の詳細は [Notion API フィルタードキュメント](https://developers.notion.com/reference/post-database-query-filter) を参照してください。
