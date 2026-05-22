---
slug: ja/deployment/netlify
title: Netlify へのデプロイ
---

# Netlify へのデプロイ

このガイドでは、notro サイトを [Netlify](https://www.netlify.com/) にデプロイする方法を説明します。

## 前提条件

- [Netlify アカウント](https://app.netlify.com/signup)
- GitHub、GitLab、または Bitbucket にプッシュされたプロジェクト

## 1. 新しいサイトを作成する

1. [app.netlify.com](https://app.netlify.com/) にログインして **Add new site** → **Import an existing project** をクリック
2. Git プロバイダーに接続してリポジトリを選択

## 2. ビルドを設定する

以下のビルド設定を入力します：

| 設定 | 値 |
|---|---|
| **Base directory** | _（空白のまま、またはモノレポのパッケージパスを設定）_ |
| **Build command** | `pnpm build` |
| **Publish directory** | `dist` |

### netlify.toml（推奨）

ビルド設定をバージョン管理に保存するため、リポジトリルートの `netlify.toml` に定義します：

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"
  PNPM_VERSION = "10"
```

Astro プロジェクトがサブディレクトリにあるモノレポの場合：

```toml
[build]
  base    = "templates/blog"
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"
```

## 3. 環境変数を設定する

Netlify ダッシュボードで **Site configuration** → **Environment variables** → **Add a variable** に移動します：

| キー | 値 |
|---|---|
| `NOTION_TOKEN` | Notion インテグレーションシークレット |
| `NOTION_DATASOURCE_ID` | Notion データベース UUID |

> **ヒント:** プレビュービルドで Notion からのフェッチを不要にする場合は、**Scopes** を使って変数を Production コンテキストのみに制限できます。

## 4. デプロイする

**Deploy site** をクリックします。Netlify がリポジトリをクローンし、依存関係をインストールし、ビルドを実行し、`dist/` ディレクトリを CDN から提供します。

## 5. 自動デプロイとリビルドトリガー

Netlify は本番ブランチへのプッシュごとに自動的にデプロイします。Notion コンテンツの変更には Build Hook を使います：

1. **Site configuration** → **Build & deploy** → **Build hooks** に移動
2. **Add build hook** をクリックして名前（例: `Notion content`）を入力してブランチを選択
3. 生成された URL をコピー

フックをトリガーしてリビルド：

```bash
curl -X POST -d {} "https://api.netlify.com/build_hooks/YOUR_HOOK_ID"
```

### Netlify Functions によるスケジュールリビルド

スケジュールされた Netlify Function を作成してスケジュールリビルドを実装：

```ts
// netlify/functions/scheduled-rebuild.ts
import type { Config } from "@netlify/functions";

export default async function handler() {
  await fetch(process.env.BUILD_HOOK_URL!, { method: "POST" });
  return { statusCode: 200 };
}

export const config: Config = {
  schedule: "0 2 * * *",  // 毎日 UTC 2:00
};
```

`BUILD_HOOK_URL` を自分のビルドフック URL を指す環境変数として追加してください。

## カスタムドメイン

1. **Domain management** → **Add a domain** に移動
2. カスタムドメインを入力して DNS 設定の指示に従う
3. Netlify が Let's Encrypt で TLS 証明書を自動プロビジョニング

## Netlify Edge Functions（任意）

SSR には Netlify アダプターをインストールします：

```bash
pnpm add @astrojs/netlify
```

```js
// astro.config.mjs
import netlify from "@astrojs/netlify";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  // ...
});
```

## トラブルシューティング

**`pnpm: command not found`**

環境変数または `netlify.toml` で `PNPM_VERSION` を設定します：

```toml
[build.environment]
  PNPM_VERSION = "10"
```

**ビルドは成功するがサイトが 404 を表示**

**Publish directory** が `dist` に設定されていることを確認してください（プロジェクトルートではありません）。

**ビルド時に環境変数が利用できない**

変数の **Builds** スコープが有効になっていることを確認してください。変数設定でスコープが **Builds**（**Runtime** のみではない）を含んでいるか確認してください。
