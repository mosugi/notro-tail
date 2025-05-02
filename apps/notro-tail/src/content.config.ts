import { defineCollection } from "astro:content";
import {
  checkboxPropertyPageObjectResponseSchema,
  datePropertyPageObjectResponseSchema,
  loader,
  multiSelectPropertyPageObjectResponseSchema,
  numberPropertyPageObjectResponseSchema,
  pageObjectResponseWithBlocksSchema,
  richTextPropertyPageObjectResponseSchema,
  selectPropertyPageObjectResponseSchema,
  titlePropertyPageObjectResponseSchema,
} from "notro";
import { z } from "zod";

const pagesCollection = defineCollection({
  loader: loader({
    queryParameters: {
      database_id: import.meta.env.NOTION_PAGES_ID,
      sorts: [
        {
          property: "Order",
          direction: "ascending",
        },
      ],
      filter: {
        property: "Public",
        checkbox: {
          equals: true,
        },
      },
    },
    clientOptions: {
      auth: import.meta.env.NOTION_TOKEN,
    },
  }),
  schema: pageObjectResponseWithBlocksSchema.extend({
    properties: z.object({
      Name: titlePropertyPageObjectResponseSchema,
      Public: checkboxPropertyPageObjectResponseSchema,
      Slug: richTextPropertyPageObjectResponseSchema,
      Place: selectPropertyPageObjectResponseSchema,
      Order: numberPropertyPageObjectResponseSchema,
    }),
  }),
});

const postsCollection = defineCollection({
  loader: loader({
    queryParameters: {
      database_id: import.meta.env.NOTION_POSTS_ID,
      sorts: [
        {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      ],
      filter: {
        property: "Public",
        checkbox: {
          equals: true,
        },
      },
    },
    clientOptions: {
      auth: import.meta.env.NOTION_TOKEN,
    },
  }),
  schema: pageObjectResponseWithBlocksSchema.extend({
    properties: z.object({
      Name: titlePropertyPageObjectResponseSchema,
      Description: richTextPropertyPageObjectResponseSchema,
      Public: checkboxPropertyPageObjectResponseSchema,
      Slug: richTextPropertyPageObjectResponseSchema,
      Tags: multiSelectPropertyPageObjectResponseSchema,
      Category: selectPropertyPageObjectResponseSchema,
      Date: datePropertyPageObjectResponseSchema,
    }),
  }),
});

export const collections = {
  pages: pagesCollection,
  posts: postsCollection,
};
