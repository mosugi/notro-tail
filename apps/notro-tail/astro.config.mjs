import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
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
  integrations: [tailwind(), sitemap()],
  vite: {
    server: {
      watch: {
        ignored: ["**/cache/**/*"],
      },
    },
  },
});
