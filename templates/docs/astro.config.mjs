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
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        ja: { label: "日本語", lang: "ja" },
        "zh-cn": { label: "简体中文", lang: "zh-CN" },
      },
    }),
    notro(),
  ],
});
