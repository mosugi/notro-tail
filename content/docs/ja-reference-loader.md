---
slug: ja/reference/loader
title: loader()
---

# loader()

`loader()` 関数は Notion データソースからページを取得して Content Collection ストアに保存するカスタム [Astro Content Loader](https://docs.astro.build/en/reference/content-loader-reference/) です。

## インポート

```ts
import { loader } from "notro-loader";
```

## 使い方

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

## オプション

```ts
interface LoaderOptions {
  queryParameters: DataSourceQueryParameters;
  clientOptions: ClientOptions;
}
```

### queryParameters

`notion.dataSources.query` に渡されるパラメーター。`data_source_id` は必須で、他はすべて任意です。

```ts
queryParameters: {
  data_source_id: string;       // 必須: Notion データベース UUID
  filter?: FilterObject;        // 任意: Notion フィルター
  sorts?: SortObject[];         // 任意: ソート順
  page_size?: number;           // 任意: ページあたりの件数（最大 100）
}
```

**フィルターの例：**

```ts
// チェックボックスフィルター
filter: { property: "Public", checkbox: { equals: true } }

// AND フィルター
filter: {
  and: [
    { property: "Public", checkbox: { equals: true } },
    { property: "Tags", multi_select: { contains: "featured" } },
  ],
}
```

**ソートの例：**

```ts
// Date の降順
sorts: [{ property: "Date", direction: "descending" }]

// 最終編集時刻順
sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
```

### clientOptions

`@notionhq/client` の `Client` コンストラクターに渡されるオプション。

```ts
clientOptions: {
  auth: string;               // 必須: Notion API トークン
  notionVersion?: string;     // 任意: API バージョン（デフォルト: 最新）
  timeoutMs?: number;         // 任意: リクエストのタイムアウト（ms）
}
```

## ローダーが保存するデータ

各 Notion ページについて、ローダーは以下のエントリを保存します：

```ts
{
  id: string;               // Notion ページ UUID
  markdown: string;         // 前処理済み markdown コンテンツ
  last_edited_time: string; // ISO 8601 タイムスタンプ
  properties: {
    // raw Notion プロパティオブジェクト — データベーススキーマに依存
    Name: { title: [...] },
    Slug: { rich_text: [...] },
    // ...
  };
}
```

これらのフィールドを型付けするには `notro-loader` の `pageWithMarkdownSchema` を基本 Zod スキーマとして使い、データベース固有のプロパティで拡張してください。

## キャッシュの動作

ローダーは Astro の Content Layer ストアを使ってビルド間でページをキャッシュします。以下の場合にエントリが更新されます：

- Notion の `last_edited_time` が前回のビルド以降に進んでいる
- キャッシュ済み markdown に期限切れの Notion プリサインド S3 URL が含まれている（画像 URL の `X-Amz-Expires` で検出）
- ページが Notion に存在しなくなった（ストアから削除）

`last_edited_time` が変化していないページは再取得されず、インクリメンタルビルドが高速になります。

## エラーハンドリング

| 状況 | 動作 |
|---|---|
| `429 rate_limited` | 指数バックオフでリトライ（1s、2s、4s；最大 3 回） |
| `500 / 503` サーバーエラー | 指数バックオフでリトライ |
| `401 unauthorized` | 警告をログに出力してページをスキップ |
| `403 restricted_resource` | 警告をログに出力してページをスキップ |
| `404 object_not_found` | 警告をログに出力してストアから削除 |
| コンテンツが切り詰められた | 警告をログに出力して切り詰められたコンテンツを使用 |
| 不明なブロック ID | ブロック ID リストとともに警告をログに出力して続行 |

個別のページが失敗してもビルドは継続されます。

## ライブローダー（開発環境専用）

サーバーを再起動せずにリアルタイムのコンテンツ更新が必要な開発環境では `liveLoader()` を使います：

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

`liveLoader()` は `astro dev` 中のリクエストごとにコンテンツを再取得します。本番ビルドには推奨しません。

## 型リファレンス

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
