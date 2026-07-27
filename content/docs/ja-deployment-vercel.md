---
slug: ja/deployment/vercel
title: Vercel へのデプロイ
---

# Vercel へのデプロイ

このガイドでは、notro サイトを [Vercel](https://vercel.com/) にデプロイする方法を説明します。

## 前提条件

- [Vercel アカウント](https://vercel.com/signup)
- GitHub、GitLab、または Bitbucket にプッシュされたプロジェクト

## 1. プロジェクトをインポートする

1. [vercel.com](https://vercel.com/) にログインして **Add New Project** をクリック
2. **Import Git Repository** をクリックしてリポジトリを選択
3. Vercel が Astro プロジェクトを自動検出してほとんどの設定を事前入力します

## 2. ビルドを設定する

ビルド設定を確認します：

| 設定 | 値 |
|---|---|
| **Framework Preset** | Astro |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` |
| **Node.js Version** | `24.x`（**Settings → General** で設定） |

Astro サイトがサブディレクトリにあるモノレポの場合は、**Root Directory** にパッケージパス（例: `templates/blog`）を設定します。

## 3. 環境変数を設定する

**Environment Variables** をクリックして以下を追加します：

| 変数 | 環境 | 値 |
|---|---|---|
| `NOTION_TOKEN` | Production、Preview | Notion インテグレーションシークレット |
| `NOTION_DATASOURCE_ID` | Production、Preview | Notion データベース UUID |

## 4. デプロイする

**Deploy** をクリックします。Vercel が `pnpm install` と `pnpm build` を実行し、`dist/` ディレクトリをグローバルにデプロイします。

## 5. 自動デプロイとリビルドトリガー

Vercel は本番ブランチへのプッシュごとに自動的にデプロイします。Notion のコンテンツのみの変更には、Deploy Hook を設定します：

1. **Settings** → **Git** → **Deploy Hooks** に移動
2. **Create Hook** をクリックして名前を入力し、ブランチを選択
3. URL をコピー

この URL をクロンジョブ、GitHub Actions、または Notion オートメーションで使ってコンテンツ変更時のリビルドをトリガーします：

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/HOOK_ID"
```

### GitHub Actions によるスケジュールリビルド

```yaml
# .github/workflows/rebuild.yml
name: Scheduled rebuild
on:
  schedule:
    - cron: "0 2 * * *"   # 毎日 UTC 2:00

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel deploy hook
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

`VERCEL_DEPLOY_HOOK` を GitHub リポジトリの Secrets に追加してください。

## カスタムドメイン

1. プロジェクト → **Settings** → **Domains** → **Add** に移動
2. ドメインを入力して DNS 設定の指示に従う
3. Vercel が Let's Encrypt で TLS 証明書を自動プロビジョニング

## Vercel Edge Functions（任意）

Astro の SSR 機能を使う場合は Vercel アダプターをインストールします：

```bash
pnpm add @astrojs/vercel
```

```js
// astro.config.mjs
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  // ...
});
```

> **注意:** ほとんどのサイトには notro の静的サイト生成モード（`output: "static"`、デフォルト）が推奨されます。SSR はサーバーサイドの検索やパーソナライゼーションなどの機能に必要な場合のみ使用してください。

## トラブルシューティング

**"Cannot find module" でビルド失敗**

`node_modules` がリポジトリにコミットされていないことを確認してください。Vercel は依存関係を一から インストールします。

**Node.js バージョンの不一致**

**Settings → General → Node.js Version** で `24.x` を設定するか、`.nvmrc` ファイルを追加します：

```
24
```

**大規模な Notion データベースでメモリ制限超過**

Vercel のビルドコンテナには 4 GB のメモリ制限があります。大規模なサイトでは、`loader()` の `filter` オプションを使って公開ページのみ取得することを検討してください。
