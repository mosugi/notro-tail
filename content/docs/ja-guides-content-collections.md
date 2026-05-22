---
slug: ja/guides/content-collections
title: コンテンツコレクション
---

# コンテンツコレクション

notro は [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) を使って Notion ページを管理します。このページではコレクションスキーマとローダーの設定方法を説明します。

## 基本セットアップ

`src/content.config.ts` でコレクションを定義します。blog テンプレートには `posts` コレクションが含まれています：

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

`pageWithMarkdownSchema` はローダーが返す Notion ページの基本 Zod スキーマです：

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | Notion ページ UUID |
| `markdown` | `string` | 前処理済み markdown コンテンツ |
| `last_edited_time` | `string` | ISO 8601 タイムスタンプ |
| `properties` | `Record<string, unknown>` | raw Notion プロパティ（`.extend()` で拡張） |

## notroProperties ヘルパー

`notroProperties` は各 Notion プロパティタイプの形状にマッチする Zod スキーマを提供します：

| ヘルパー | Notion タイプ | アクセスパターン |
|---|---|---|
| `notroProperties.title` | Title | `prop.title[0]?.plain_text` （`getPlainText()` 経由） |
| `notroProperties.richText` | Rich text | `prop.rich_text[0]?.plain_text` （`getPlainText()` 経由） |
| `notroProperties.checkbox` | Checkbox | `prop.checkbox` → `boolean` |
| `notroProperties.date` | Date | `prop.date?.start` → `string \| undefined` |
| `notroProperties.select` | Select | `prop.select?.name` → `string \| undefined` |
| `notroProperties.multiSelect` | Multi-select | `prop.multi_select.map(o => o.name)` |
| `notroProperties.number` | Number | `prop.number` → `number \| null` |
| `notroProperties.url` | URL | `prop.url` → `string \| null` |

## loader() オプション

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

`notion.dataSources.query` に直接渡されます。すべての Notion フィルターとソートオプションをサポートします。

**フィルターの例：**

```ts
// 公開ページのみ
filter: { property: "Public", checkbox: { equals: true } }

// 特定のタグを持つページ
filter: { property: "Tags", multi_select: { contains: "tutorial" } }

// 複合フィルター
filter: {
  and: [
    { property: "Public", checkbox: { equals: true } },
    { property: "Category", select: { equals: "blog" } },
  ],
}
```

**ソートの例：**

```ts
// 日付の降順
sorts: [{ property: "Date", direction: "descending" }]

// 最終編集時刻順
sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
```

### clientOptions

`@notionhq/client` の `Client` コンストラクターに渡されます。`auth` に Notion トークンを設定してください。

## 複数のコレクション

異なる Notion データベースを指す複数のコレクションを定義できます：

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

## ページコンポーネントでのコレクションデータの使用

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

## getPlainText ユーティリティ

`getPlainText` は Notion のリッチテキストまたはタイトルプロパティ値からプレーンテキスト文字列を抽出します：

```ts
import { getPlainText } from "notro-loader/utils";

getPlainText(properties.Name)        // "My Post Title"
getPlainText(properties.Description) // "A short description" | undefined
```

プロパティが存在しないか、テキストコンテンツがない場合は `undefined` を安全に返します。
