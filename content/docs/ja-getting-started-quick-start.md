---
slug: ja/getting-started/quick-start
title: クイックスタート
---

# クイックスタート

このガイドでは、ゼロから 10 分以内に notro サイトを立ち上げる手順を説明します。

## 前提条件

- **Node.js 24+** および **pnpm 9+**（または npm/yarn）
- 既存のデータベースを持つ [Notion アカウント](https://www.notion.so/)、または作成権限

## 1. プロジェクトを作成する

```bash
npm create notro@latest
```

CLI が以下の項目を尋ねます：

1. **テンプレートを選択** — `blog`（フル機能）または `blank`（ミニマル）
2. **プロジェクト名を入力** — ディレクトリ名として使用されます

```
◆  Which template would you like to use?
│  ● blog    Full-featured blog with pagination, tags, and RSS
│  ○ blank   Minimal starter
◆  Project name: my-notro-site
◆  Scaffolding to ./my-notro-site…
✔  Done! Next steps:
```

## 2. 依存関係をインストールする

```bash
cd my-notro-site
pnpm install
```

## 3. 環境変数を設定する

サンプル env ファイルをコピーして Notion の認証情報を入力します：

```bash
cp .env.example .env
```

`.env` を開いて以下を設定します：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

これらの値の取得方法は [Notion セットアップ](/ja/getting-started/notion-setup) を参照してください。

## 4. 開発サーバーを起動する

```bash
pnpm dev
```

Astro 開発サーバーが **http://localhost:4321** で起動します。初回起動時、notro は Notion データベースからすべてのページを取得してキャッシュします。

> **ヒント:** 初回起動はデータベースのページ数によって数秒かかる場合があります。2 回目以降は `last_edited_time` によるキャッシュが効くため高速です。

## 5. Notion でコンテンツを編集する

開発サーバーの起動中に、Notion データベースのページを編集します。開発サーバーを再起動（またはファイルを保存してリフレッシュ）すると変更が反映されます。

## 6. 本番ビルドを作成する

```bash
pnpm build
```

Astro が `astro check`（型チェック）に続けて `astro build` を実行し、静的サイトを `dist/` に生成します。

```bash
pnpm preview   # ローカルで本番ビルドをプレビュー
```

## 7. デプロイする

プロジェクトを GitHub にプッシュし、ホスティングプラットフォームに接続します。手順ごとのガイドはデプロイメントガイドを参照してください：

- [Cloudflare Pages](/ja/deployment/cloudflare-pages)
- [Vercel](/ja/deployment/vercel)
- [Netlify](/ja/deployment/netlify)

## プロジェクト構成

スキャフォールド後のプロジェクト構成（blog テンプレート）：

```
my-notro-site/
├── src/
│   ├── components/      # Header、Footer、BlogList
│   ├── layouts/         # Layout.astro
│   ├── lib/             # blog.ts、nav.ts、seo.ts
│   ├── pages/           # ファイルベースルーティング
│   │   ├── index.astro
│   │   └── blog/
│   │       ├── [...page].astro
│   │       └── [slug].astro
│   ├── styles/
│   │   ├── global.css       # TailwindCSS 4 + レイアウトユーティリティ
│   │   └── notro-theme.css  # Notion ブロックカラートークン
│   └── content.config.ts    # Astro Content Collections
├── astro.config.mjs
├── package.json
└── .env
```

## 次のステップ

- [Notion セットアップ](/ja/getting-started/notion-setup) — Notion インテグレーションとデータベーススキーマの設定
- [設定](/ja/guides/configuration) — notro パイプライン、プラグイン、イメージサービスのカスタマイズ
- [コンポーネントのカスタマイズ](/ja/guides/customizing-components) — Notion ブロックコンポーネントのオーバーライドと拡張
