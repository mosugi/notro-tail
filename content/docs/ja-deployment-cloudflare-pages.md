---
slug: ja/deployment/cloudflare-pages
title: Cloudflare Pages へのデプロイ
---

# Cloudflare Pages へのデプロイ

このガイドでは、notro サイトを [Cloudflare Pages](https://pages.cloudflare.com/) にデプロイする方法を説明します。

## 前提条件

- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- GitHub または GitLab にプッシュされたプロジェクト

## 1. Pages プロジェクトを作成する

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **Pages** → **Create a project** に移動
3. **Connect to Git** をクリックして Cloudflare のリポジトリへのアクセスを承認
4. リポジトリを選択して **Begin setup** をクリック

## 2. ビルドを設定する

ビルド設定フォームに以下を入力します：

| 設定 | 値 |
|---|---|
| **Framework preset** | Astro |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `/`（プロジェクトがリポジトリルートにある場合は空白のまま） |
| **Node.js version** | `24` |

モノレポで Astro サイトがサブディレクトリ（例: `templates/blog/`）にある場合は、**Root directory** にそのパスを設定します。

## 3. 環境変数を設定する

**Environment variables (advanced)** をクリックして以下を追加します：

| 変数 | 値 |
|---|---|
| `NOTION_TOKEN` | Notion インテグレーションシークレット |
| `NOTION_DATASOURCE_ID` | Notion データベース UUID |

> **ヒント:** これらを **Production** のみに設定するか、プレビューデプロイでも Notion からのフェッチを行う場合は **Preview** にも複製してください。

## 4. デプロイする

**Save and Deploy** をクリックします。Cloudflare がリポジトリをクローンし、`pnpm install` と `pnpm build` を実行し、`dist/` ディレクトリを Cloudflare エッジネットワークにデプロイします。

## 5. 自動デプロイの設定

初回デプロイ後、Cloudflare は本番ブランチ（通常 `main`）へのプッシュごとに自動的にデプロイします。

notro サイトでは Notion のコンテンツ変更は自動的にリビルドをトリガー**しません**。Cloudflare の Deploy Hooks を使ってスケジュールリビルドを設定します：

1. **Pages** → プロジェクト → **Settings** → **Builds & deployments** に移動
2. **Deploy hooks** → **Add deploy hook** をクリック
3. 名前（例: `Notion content update`）を入力してビルドするブランチを選択
4. 生成された URL をコピー

コンテンツ変更時のリビルドをトリガーするため、この Webhook URL をクロンジョブや Notion オートメーションで使用します。

## カスタムドメイン

1. Pages プロジェクト → **Custom domains** → **Set up a custom domain** に移動
2. ドメインを入力して DNS 設定の指示に従う
3. Cloudflare が TLS 証明書を自動プロビジョニング

## Node.js バージョン

Cloudflare Pages は `NODE_VERSION` 環境変数で Node.js バージョンをサポートします。プロジェクトの環境変数で `24` を設定するか、リポジトリに `.node-version` ファイルを追加します：

```
24
```

## トラブルシューティング

**"pnpm not found" でビルド失敗**

`package.json` に `pnpm` バージョンを追加します：

```json
{
  "packageManager": "pnpm@10.33.0"
}
```

**環境変数が利用できない**

変数が **Production** 環境に設定されていること（Preview のみでないこと）を確認し、追加後に再デプロイしたことを確認してください。

**大規模サイトが 20,000 ファイル制限に達する**

Cloudflare Pages には 20,000 ファイルの制限があります。大規模サイトでは KV ストレージを使った Cloudflare Workers か、Vercel/Netlify を検討してください。
