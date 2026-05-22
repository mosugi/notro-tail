---
slug: ja/guides/configuration
title: 設定
---

# 設定

このページでは notro のすべての設定オプション — Astro インテグレーション、環境変数、イメージサービス — を説明します。

## astro.config.mjs

blog テンプレートの典型的な `astro.config.mjs` は以下のようになります：

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { notro } from "notro-loader/integration";
import { notionImageService } from "notro-loader/image-service";
import { rehypeMermaid } from "rehype-beautiful-mermaid";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://example.com",
  image: {
    service: notionImageService,
  },
  integrations: [
    notro({
      shikiConfig: { theme: "github-dark" },
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeMermaid, { theme: "github-dark" }],
        rehypeKatex,
      ],
    }),
    sitemap(),
  ],
});
```

## notro() インテグレーションのオプション

`notro()` インテグレーションは `@astrojs/mdx` を notro のコアプラグインスイートで登録します。すべてのオプションは任意です。

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `remarkPlugins` | `PluggableList` | `[]` | `remarkNfm` の後に追加する remark プラグイン |
| `rehypePlugins` | `PluggableList` | `[]` | `rehypeShiki` の前に挿入する rehype プラグイン |
| `shikiConfig` | `Record<string, unknown>` | `undefined` | 設定すると `@shikijs/rehype` を最後のプラグインとして注入。`npm i @shikijs/rehype` が必要 |
| `viteExternals` | `string[]` | `[]` | Vite の `ssr.external` に追加するパッケージ（ネイティブバイナリ用） |
| `extendMarkdownConfig` | `boolean` | `false` | Astro の基本 markdown 設定を拡張するかどうか |

### シンタックスハイライトの追加

```js
notro({
  shikiConfig: {
    theme: "github-dark",
    // または複数テーマ：
    themes: { light: "github-light", dark: "github-dark" },
  },
}),
```

### 数式サポートの追加

```bash
pnpm add remark-math rehype-katex
```

```js
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

notro({
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
}),
```

### Mermaid 図の追加

```bash
pnpm add rehype-beautiful-mermaid
```

```js
import { rehypeMermaid } from "rehype-beautiful-mermaid";

notro({
  rehypePlugins: [[rehypeMermaid, { theme: "github-dark" }]],
  viteExternals: ["@mermaid-js/mermaid-zenuml"],  // ZenUML 使用時
}),
```

## イメージサービス

`notionImageService` を `astro.config.mjs` の `image.service` に設定してください。Astro の組み込み Sharp サービスをラップし、Notion の有効期限付き S3 URL パラメーター（`X-Amz-*`）をイメージキャッシュキーの計算前に除去します。これにより、毎ビルドでの無駄な再処理を防ぎます。

```js
import { notionImageService } from "notro-loader/image-service";

export default defineConfig({
  image: {
    service: notionImageService,
  },
  // ...
});
```

このサービスを設定しない場合、Notion のプリサインド URL はフェッチのたびに変わるため、毎ビルドで画像が再処理されます。

## 環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `NOTION_TOKEN` | ✓ | Notion Internal Integration Secret |
| `NOTION_DATASOURCE_ID` | ✓ | Notion データベース（データソース）UUID |

プロジェクトルートに `.env` ファイルを作成します（すでに `.gitignore` に含まれています）：

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

本番環境では、ホスティングプラットフォームの環境変数として設定します。詳細はデプロイメントガイドを参照してください。

## TypeScript 設定

生成された `tsconfig.json` は Astro の strict 設定を拡張しています。notro のために変更は不要です。

`@notionhq/client` の型エラーが表示される場合は、`skipLibCheck: true` が設定されていることを確認してください：

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## サイト URL

`astro.config.mjs` の `site` オプションを本番 URL に設定してください。カノニカル URL、`og:url`、サイトマップに必要です：

```js
export default defineConfig({
  site: "https://your-site.com",
  // ...
});
```
