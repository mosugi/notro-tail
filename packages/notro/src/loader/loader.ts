import type { Loader } from "astro/loaders";
import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";
import type { ClientOptions } from "@notionhq/client/build/src/Client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type PageWithBlocks = {
  icon: string;
  cover: string;
  archived: boolean;
  in_trash: boolean;
  url: string;
  public_url: string;
  properties: Record<string, unknown>;
  blocks: BlockWithChildren[];
};

// Define any options that the loader needs
export function loader(options: ClientOptions): Loader {
  // Configure the loader
  const client = new Client(options);

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
      const pageId = "9c477872a3574526b281006d9db8a992";
      // Load data and update the store
      const page = await client.pages.retrieve({
        page_id: pageId,
      });
      store.clear;

      const storedPage = store.get(pageId);
      if (isFullPage(page) && storedPage?.digest !== page.last_edited_time) {
        const blockIterator = retrieveBlockChildren(client, pageId);

        const blocks = await Array.fromAsync(blockIterator);

        const transformed = await Promise.all(
          items.map((num) => Array.fromAsync(blockIterator)),
        );

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

        //TODO: ストアされたうち削除されたページの取り扱い
        store.set({
          id: page.id,
          digest: page.last_edited_time,
          data: data,
        });
      }
    },
    // Optionally, define the schema of an entry.
    // It will be overridden by user-defined schema.
    // schema: async () =>
    //   z.object({
    //     // ...
    //   }),
  };
}

export type BlockWithChildren = BlockObjectResponse & {
  children: BlockWithChildren[];
};

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
