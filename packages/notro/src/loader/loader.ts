import type { DataStore, Loader, ParseDataOptions } from "astro/loaders";
import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import type { ClientOptions } from "@notionhq/client/build/src/Client";
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import {
  type BlockObjectResponseWithChildrenType,
  type PageObjectResponseWithBlocksType,
  pageObjectResponseWithBlocksSchema,
} from "./schema.ts";

type LoaderOptions = {
  queryParameters: QueryDatabaseParameters;
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
        iteratePaginatedAPI(client.databases.query, queryParameters),
      );

      const pages = pageOrDatabases.filter((page) => isFullPage(page));

      // Delete expired or deleted pages
      store.entries().forEach(([id, { digest }]) => {
        if (
          !pages.some((page) => page.id === id) || pages.some((page) => page.id === id && digest !== page.last_edited_time || isExpired(digest as number))
        ) {
          logger.info(`Deleting page ${id} from store`);
          store.delete(id);
        }
      });　　

      // Load new or updated pages
      const loadPageBlocksPromises = pages
        .filter((page) => !store.has(page.id))
        .map(
          async (page) => {
            logger.info(`Loading page ${page.id} into store`);
            await loadPageBlocks(page, store, client, parseData)
          }
        );

      //FIXME use p-queue and Retry for 3rps limit
      await Promise.all(loadPageBlocksPromises);
    },
    // It will be overridden by user-defined schema.
    schema: pageObjectResponseWithBlocksSchema,
  };
}

async function loadPageBlocks(
  page: PageObjectResponse,
  store: DataStore,
  client: Client,
  parseData: <TData extends Record<string, unknown>>(
    props: ParseDataOptions<TData>,
  ) => Promise<TData>,
) {
  const blockIterator = retrieveBlockChildren(client, page.id);
  const blocks = await Array.fromAsync(blockIterator);

  const data = await parseData<PageObjectResponseWithBlocksType>({
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
      blocks: blocks,
    } as PageObjectResponseWithBlocksType,
  });

  store.set({
    id: page.id,
    digest: page.last_edited_time,
    data: data,
  });
}

async function* retrieveBlockChildren(
  client: Client,
  blockId: string,
): AsyncGenerator<BlockObjectResponseWithChildrenType> {
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    const blockWithChildren: BlockObjectResponseWithChildrenType = {
      ...block,
      children: [],
    };

    if (block.has_children) {
      blockWithChildren.children = await Array.fromAsync(
        retrieveBlockChildren(client, block.id),
      );
    }

    // TODO 同期ブロックの場合は同期先の取得(synced_block.synced_from.block_id)が必要
    // リンクブロックの場合はリンク先の取得（リンク先特定のため）が必要だが、プロパティが可変なのでどうすればいいのか

    yield blockWithChildren;
  }
}

// Notion images are expired after 1 hour
const isExpired = (digest: number) => {
  // TODO: 環境変数で1時間で再取得するかどうかを指定できるようにする
  return false
  // return digest !== undefined && Date.now() - digest >= 1000 * 60 * 60;
};
