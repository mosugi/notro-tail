---
slug: ja/reference/integration
title: notro() インテグレーション
---

# notro() インテグレーション

`notro()` は `@astrojs/mdx` を notro のコア remark/rehype プラグインパイプラインで登録する Astro インテグレーションです。

## なぜ必要なのか

`notro()` が必要な理由は 2 つあります：

1. **`astro:jsx` レンダラー** — `@astrojs/mdx` が `@mdx-js/mdx` の `evaluate()` が Astro VNode を生成するために依存する `astro:jsx` レンダラーを登録します。これがないと `NotroContent` が実行時に失敗します。
2. **静的な `.mdx` ファイル** — プロジェクトが Notion コンテンツと一緒に `.mdx` ファイルを使う場合、`notro()` がそれらを Notion コンテンツと同じプラグインパイプラインで処理することを保証します。

## インポート

```js
// astro.config.mjs
import { notro } from "notro-loader/integration";
```

> **重要:** 必ず `notro-loader/integration` からインポートしてください（`notro-loader` からではありません）。`/integration` エントリーポイントは Astro コンポーネントをインポートしないため、`astro.config.mjs` での使用が安全です。

## 使い方

```js
import { defineConfig } from "astro/config";
import { notro } from "notro-loader/integration";

export default defineConfig({
  integrations: [
    notro(),
  ],
});
```

## オプション

すべてのオプションは任意です。

```ts
notro({
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  shikiConfig?: Record<string, unknown>;
  viteExternals?: string[];
  extendMarkdownConfig?: boolean;
})
```

### remarkPlugins

パイプラインの `remarkNfm` の後に追加する remark プラグイン。

```js
import remarkMath from "remark-math";

notro({
  remarkPlugins: [remarkMath],
})
```

プラグインは指定した順序で追加されます。

### rehypePlugins

パイプラインの `rehypeShiki`（設定済みの場合）の前に挿入する rehype プラグイン。

```js
import rehypeKatex from "rehype-katex";
import { rehypeMermaid } from "rehype-beautiful-mermaid";

notro({
  rehypePlugins: [
    rehypeKatex,
    [rehypeMermaid, { theme: "github-dark" }],
  ],
})
```

各アイテムはプラグイン関数または `[plugin, options]` のタプルです。

### shikiConfig

設定すると、シンタックスハイライト用の `@shikijs/rehype` を最後の rehype プラグインとして注入します。`@shikijs/rehype` を別途インストールする必要があります。

```bash
pnpm add @shikijs/rehype
```

```js
notro({
  shikiConfig: {
    theme: "github-dark",
  },
})
```

すべてのキーは `@shikijs/rehype` に直接渡されます。利用可能なテーマとオプションは [Shiki ドキュメント](https://shiki.style/) を参照してください。

**デュアルテーマ（ライト/ダーク）の例：**

```js
notro({
  shikiConfig: {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  },
})
```

### viteExternals

Vite の `ssr.external` に追加するパッケージ。ネイティブバイナリや動的インポートを持ち、Vite がバンドルすべきでないパッケージに使います：

```js
notro({
  rehypePlugins: [[rehypeMermaid, { strategy: "img-svg" }]],
  viteExternals: ["@mermaid-js/mermaid-zenuml"],
})
```

### extendMarkdownConfig

`true` の場合、Astro の基本 markdown 設定を notro のプラグインパイプラインで拡張します。デフォルトは `false`。

通常は不要です。Notion ローダーで管理されていない Astro の組み込み `.md` と `.mdx` ファイルにも notro のプラグインを適用したい場合のみ有効にしてください。

## プラグインパイプラインの順序

すべてのオプションを設定した場合のフルパイプライン：

```
remarkNfm
  ↓ (ユーザー remarkPlugins)
rehypeRaw
rehypeNotionColor
rehypeBlockElements
rehypeInlineMentions
  ↓ (ユーザー rehypePlugins)
rehypeShiki          ← shikiConfig 設定時のみ
rehypeSlug
rehypeToc
resolvePageLinks
```

## 型リファレンス

```ts
interface NotroIntegrationOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  shikiConfig?: Record<string, unknown>;
  viteExternals?: string[];
  extendMarkdownConfig?: boolean;
}

function notro(options?: NotroIntegrationOptions): AstroIntegration;
```
