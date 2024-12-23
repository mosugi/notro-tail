import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import notro from "notro";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://notrotail.mosugi.com",
  image: {
    remotePatterns: [
      {
        protocol: "https",
      },
    ],
  },
  integrations: [
    tailwind(),
    sitemap(),
    notro({
      token: process.env.NOTION_TOKEN,
      notionId: process.env.NOTION_ID,
      optimizeRemoteImage: true,
      useRawHtml: true,
      enableCalloutAsWrapper: true,
      fetchAllPagesOnServerStart: false,
      queryChildDatabaseParameters: {
        filter: {
          property: "Public",
          checkbox: {
            equals: true,
          },
        },
        sorts: [
          {
            property: "Date",
            direction: "descending",
          },
          {
            timestamp: "last_edited_time",
            direction: "descending",
          },
        ],
      },
      visibleChildDatabaseProperties: [
        "Name",
        "Description",
        "Tags",
        "Category",
        "Date",
        "Author",
      ],
    }),
  ],
  vite: {
    server: {
      watch: {
        ignored: ["**/cache/**/*"],
        // If fetchAllPagesOnServerStart is set to false, the first load of the tailwindcss class listed in Notion fails if cache detection is not enabled.
        // usePolling: true,
        // interval: 10000,
      },
    },
  },
});
