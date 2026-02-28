import type { Loader, ParseDataOptions } from "astro/loaders";
import {
  Client,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import type { ClientOptions } from "@notionhq/client/build/src/Client";
import type {
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";
import {
  type PageWithMarkdownType,
  pageWithMarkdownSchema,
} from "./schema.ts";

type LoaderOptions = {
  queryParameters: QueryDataSourceParameters;
  clientOptions: ClientOptions;
};

// Define any options that the loader needs
export function loader({
  queryParameters,
  clientOptions,
}: LoaderOptions): Loader {
  const client = new Client(clientOptions);

  // Return a loader object
  return {
    name: "notro-loader",
    load: async ({ store, parseData, logger }): Promise<void> => {
      // Load data and update the store
      const pageOrDatabases = await Array.fromAsync(
        iteratePaginatedAPI(client.dataSources.query, queryParameters),
      );

      const pages = pageOrDatabases.filter((page) => isFullPage(page));

      // Delete expired or deleted pages
      store.entries().forEach(([id, { digest }]) => {
        if (
          !pages.some((page) => page.id === id) ||
          pages.some((page) => page.id === id && digest !== page.last_edited_time)
        ) {
          logger.info(`Deleting page ${id} from store`);
          store.delete(id);
        }
      });

      // Load new or updated pages
      const loadPageMarkdownPromises = pages
        .filter((page) => !store.has(page.id))
        .map(async (page) => {
          logger.info(`Loading page ${page.id} into store`);

          const markdownResponse = await client.pages.retrieveMarkdown({
            page_id: page.id,
          });

          if (markdownResponse.truncated) {
            // TODO: handle truncated markdown (paginated retrieval)
            logger.warn(`Page ${page.id} markdown was truncated`);
          }

          const data = await parseData<PageWithMarkdownType>({
            id: page.id,
            data: {
              parent: page.parent,
              properties: page.properties,
              icon: page.icon,
              cover: page.cover,
              created_by: page.created_by,
              last_edited_by: page.last_edited_by,
              object: page.object,
              id: page.id,
              created_time: page.created_time,
              last_edited_time: page.last_edited_time,
              archived: page.archived,
              in_trash: page.in_trash,
              url: page.url,
              public_url: page.public_url,
              markdown: markdownResponse.markdown,
            } as PageWithMarkdownType,
          });

          store.set({
            id: page.id,
            digest: page.last_edited_time,
            data: data,
          });
        });

      // Notion file covers use signed S3 URLs that expire after 1 hour.
      // For cached pages (content unchanged), refresh the cover URL from the
      // latest page metadata so the build always has a valid URL.
      // We omit `digest` so that store.set() does not skip the update.
      pages
        .filter((page) => store.has(page.id) && page.cover?.type === "file")
        .forEach((page) => {
          const entry = store.get(page.id);
          if (entry) {
            const { digest: _digest, ...entryWithoutDigest } = entry;
            store.set({ ...entryWithoutDigest, data: { ...entry.data, cover: page.cover } });
          }
        });

      //FIXME use p-queue and Retry for 3rps limit
      await Promise.all(loadPageMarkdownPromises);
    },
    // It will be overridden by user-defined schema.
    schema: pageWithMarkdownSchema,
  };
}
