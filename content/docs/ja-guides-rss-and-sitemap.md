---
slug: ja/guides/rss-and-sitemap
title: RSS とサイトマップ
---

# RSS とサイトマップ

blog テンプレートには RSS フィードとサイトマップが事前設定されています。このページではその仕組みとカスタマイズ方法を説明します。

## サイトマップ

サイトマップは `@astrojs/sitemap` によって生成されます。静的生成されたすべてのページが自動的に含まれます。

### セットアップ

インテグレーションをインストールします（blog テンプレートには含まれています）：

```bash
pnpm add @astrojs/sitemap
```

`astro.config.mjs` に追加します：

```js
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://your-site.com",   // サイトマップに必要
  integrations: [
    notro(),
    sitemap(),
  ],
});
```

サイトマップは `/sitemap-index.xml` に生成され、`<head>` から自動的にリンクされます。

### ページの除外

特定のページをサイトマップから除外するには：

```js
sitemap({
  filter: (page) => !page.includes("/draft/"),
}),
```

---

## RSS フィード

RSS フィードは `/rss.xml` で提供され、`@astrojs/rss` によって生成されます。

### セットアップ

パッケージをインストールします（blog テンプレートには含まれています）：

```bash
pnpm add @astrojs/rss
```

`src/pages/rss.xml.ts` を作成します：

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getSortedPosts, excludeFixedPages } from "@/lib/posts";
import { config } from "@/config";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const allPosts = await getCollection("posts");
  const posts = getSortedPosts(excludeFixedPages(allPosts));

  return rss({
    title: config.site.name,
    description: config.site.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date ? new Date(post.data.date) : new Date(),
      link: `/blog/${post.data.slug}/`,
    })),
    customData: `<language>ja</language>`,
  });
}
```

### フィードのリンク

`Layout.astro` の `<head>` に RSS フィードリンクを追加します：

```astro
<link
  rel="alternate"
  type="application/rss+xml"
  title={config.site.name}
  href={new URL("rss.xml", Astro.site)}
/>
```

### フィードへのコンテンツの含め方

RSS フィードに各投稿の完全な HTML コンテンツを含めるには、`sanitizeHtml` と `marked` を使います：

```bash
pnpm add sanitize-html marked
```

```ts
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";

items: posts.map((post) => ({
  title: post.data.title,
  pubDate: post.data.date ? new Date(post.data.date) : new Date(),
  link: `/blog/${post.data.slug}/`,
  content: sanitizeHtml(await marked.parse(post.data.markdown)),
})),
```

> **注意:** RSS コンテンツは Notion コンポーネント付きのコンパイル済み MDX ではなく、raw markdown からレンダリングされます。カスタムブロックタイプ（コールアウト、トグルなど）はフィードリーダーではプレーンテキストとして表示されます。

---

## robots.txt

クローラーのアクセスを制御するために `public/robots.txt` を作成します：

```txt
User-agent: *
Allow: /

Sitemap: https://your-site.com/sitemap-index.xml
```

---

## Open Graph と SEO

blog テンプレートの `Layout.astro` には Open Graph メタタグが自動的に含まれます：

```astro
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={Astro.url} />
<meta property="og:type" content="article" />
```

`og:url` を絶対 URL にするために `astro.config.mjs` で `site` を設定してください。

### 投稿ごとの OG 画像

投稿ごとの Open Graph 画像を追加するには、Astro の `@vercel/og` や `satori` を使って生成します：

```bash
pnpm add @vercel/og
```

`src/pages/og/[slug].png.ts` を作成し、レイアウトの `og:image` として URL を渡します。動的イメージ生成の詳細は Astro ドキュメントを参照してください。
