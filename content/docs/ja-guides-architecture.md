---
slug: ja/guides/architecture
title: アーキテクチャ
---

# アーキテクチャ

このページでは、notro が内部でどのように動作するかを説明します — Notion コンテンツの取得から最終的な HTML ページのレンダリングまでの流れです。

## 概要

```
Notion データベース
  ↓  loader()          — Astro Content Loader（notro-loader）
Content Collection     — ページごとにキャッシュされた markdown + プロパティ
  ↓  NotroContent      — compileMdx() + コンポーネントマッピング
レンダリング済み HTML ページ
```

notro は [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) の上に完全に構築されています。別のサーバーや Webhook は不要で、すべてビルド時（または `astro dev` 中）に処理されます。

## コンテンツの読み込み

`notro-loader` の `loader()` 関数はカスタム Astro Content Loader です。ビルドまたは開発サーバー起動のたびに以下を実行します：

1. `notion.dataSources.query` を呼び出してデータソースの全ページを一覧取得（ページネーション対応）
2. 各ページについて `last_edited_time` を比較してキャッシュが有効かチェック
3. 古くなったページや新しいページは `notion.pages.retrieveMarkdown` で raw markdown を取得
4. raw markdown に `preprocessNotionMarkdown()`（`remark-nfm` から）を実行して構造的な問題を修正
5. ページの `id`、`properties`、前処理済み `markdown` を Content Collection ストアに保存

Notion に存在しなくなったページはストアから削除されます。

### キャッシュの無効化

以下の場合にエントリが無効化されます：

- Notion の `last_edited_time` がキャッシュ値より新しい
- キャッシュ済み markdown に期限切れの Notion プリサインド S3 画像 URL が含まれている（`X-Amz-Expires`）
- ページが Notion に存在しなくなった（削除または共有解除）

### エラーハンドリング

| エラー | 動作 |
|---|---|
| `429 rate_limited` / `500` / `503` | 指数バックオフでリトライ（1s、2s、4s；最大 3 回） |
| `401 unauthorized` / `403 restricted_resource` / `404 object_not_found` | 警告をログに出力してページをスキップ — ビルドは継続 |
| その他の予期しないエラー | 警告をログに出力してページをスキップ — ビルドは継続 |

## MDX コンパイルパイプライン

`NotroContent` がページをレンダリングするとき、`compileMdxCached()` を呼び出します。これは保存された markdown を `@mdx-js/mdx` の `evaluate()` で以下のプラグインパイプラインを通して処理します：

### remark プラグイン（Markdown AST）

| プラグイン | 用途 |
|---|---|
| `remarkNfm` | `preprocessNotionMarkdown` 正規化、ディレクティブ構文 + GFM（打ち消し線、タスクリスト）、コールアウト変換をまとめて処理 |
| _（ユーザー指定）_ | 例: `remark-math`（LaTeX 数式用） |

### rehype プラグイン（HTML AST）

| プラグイン | 順序 | 用途 |
|---|---|---|
| `rehypeRaw` | 1 | Markdown 中の raw HTML 文字列を hast ノードに変換；カスタム要素はそのまま通す |
| `rehypeNotionColor` | 2 | `color="gray_bg"` 属性を `notro-*` CSS クラスに変換 |
| `rehypeBlockElements` | 3 | Notion ブロック要素を PascalCase にリネーム（`video` → `Video`） |
| `rehypeInlineMentions` | 4 | インライン mention 要素をリネーム（`mention-user` → `MentionUser`） |
| _（ユーザー指定）_ | 5 | 例: `rehype-katex`、`rehype-beautiful-mermaid` |
| `rehypeShiki` | 6 | シンタックスハイライト（`shikiConfig` 設定時に注入） |
| `rehypeSlug` | 7 | 見出しに `id` 属性を追加 |
| `rehypeToc` | 8 | `<TableOfContents>` にアンカーリンクを設定 |
| `resolvePageLinks` | 9 | `linkToPages` マップを使って `notion.so` URL をサイト相対 URL に解決 |

### コンポーネントマッピング

`evaluate()` の後、`<Content components={notionComponents} />` がすべての Notion ブロックタイプを Astro コンポーネントにマッピングします：

```ts
const notionComponents = {
  callout: Callout,
  toggle: Toggle,
  columns: Columns,
  column: Column,
  video: Video,
  table_of_contents: TableOfContents,
  // ... など
  a: Link,
  img: NotionImage,
  pre: CodeBlock,
  // ...
};
```

`NotroContent` の `components` プロパティでカスタムオーバーライドをマージできます。

## Markdown 前処理

MDX パイプラインが実行される前に、`preprocessNotionMarkdown()` が Notion の raw Markdown 出力の構造的問題を修正します：

| 修正 | 対象の問題 |
|---|---|
| Fix 1 | 前の空行なしの `---` が setext H2 として誤認識される |
| Fix 2 | コールアウトディレクティブ構文の正規化 |
| Fix 3 | ブロックレベルのカラーアノテーションを raw HTML に変換 |
| Fix 4 | `<table_of_contents/>` を CommonMark 検出のため `<div>` で囲む |
| Fix 5 | インライン数式フォーマットの正規化 |
| Fix 6 | `<synced_block>` ラッパーを削除 |
| Fix 7 | `<empty-block/>` をブロックレベル要素として独立させる |
| Fix 8 | 閉じタグに末尾の空行を追加（CommonMark が後続の markdown を飲み込むのを防ぐ） |
| Fix 9 | `<td>` セル内の Markdown リンクを `<a>` タグに変換 |

## 画像処理

Notion はページ画像を有効期限付きのプリサインド S3 URL として提供します（`X-Amz-Expires`、`X-Amz-Date` などのクエリパラメーター）。これらは API 呼び出しのたびに変わるため、Astro のイメージキャッシュが毎回ミスします。

`notionImageService` は Astro の組み込み Sharp サービスをラップし、これらの有効期限切れパラメーターをキャッシュキーの計算前に除去します。これにより、実際のコンテンツが変化したときのみ画像が再処理されます。

## パッケージエントリーポイント

`notro-loader` は異なるインポートコンテキストに対応するため 4 つのエントリーポイントを提供します：

| エントリーポイント | 用途 |
|---|---|
| `notro-loader` | コンポーネントとローダー — `.astro` と `content.config.ts` で使用 |
| `notro-loader/integration` | `notro()` Astro インテグレーション — `astro.config.mjs` で使用 |
| `notro-loader/utils` | 純粋な TypeScript ヘルパー — `astro.config.mjs` や Node スクリプトでも安全に使用可能 |
| `notro-loader/image-service` | `notionImageService` — `astro.config.mjs` の `image.service` で使用 |

`astro.config.mjs` は JSX レンダラーが登録される前に評価されるため、設定ファイル時に Astro コンポーネントをインポートすると失敗します。この分割はその問題を解決します。
