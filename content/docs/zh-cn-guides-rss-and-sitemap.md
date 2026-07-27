---
slug: zh-cn/guides/rss-and-sitemap
title: RSS 和网站地图
---

# RSS 和网站地图

blog 模板预配置了 RSS feed 和网站地图。本页介绍其工作原理以及如何自定义。

## 网站地图

网站地图由 `@astrojs/sitemap` 生成，自动包含每个静态生成的页面。

### 设置

安装集成（blog 模板中已包含）：

```bash
pnpm add @astrojs/sitemap
```

添加到 `astro.config.mjs`：

```js
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://your-site.com",   // 网站地图必需
  integrations: [
    notro(),
    sitemap(),
  ],
});
```

网站地图生成在 `/sitemap-index.xml`，并从 `<head>` 自动链接。

### 排除页面

要从网站地图中排除特定页面：

```js
sitemap({
  filter: (page) => !page.includes("/draft/"),
}),
```

---

## RSS feed

RSS feed 在 `/rss.xml` 提供，由 `@astrojs/rss` 生成。

### 设置

安装包（blog 模板中已包含）：

```bash
pnpm add @astrojs/rss
```

创建 `src/pages/rss.xml.ts`：

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
    customData: `<language>zh-CN</language>`,
  });
}
```

### 链接 feed

在 `Layout.astro` 的 `<head>` 中添加 RSS feed 链接：

```astro
<link
  rel="alternate"
  type="application/rss+xml"
  title={config.site.name}
  href={new URL("rss.xml", Astro.site)}
/>
```

### 在 feed 中包含内容

要在 RSS feed 中包含每篇文章的完整 HTML 内容，使用 `sanitizeHtml` 和 `marked`：

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

> **注意:** RSS 内容从原始 markdown 渲染，而非带 Notion 组件的编译 MDX。自定义块类型（标注、折叠等）在 feed 阅读器中会显示为纯文本。

---

## robots.txt

创建 `public/robots.txt` 控制爬虫访问：

```txt
User-agent: *
Allow: /

Sitemap: https://your-site.com/sitemap-index.xml
```

---

## Open Graph 和 SEO

blog 模板的 `Layout.astro` 自动包含 Open Graph meta 标签：

```astro
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={Astro.url} />
<meta property="og:type" content="article" />
```

在 `astro.config.mjs` 中设置 `site` 以确保 `og:url` 是绝对 URL。

### 每篇文章的 OG 图片

要添加每篇文章的 Open Graph 图片，使用 Astro 的 `@vercel/og` 或 `satori` 生成：

```bash
pnpm add @vercel/og
```

创建 `src/pages/og/[slug].png.ts` 并将生成的 URL 作为 `og:image` 传入布局。有关动态图片生成的详情，请参阅 Astro 文档。
