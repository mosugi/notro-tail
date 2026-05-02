import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { notionImageService } from "notro-loader/image-service";
import { notro } from "notro-loader/integration";

// Apply HTTPS proxy for corporate networks or CI environments.
const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
if (httpsProxy) {
  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(httpsProxy));
}

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",

  image: {
    service: notionImageService,
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "prod-files-secure.s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "www.notion.so" },
      { protocol: "https", hostname: "notion.so" },
    ],
  },

  integrations: [notro()],

  vite: {
    plugins: [tailwindcss()],
  },
});
