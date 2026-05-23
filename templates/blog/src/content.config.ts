import { defineCollection } from "astro:content";
import { loader, notroProperties, pageWithMarkdownSchema } from "notro-loader";
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
      Name: notroProperties.title,
      Description: notroProperties.richText,
      Public: notroProperties.checkbox,
      // Require at least one rich_text item so empty slugs are rejected at build time.
      Slug: notroProperties.richText.extend({
        rich_text: notroProperties.richText.shape.rich_text.min(1),
      }),
      Tags: notroProperties.multiSelect,
      Date: notroProperties.date,
    }),
  }),
});

export const collections = {
  posts: postsCollection,
};
