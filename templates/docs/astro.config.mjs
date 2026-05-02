import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { notro } from "notro-loader/integration";

export default defineConfig({
  site: "https://notrotail.mosugi.com",
  integrations: [
    starlight({
      customCss: ["./src/styles/notro.css"],
      title: "notro",
      description: "Notion-to-Astro static site generator",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/mosugi/notro",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/notro",
        },
      ],
      components: {
        MarkdownContent: "./src/components/NotroMarkdownContent.astro",
      },
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Notion Setup", slug: "getting-started/notion-setup" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "アーキテクチャ", slug: "guides/architecture" },
            { label: "設定", slug: "guides/configuration" },
            { label: "コンポーネントのカスタマイズ", slug: "guides/customizing-components" },
            { label: "Content Collections", slug: "guides/content-collections" },
            { label: "タグとフィルタリング", slug: "guides/tags-and-filtering" },
            { label: "RSS とサイトマップ", slug: "guides/rss-and-sitemap" },
          ],
        },
        {
          label: "Deployment",
          items: [
            { label: "Cloudflare Pages", slug: "deployment/cloudflare-pages" },
            { label: "Vercel", slug: "deployment/vercel" },
            { label: "Netlify", slug: "deployment/netlify" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "notro() Integration", slug: "reference/integration" },
            { label: "loader()", slug: "reference/loader" },
            { label: "NotroContent", slug: "reference/notro-content" },
            { label: "Markdown Pipeline", slug: "reference/markdown-pipeline" },
          ],
        },
      ],
    }),
    notro(),
  ],
});
