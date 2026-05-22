---
slug: ja/getting-started/notion-setup
title: Notion セットアップ
---

# Notion セットアップ

このページでは、Notion Internal Integration の作成、正しいスキーマのデータベースセットアップ、そして notro に必要な認証情報の取得方法を説明します。

## 1. Notion インテグレーションを作成する

1. [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) を開く
2. **+ New integration** をクリック
3. 以下を入力：
   - **Name** — 例: `notro-blog`
   - **Associated workspace** — ワークスペースを選択
   - **Type** — Internal
4. **Capabilities** で **Read content** にチェックが入っていることを確認
5. **Submit** をクリック
6. **Internal Integration Secret** をコピー — これが `NOTION_TOKEN` です

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **セキュリティ:** `NOTION_TOKEN` はパスワードと同様に扱ってください。バージョン管理にコミットしないでください。`.env` を `.gitignore` に追加してください。

## 2. データベースを作成する

Notion で新しいフルページデータベースを作成します。blog テンプレートでは以下のプロパティスキーマが必要です：

| プロパティ | タイプ | 必須 | 用途 |
|---|---|---|---|
| `Name` | Title | ✓ | 投稿タイトル |
| `Slug` | Rich text | ✓ | URL スラグ（例: `hello-world`） |
| `Description` | Rich text | | 一覧に表示される抜粋 |
| `Public` | Checkbox | ✓ | `Public = true` のページのみビルドに含まれます |
| `Date` | Date | | 公開日 |
| `Tags` | Multi-select | | フィルタリング用タグ |
| `Category` | Select | | フィルタリング用カテゴリ |

追加のプロパティも自由に追加できます。notro はすべてのプロパティを `content.config.ts` で定義したスキーマに通して処理します。

## 3. データベースをインテグレーションと共有する

Notion インテグレーションはデフォルトではコンテンツにアクセスできません。

1. Notion でデータベースを開く
2. **⋯**（右上）→ **Connections** → **+ Add connections** をクリック
3. インテグレーション名を検索して **Confirm** をクリック

これでインテグレーションがこのデータベースへの読み取りアクセスを持ちます。

## 4. データベース ID を取得する

`NOTION_DATASOURCE_ID` はデータベース URL の UUID です。

データベースをフルページとして開きます。URL は以下のような形式です：

```
https://www.notion.so/your-workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
```

32 文字の 16 進数文字列（ハイフンあり・なし問わず）がデータベース ID です：

```bash
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 5. 環境変数を設定する

プロジェクトの `.env` ファイルに両方の値を追加します：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

本番デプロイでは、`.env` ファイルを含めるのではなく、ホスティングプラットフォーム（Cloudflare Pages、Vercel、Netlify）の環境変数として設定します。

## 6. 最初のページを作成する

Notion データベースで新しいページを作成します：

1. **Name** に投稿タイトルを設定（例: `Hello, World!`）
2. **Slug** に URL フレンドリーな文字列を設定（例: `hello-world`）
3. **Public** にチェックしてビルドに含める
4. **Date** に今日の日付を設定
5. ページ本文にコンテンツを書く

プロジェクトで `pnpm dev` を実行 — `/blog/hello-world` にページが表示されるはずです。

## ヒント

### Notion での Markdown

notro は Notion の Markdown Content API でコンテンツを取得します。この API は Notion ブロックを Markdown に変換します。ほとんどのブロックタイプがサポートされています：

- コールアウト、トグル、カラム
- シンタックスハイライト付きコードブロック
- テーブル、画像、埋め込み
- 数式（LaTeX）
- 同期ブロック

サポートされていないブロックは無視されます。Notion は API レスポンスの `unknown_block_ids` にブロック ID を記録し、notro はこれを警告としてログに出力します。

### Notion Flavored Markdown

Notion の Markdown 出力にはいくつかのクセがあります（区切り線と見出しの曖昧さ、カラーアノテーションなど）。`remark-nfm` プラグインがこれらを自動的に処理するため、特別な対応は不要です。

### Notion の画像

Notion は画像を有効期限付きのプリサインド S3 URL として提供します。notro には `notionImageService`（`astro.config.mjs` で設定）が含まれており、有効期限切れのクエリパラメーターをキャッシュキーの計算前に除去するため、繰り返しのビルドでもキャッシュ済みの画像を再利用できます。設定の詳細は[設定](/ja/guides/configuration)を参照してください。
