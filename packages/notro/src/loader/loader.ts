import type { DataStore, Loader, ParseDataOptions } from "astro/loaders";
import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import type { ClientOptions } from "@notionhq/client/build/src/Client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";

export type BlockWithChildren = BlockObjectResponse & {
  children: BlockWithChildren[];
};

type LoaderOptions = {
  queryParameters: QueryDatabaseParameters;
  clientOptions: ClientOptions;
};

// Define any options that the loader needs
export function loader({
  queryParameters,
  clientOptions,
}: LoaderOptions): Loader {
  // Configure the loader
  const client = new Client(clientOptions);

  // Return a loader object
  return {
    name: "notro-loader",
    // Called when updating the collection.
    load: async ({
      store,
      logger,
      parseData,
      meta,
      generateDigest,
    }): Promise<void> => {
      // Load data and update the store
      const pageOrDatabases = await Array.fromAsync(
        iteratePaginatedAPI(client.databases.query, queryParameters),
      );

      //TODO Debug code
      // store.clear();

      const loadPageBlocksPromises = pageOrDatabases
        .filter((page) => isFullPage(page))
        .filter((page) => isStored(store, page))
        .map(
          async (page) => await loadPageBlocks(page, store, client, parseData),
        );

      //FIXME use p-queue and Retry for 3rps limit
      await Promise.all(loadPageBlocksPromises);
    },
    // Optionally, define the schema of an entry.
    // It will be overridden by user-defined schema.
    // schema: async () =>
    //   z.object({
    //     // ...
    //   }),
  };
}

async function loadPageBlocks<TData>(
  page: PageObjectResponse,
  store: DataStore,
  client: Client,
  parseData: <TData extends Record<string, unknown>>(
    props: ParseDataOptions<TData>,
  ) => Promise<TData>,
) {
  const blockIterator = retrieveBlockChildren(client, page.id);
  const blocks = await Array.fromAsync(blockIterator);

  const data = await parseData({
    id: page.id,
    data: {
      icon: page.icon,
      cover: page.cover,
      archived: page.archived,
      in_trash: page.in_trash,
      url: page.url,
      public_url: page.public_url,
      properties: page.properties,
      blocks: blocks,
    },
  });

  //TODO ストアされたうち削除されたページは取り除かれるようにする
  store.set({
    id: page.id,
    digest: page.last_edited_time,
    data: data,
  });
}

async function* retrieveBlockChildren(
  client: Client,
  blockId: string,
): AsyncGenerator<BlockWithChildren> {
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    const blockWithChildren: BlockWithChildren = {
      ...block,
      children: [],
    };

    if (block.has_children) {
      blockWithChildren.children = await Array.fromAsync(
        retrieveBlockChildren(client, block.id),
      );
    }

    yield blockWithChildren;
  }
}

function isStored(store: DataStore, page: PageObjectResponse) {
  return store.get(page.id)?.digest !== page.last_edited_time;
}
