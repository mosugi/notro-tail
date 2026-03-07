import { defineCollection } from "astro:content";
import {
  checkboxPropertyPageObjectResponseSchema,
  datePropertyPageObjectResponseSchema,
  loader,
  multiSelectPropertyPageObjectResponseSchema,
  pageWithMarkdownSchema,
  richTextPropertyPageObjectResponseSchema,
  titlePropertyPageObjectResponseSchema,
} from "notro";
import { z } from "zod";

const postsCollection = defineCollection({
  loader: loader({
    queryParameters: {
      data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
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
  schema: pageWithMarkdownSchema.extend({
    properties: z.object({
      Name: titlePropertyPageObjectResponseSchema,
      Description: richTextPropertyPageObjectResponseSchema,
      Public: checkboxPropertyPageObjectResponseSchema,
      Slug: richTextPropertyPageObjectResponseSchema,
      Tags: multiSelectPropertyPageObjectResponseSchema,
      Date: datePropertyPageObjectResponseSchema,
    }),
  }),
});

export const collections = {
  posts: postsCollection,
};
