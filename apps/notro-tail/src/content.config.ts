import { defineCollection } from "astro:content";
import {
  checkboxPropertyPageObjectResponseSchema,
  datePropertyPageObjectResponseSchema,
  loader,
  multiSelectPropertyPageObjectResponseSchema,
  pageWithMarkdownSchema,
  richTextPropertyPageObjectResponseSchema,
  selectPropertyPageObjectResponseSchema,
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
      // Include entries where Type is unset (backward compat) or explicitly "post"
      filter: {
        and: [
          { property: "Public", checkbox: { equals: true } },
          {
            or: [
              { property: "Type", select: { is_empty: true } },
              { property: "Type", select: { equals: "post" } },
            ],
          },
        ],
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
      Type: selectPropertyPageObjectResponseSchema.optional(),
    }),
  }),
});

const pagesCollection = defineCollection({
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
        and: [
          { property: "Public", checkbox: { equals: true } },
          { property: "Type", select: { equals: "page" } },
        ],
      },
    },
    clientOptions: {
      auth: import.meta.env.NOTION_TOKEN,
    },
  }),
  schema: pageWithMarkdownSchema.extend({
    properties: z.object({
      Name: titlePropertyPageObjectResponseSchema,
      Description: richTextPropertyPageObjectResponseSchema.optional(),
      Public: checkboxPropertyPageObjectResponseSchema,
      Slug: richTextPropertyPageObjectResponseSchema,
      Type: selectPropertyPageObjectResponseSchema,
    }),
  }),
});

export const collections = {
  posts: postsCollection,
  pages: pagesCollection,
};
