import type { AstroIntegration } from "astro";
import { Client } from "@notionhq/client";
import { vitePluginNotionInit } from "./vite-plugins/vite-plugin-notion-init";
import { fetchAllChildrenRecursive } from "./utils/notion/fetchAllBlocks.ts";
import {
  listNotionBlockChildrenAll,
  getNotionBlock,
} from "./utils/notion/api/blocks.ts";
import { vitePluginNotroOptions } from "./vite-plugins/vite-plugin-notion-options.ts";
import { fetchAllPagesRecursive } from "./utils/notion/fetchAllPages.ts";
import type { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { cache } from "./utils/cache.ts";

export {
  fetchAllChildrenRecursive,
  listNotionBlockChildrenAll,
  getNotionBlock,
};

// FIXME: import { BlockRenderer } from "./components/BlockRenderer.astro";
// import BlockRenderer from "./components/BlockRenderer.astro";

// export { default as NotionBlocks } from "./components/NotionBlocks.astro";

export { loader } from "./loader/loader.ts";

export type IntegrationOptions = {
  token: string;
  notionId: string;
  optimizeRemoteImage: boolean;
  useRawHtml: boolean;
  enableCalloutAsWrapper: boolean;
  fetchAllPagesOnServerStart: boolean;
  queryChildDatabaseParameters: QueryDatabaseParameters;
  visibleChildDatabaseProperties: string[];
};

function initializeNotionClient(token: string): boolean {
  // @ts-ignore
  if (!globalThis.notionClientInstance) {
    // @ts-ignore
    globalThis.notionClientInstance = new Client({
      auth: token,
    });
    return true;
  }
  return false;
}

export function getNotionClient() {
  //@ts-ignore
  if (!globalThis.notionClientInstance) {
    throw new Error("Notion client is not initialized");
  }
  //@ts-ignore
  return globalThis.notionClientInstance;
}

// @ts-ignore
globalThis.hasRestarted = false;
const notro = (config: IntegrationOptions): AstroIntegration => {
  return {
    name: "notro",
    hooks: {
      "astro:config:setup": async ({ updateConfig, injectScript }) => {
        updateConfig({
          vite: {
            plugins: [
              vitePluginNotionInit({
                auth: config.token,
              }),
              vitePluginNotroOptions(config),
            ],
          },
        });

        injectScript(
          "page-ssr",
          `
          import { notionClient } from "virtual:notion-init";
          globalThis.notionClientInstance = notionClient;
          `,
        );
      },
      "astro:server:setup": async ({ server }) => {
        const isInitialized = initializeNotionClient(config.token);
        if (config.fetchAllPagesOnServerStart && isInitialized) {
          fetchAllPagesRecursive(config.notionId as string).then(() => {
            server.restart();
          });
        }
      },
      "astro:build:start": async () => {
        console.log("Fetching all blocks...");
        console.time("All blocks fetched");
        await cache.reset();
        initializeNotionClient(config.token);
        await fetchAllChildrenRecursive(config.notionId as string);
        console.timeEnd("All blocks fetched");
      },
    },
  };
};

export default notro;
