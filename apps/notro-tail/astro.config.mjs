import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import tailwindcss from "@tailwindcss/vite";

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

  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});